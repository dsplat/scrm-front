/**
 * User AI 对外问答（Fork A：H5 C 端 AI 收敛到框架 UserAi 基座）
 *
 * 主链路：POST/流式 `/ai-stream/chat`（scope=user），两端统一（H5 fetch、小程序分块接收）。
 * 服务端流首帧 `2:` 下发 meta.conversation_id 时会话即已落库：下一轮回传该 id，
 * 由服务端以自身历史为唯一上下文；拿不到 id 时才回退到前端历史上行（旧行为）。
 * 需要有效 User bearer token（`ExternalTenantAccess` 无匿名兜底）。
 *
 * 兜底链路：`POST /api/v1/user-ai/ask`（公开路由，单轮整包）——仅在拿不到可用流式地址时使用。
 * 能力面锁死在 tool_surface 白名单（现仅 knowledge_search → RAG 知识问答）；个人信息类工具
 * （订单/券/错题讲解）属外部 agentic 工具面（BL-030e 后续刀），当前链路不触达。
 */
import { request, type ApiError } from '../utils/request'
import { buildUserAiStreamBody } from './user-ai-stream-body'
import {
  getAIConfig,
  getTenantId,
  getToken,
  parseDataStreamLine,
  postStream,
  type DataStreamEvent,
} from '@scrm/h5-ai'
import { useTenantStore } from '../store/tenant'

export interface UserAiSource {
  content: string
  title?: string
}

export interface UserAiAnswer {
  allowed: boolean
  answer: string
  sources: UserAiSource[]
  denied: string | null
}

export interface UserAiToolLabels {
  running: string
  done: string
  error: string
}

export interface UserAiCapabilities {
  title: string
  welcome: string
  quick_questions: string[]
  disclaimer: string
  input_max_chars: number
  history_limit: number
  streaming: boolean
  requires_auth: boolean
  tools: Array<UserAiToolLabels & { name: string }>
}

export const DEFAULT_USER_AI_CAPABILITIES: UserAiCapabilities = {
  title: '智能客服',
  welcome: '你好，我可以帮你解答课程、活动与常见问题。',
  quick_questions: ['如何报名课程？', '如何查看我的订单？', '如何联系工作人员？'],
  disclaimer: '内容由 AI 生成，仅供参考。',
  input_max_chars: 2000,
  history_limit: 12,
  streaming: true,
  requires_auth: true,
  tools: [
    {
      name: 'knowledge_search',
      running: '正在查阅相关资料',
      done: '已查阅相关资料',
      error: '资料查阅失败',
    },
  ],
}

export async function getUserAiCapabilities(tenantSlugHint?: string): Promise<UserAiCapabilities> {
  const slug = tenantSlugHint || useTenantStore().state.tenant?.slug || ''
  const data = await request<Partial<UserAiCapabilities>>({
    url: '/user-ai/capabilities',
    method: 'GET',
    auth: 'required',
    data: { tenant_slug: slug },
  })
  return {
    ...DEFAULT_USER_AI_CAPABILITIES,
    ...data,
    quick_questions: Array.isArray(data.quick_questions)
      ? data.quick_questions.filter((item) => typeof item === 'string')
      : DEFAULT_USER_AI_CAPABILITIES.quick_questions,
    tools: Array.isArray(data.tools) ? data.tools : DEFAULT_USER_AI_CAPABILITIES.tools,
  }
}

/** 单个工具调用的呈现状态（`max_tool_calls` > 1 时同一条回复可并行多个） */
export interface LocalToolCallState {
  id: string
  name: string
  status: 'running' | 'done' | 'error'
  labels?: UserAiToolLabels
}

/** 页面内联气泡所需的最小消息形态（与后端 Message/Conversation 模型无关） */
export interface LocalChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
  isError?: boolean
  /**
   * `tools` 的聚合投影（任一 running 则 running，否则任一 error 则 error，否则 done），
   * 供既有单行模板直接消费；逐工具状态见 `tools`。
   */
  toolStatus?: 'running' | 'done' | 'error'
  toolName?: string
  /** 按 toolCallId 记录本轮触发的每个工具（多工具时逐个呈现，不互相覆盖） */
  tools?: LocalToolCallState[]
  sources?: UserAiSource[]
  requestContent?: string
}

