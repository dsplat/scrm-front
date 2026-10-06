/// <reference types="@dcloudio/types" />
/**
 * useAssistantStream — H5 小助手流式连接（Node SSE 引擎链路）
 *
 * 传输走 sse.ts 平台适配层（H5 fetch / 小程序 enableChunked），
 * 线协议解析（Vercel AI SDK data stream 行协议）与 Console useAssistantStream 同源：
 *   0: 文本增量   2: 自定义数据(会话元信息/ping)   9: 工具调用   a: 工具结果   3: 错误   d: 流结束
 *   e: 单步完成(finish_step，多步链进度信号；BL-059)
 *
 * 与 Console 的关键差异：H5 无 Cookie 会话，认证走 Authorization: Bearer {user_token}，
 * 且必须显式带 X-Tenant-ID（Node→PHP 回环回调丢失请求域名，靠该头识别租户）。
 *
 * 遵循铁律：空闲 120s 自动断开；任何错误不抛出，转降级提示；支持随时中断。
 */
import { postStream, type StreamHandle } from '../sse'
import { getAIConfig } from '../config'
import { streamHeaders } from '../request'
import { assistantStore } from '../store'
import type { PageContext, StreamCallbacks } from '../types'
import { dispatchDataStreamLine, type StreamLineHandlers } from '../protocol'

/** 流空闲超时（毫秒）：Node 链路有 ping 心跳，120s 为无字节兜底阈值 */
const STREAM_IDLE_TIMEOUT_MS = 120_000