/**
 * 本层主动抛出的「已整理原因」错误：服务端 `3:` 帧文案 / 后端 message 字段 / HTTP 状态码。
 *
 * 页面只对带该标记的错误直呈文案；浏览器自身的 fetch 异常（如 `Failed to fetch`）
 * 不标记，必须转成可理解兜底文案，不得把底层原文交给最终用户。
 */
export class UserAiStreamError extends Error {
  readonly curated = true

  constructor(message: string) {
    super(message)
    this.name = 'UserAiStreamError'
  }
}

/**
 * 提问一次（需有效用户及租户成员身份；同步整包返回）。
 *
 * @param question 用户本轮问题
 * @param tenantSlugHint 可选显式 slug；缺省从租户 bootstrap 缓存解析
 */
export async function askUserAi(question: string, tenantSlugHint?: string): Promise<UserAiAnswer> {
  const slug = tenantSlugHint || useTenantStore().state.tenant?.slug || ''
  let data: UserAiAnswer
  try {
    data = await request<UserAiAnswer>({
      url: '/user-ai/ask',
      method: 'POST',
      auth: 'required',
      data: { tenant_slug: slug, question },
    })
  } catch (error) {
    const apiError = error as ApiError
    // Only authentication/authorization failures are safe to present directly.
    // Transport failures and server errors keep the page's network fallback.
    if (apiError?.statusCode === 401 || apiError?.statusCode === 403) {
      throw new UserAiStreamError(
        apiError.message ||
          (apiError.statusCode === 401 ? '请先登录后使用智能问答' : '无权访问该租户的智能问答服务'),
      )
    }
    throw error
  }
  return {
    allowed: !!data?.allowed,
    answer: data?.answer ?? '',
    sources: Array.isArray(data?.sources) ? data.sources : [],
    denied: data?.denied ?? null,
  }
}

export interface StreamUserAiOptions {
  /** 前端本地历史（仅在拿不到服务端会话 id 时上行，兼容旧后端/旧链路） */
  history?: LocalChatMessage[]
  historyLimit?: number
  /**
   * 服务端会话 id：流首帧 `2:` 的 meta.conversation_id。
   * 传入时只上行本轮问题，服务端以自己的历史为唯一上下文。
   */
  conversationId?: number | null
  /** 调用端标识（H5 / 小程序），默认按条件编译取当前端 */
  source?: 'h5' | 'miniapp'
  /** 流首帧 `2:` meta 回调（conversation_id / agent_id） */
  onMeta?: (meta: { conversation_id?: number; agent_id?: number }) => void
  /** 中止信号（切换新对话 / 组件卸载时中断流） */
  signal?: AbortSignal
  /** LLM 触发工具调用（knowledge_search 检索中）时的回调，可显示「正在检索…」（次参为 toolCallId，供多工具分项记账） */
  onToolCall?: (toolName: string, toolCallId: string) => void
  onToolResult?: (id: string, result: unknown) => void
  onSources?: (id: string, sources: UserAiSource[]) => void
  /**
   * `a:` 帧四类控制消息（`form_fill` / `workflow` / `pending_confirmation` / `user_choice`）
   * 的统一派发口。C 端**今日不消费**（边界与前提见下方 `streamUserAi` 的「消息类型边界」），通道保留待接。
   */
  onControl?: (event: DataStreamEvent) => void
}