/** 复刻 Console buildContextMessage 的 [页面上下文]/[用户请求] 包装（H5 版：无 scene/附件） */
function buildContextMessage(ctx: PageContext, userIntent: string): string {
  const parts = [`当前页面: ${ctx.route || ''}`, `模块: ${ctx.module || ''}`]

  if (ctx.entity_type) {
    parts.push(`实体: ${ctx.entity_id ? `${ctx.entity_id}#${ctx.entity_type}` : ctx.entity_type}`)
  }
  if (ctx.visible_data_summary) {
    parts.push(`页面数据: ${ctx.visible_data_summary}`)
  }
  if (ctx.form_state && Object.keys(ctx.form_state).length > 0) {
    parts.push(`表单状态: ${JSON.stringify(ctx.form_state)}`)
  }

  return `[页面上下文]\n${parts.join('\n')}\n\n[用户请求]\n${userIntent}`
}

export function useAssistantStream() {
  let handle: StreamHandle | null = null
  let timeoutTimer: ReturnType<typeof setTimeout> | null = null
  let buffer = ''
  let finished = false

  function resetIdleTimer() {
    if (timeoutTimer) clearTimeout(timeoutTimer)
    timeoutTimer = setTimeout(() => handle?.abort(), STREAM_IDLE_TIMEOUT_MS)
  }

  function clearIdleTimer() {
    if (timeoutTimer) {
      clearTimeout(timeoutTimer)
      timeoutTimer = null
    }
  }

  /**
   * 发起一次流式对话，驱动 store 更新。返回 Promise 永远 resolve（不 reject）。
   *
   * @param pageContext 页面上下文（含转派 agent_id / 续接 conversation_id）
   * @param userIntent  用户本轮输入原话
   * @param overrides   覆盖默认 store 回调（页面级 AI 按钮可只捕获文本）
   */
  function send(
    pageContext: PageContext,
    userIntent: string,
    overrides?: Partial<StreamCallbacks>,
  ): Promise<void> {
    if (assistantStore.streaming.value) return Promise.resolve()

    assistantStore.setStreaming(true)
    assistantStore.pushUser(userIntent)
    assistantStore.beginAssistant()
    buffer = ''
    finished = false

    // 默认回调写 store；overrides 可逐项替换
    const cb: StreamCallbacks = {
      onMeta: (meta) => assistantStore.setConversation(meta),
      onText: (text) => assistantStore.appendText(text),
      onToolCall: (calls) => assistantStore.mergeToolCalls(calls),
      onToolResult: (id, result) => assistantStore.updateToolResult(id, result),
      onFormFill: (s) => assistantStore.attachFormFill(s),
      onWorkflow: (w) => assistantStore.attachWorkflow(w),
      onPendingConfirmation: (d) => assistantStore.attachConfirm(d),
      onUserChoice: (d) => assistantStore.attachChoice(d),
      // 多步链单步完成：只记录最小状态（既有展示位可挂接，无消费者时无 UI 变化；usage 不参与授权/计费）
      onStepFinish: (info) => assistantStore.setLastStepFinish(info),
      onDone: () => assistantStore.endAssistant(),
      onError: (message) => assistantStore.pushError(message),
      ...overrides,
    }

    const messages = [
      ...assistantStore
        .historyForSend()
        .slice(0, -1)
        .map((h) => ({ role: h.role, content: h.content })),
      { role: 'user', content: buildContextMessage(pageContext, userIntent) },
    ]

    const body: Record<string, any> = { messages }
    // agent_id / conversation_id 都需回退到上一轮流式 meta 里的值（store 已接），
    // 否则页面未显式传 agent_id 时，转派后的多轮会退化成无 Agent 归属的新会话
    const agentId = Number(pageContext.agent_id ?? assistantStore.agentId.value)
    if (Number.isFinite(agentId) && agentId > 0) body.agent_id = agentId
    const conversationId = Number(
      pageContext.conversation_id ?? assistantStore.conversationId.value,
    )
    if (Number.isFinite(conversationId) && conversationId > 0) body.conversation_id = conversationId

    resetIdleTimer()

    return new Promise<void>((resolve) => {
      const finish = () => {
        clearIdleTimer()
        assistantStore.setStreaming(false)
        handle = null
        resolve()
      }

      const wrapped: StreamCallbacks = {
        ...cb,
        onDone: (meta) => {
          if (finished) return
          finished = true
          cb.onDone(meta)
          finish()
        },
        onError: (message, action) => {
          cb.onError(message, action)
          finish()
        },
      }

      // 回调异常只报一次：UI 侧一个 bug 不该既中断传输、又被转写成「连接失败」而丢真因
      let callbackErrorReported = false
      const handlers: StreamLineHandlers = {
        onText: (text) => wrapped.onText(text),
        onMeta: (meta) => wrapped.onMeta?.(meta),
        onToolCall: (call) => wrapped.onToolCall([call]),
        onToolResult: (id, result) => wrapped.onToolResult?.(id, result),
        onFormFill: (payload) => wrapped.onFormFill?.(payload),
        onWorkflow: (payload) => wrapped.onWorkflow?.(payload),
        onPendingConfirmation: (payload) => wrapped.onPendingConfirmation?.(payload),
        onUserChoice: (payload) => wrapped.onUserChoice?.(payload),
        onStepFinish: (info) => wrapped.onStepFinish?.(info),
        onError: (message) => wrapped.onError(message, null),
        onDone: (meta) => wrapped.onDone(meta),
        onCallbackError: (error, name) => {
          console.error(`[h5-ai] ${name} 回调异常`, error)
          if (callbackErrorReported) return
          callbackErrorReported = true
          // 不拼入底层异常原文（面向最终用户），仅给可理解的降级提示；流不中断
          assistantStore.pushError('界面渲染异常，回答可能不完整，请重新提问。')
        },
      }

      handle = postStream({
        url: getAIConfig().streamEndpoint,
        headers: streamHeaders(),
        body: JSON.stringify(body),
        onData: (chunk) => {
          resetIdleTimer()
          buffer += chunk
          let idx: number
          while ((idx = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, idx).trim()
            buffer = buffer.slice(idx + 1)
            if (line && dispatchDataStreamLine(line, handlers)) return
          }
        },
        onDone: () => {
          if (buffer.trim()) dispatchDataStreamLine(buffer.trim(), handlers)
          wrapped.onDone(null)
        },
        onError: (err) => wrapped.onError(err.message, null),
      })
    })
  }

  /** 中断当前流 */
  function abort() {
    handle?.abort()
  }

  return { send, abort }
}