/**
 * 流式提问：打 Node `/ai-stream/chat`（scope=user）逐字回调 onDelta。
 *
 * 两端同一条链路，传输差异下沉到 `@scrm/h5-ai` 的 `postStream`：
 * H5 用 fetch + ReadableStream，小程序用 `uni.request({ enableChunked })` + onChunkReceived
 * 收分块（基础库 2.20.2+）。本文件只负责组包、行协议分派与错误整理。
 * 仅在拿不到可用流式地址（小程序未注入绝对 API 基址）时，回落一次性 `askUserAi`。
 *
 * 拓扑与 operator 一致（Node 跑 SSE、PHP 权威鉴权），
 * 但护栏锁死 C 端面：只认 User bearer（无匿名兜底）、租户由 X-Tenant-ID 头识别、
 * 工具面仅 knowledge_search。
 *
 * 行协议（Vercel AI data stream）：`0:` 文本增量、`9:` 工具调用、`3:` 错误、`d:` 结束。
 *
 * 消息类型边界（R-30，2026-10-03 拍板为「当前产品边界」，不是缺陷豁免）：
 * - C 端消费：`0:` 文本、`9:` 工具调用、`a:` 工具结果（无 `result.action`）、`3:` 错误、`d:` 结束、EOF 冲刷。
 * - C 端不消费：`a:` 四类控制消息（form_fill / workflow / pending_confirmation / user_choice）。
 *   `dispatch()` 把它们统一派给 `opts.onControl`，而 `pages/self-service` 未注册该回调 → 注入后页面无变化。
 * - 由 operator 侧承接：上述四类消息在后台助手 UI 消费，见
 *   `packages/h5-ai/src/composables/useAssistantStream.ts`（onFormFill / onWorkflow /
 *   onPendingConfirmation / onUserChoice）。
 * - 边界成立的前提（两条都有取证，任一失效则本注释不作关闭依据）：
 *   ① 产生控制消息的工具（suggest_form_fill / ask_user_choice / workflow_* / form_*）全为
 *      `audience=operator`，user 身份不可见；4 个 user 可见工具均为 risk=L1，而确认卡判据是
 *      `risk === L2`（`Dto/Tool.php::requiresConfirmation()`），故 user 面恒不发 `pending_confirmation`。
 *   ② C 端工具面 = `config('user-ai.tool_surface.allowed')` fail-closed 白名单（现仅
 *      `knowledge_search`），`UserAiStreamResolveController` 只下发该集合给 Node，form_fill / workflow
 *      的 emit 发生在 operator 侧 AssistantController，不在 C 端链路上。
 * - 硬性要求：一旦上线任何动作型 / 需确认的 user 工具（退款、下单、提交表单等），或发现现有路径
 *   向 `scope=user` 发出上述四类消息，必须在 `pages/self-service` 接线 `onControl` 渲染对应交互。
 *   届时这条从「已确认边界」恢复为缺陷，不得靠本注释关闭。
 *
 * 打包边界（S10b）：浏览器全局（fetch / ReadableStream / TextDecoder）只存在于
 * `packages/h5-ai/src/sse.ts` 的 `#ifdef H5` 区域内，mp 产物走分块请求 + 手写增量
 * UTF-8 解码，本文件不再按平台分支。
 */
export async function streamUserAi(
  question: string,
  onDelta: (chunk: string) => void,
  opts: StreamUserAiOptions = {},
): Promise<void> {
  const url = streamEndpoint()
  if (!url) {
    // 无可用流式地址（小程序未注入绝对 API 基址）：回落一次性整包，至少不空白
    const res = await askUserAi(question)
    if (!res.allowed && !res.answer) {
      throw new UserAiStreamError(res.denied || '抱歉，暂时无法回答这个问题。')
    }
    onDelta(res.answer)
    if (res.sources.length) opts.onSources?.('', res.sources)
    return
  }
  await streamUserAiViaEngine(url, question, onDelta, opts)
}

/**
 * 流式地址：取宿主在 main.ts 经 `configureH5AI({ streamEndpoint })` 注入的值。
 *
 * - H5：与后端同源，相对路径 `/ai-stream/chat` 即可（浏览器自动补 origin）。
 * - 小程序：`wx.request` 不认同域相对路径，必须是构建期由 VITE_API_BASE 派生的绝对地址；
 *   未注入绝对地址时返回空串，由调用方回落同步整包（不发出必然失败的请求）。
 */
function streamEndpoint(): string {
  const configured = getAIConfig().streamEndpoint || ''
  // #ifdef H5
  return configured
  // #endif
  // #ifndef H5
  return /^https?:\/\//i.test(configured) ? configured : ''
  // #endif
}

/** 与浏览器 fetch abort 同名的错误，页面按 `name === 'AbortError'` 静默处理 */
function abortError(): Error {
  const e = new Error('AI 响应已中断')
  e.name = 'AbortError'
  return e
}

/** 调用端默认标识：H5 为 h5，小程序构建为 miniapp（调用方也可显式传 opts.source） */
function defaultStreamSource(): 'h5' | 'miniapp' {
  // #ifdef H5
  return 'h5'
  // #endif
  // #ifndef H5
  return 'miniapp'
  // #endif
}

/**
 * 经 Node 引擎取流：传输层 `postStream` 已按平台条件编译（H5 fetch / 小程序分块），
 * 本函数只管帧分派与错误整理。
 */
async function streamUserAiViaEngine(
  url: string,
  question: string,
  onDelta: (chunk: string) => void,
  opts: StreamUserAiOptions,
): Promise<void> {
  const tenant = useTenantStore().state.tenant

  const headers: Record<string, string> = {}
  // Node 引擎回环回调 PHP 时域名丢失，必须显式带租户；store 未 hydration 时用 bootstrap 缓存兜底
  const tenantId = tenant?.tenant_id ? String(tenant.tenant_id) : getTenantId()
  if (tenantId) headers['X-Tenant-ID'] = tenantId
  // 有 user_token 则带（C 端必须携带有效用户 token）
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let buffer = ''
  let errMsg = ''

  const dispatch = (line: string) => {
    const event = parseDataStreamLine(line)
    if (event.type === 'text') onDelta(event.value)
    else if (event.type === 'meta') {
      const meta: { conversation_id?: number; agent_id?: number } = {}
      const metaConversationId = Number(event.value.conversation_id)
      const metaAgentId = Number(event.value.agent_id)
      if (Number.isFinite(metaConversationId) && metaConversationId > 0) {
        meta.conversation_id = metaConversationId
      }
      if (Number.isFinite(metaAgentId) && metaAgentId > 0) {
        meta.agent_id = metaAgentId
      }
      opts.onMeta?.(meta)
    } else if (event.type === 'tool_call')
      opts.onToolCall?.(event.value.name || event.value.id || '工具', String(event.value.id ?? ''))
    else if (event.type === 'tool_result') opts.onToolResult?.(event.value.id, event.value.result)
    else if (event.type === 'sources') opts.onSources?.(event.value.id, event.value.sources)
    else if (event.type === 'error') errMsg = event.value
    else if (event.type !== 'ignore') opts.onControl?.(event)
  }

  const drain = (text: string, flush = false) => {
    buffer += text
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) dispatch(line)
    if (flush && buffer.trim()) {
      dispatch(buffer.trim())
      buffer = ''
    }
  }

  await new Promise<void>((resolve, reject) => {
    const handle = postStream({
      url,
      headers,
      body: JSON.stringify(
        buildUserAiStreamBody({
          question,
          history: opts.history,
          historyLimit: opts.historyLimit,
          conversationId: opts.conversationId,
          source: opts.source ?? defaultStreamSource(),
        }),
      ),
      onData: (chunk) => drain(chunk),
      onDone: () => {
        drain('', true)
        resolve()
      },
      // 带 statusCode 的属服务端已整理原因，直呈；纯网络失败交给页面兜底文案
      onError: (err) => {
        reject(err.statusCode ? new UserAiStreamError(err.message) : new Error(err.message))
      },
    })

    const signal = opts.signal
    if (!signal || typeof signal.addEventListener !== 'function') return
    const onAbort = () => {
      handle.abort()
      reject(abortError())
    }
    if (signal.aborted) onAbort()
    else signal.addEventListener('abort', onAbort, { once: true })
  })

  // 服务端 `3:` 帧文案属「已整理原因」，透传给页面直呈
  if (errMsg) throw new UserAiStreamError(errMsg)
}
