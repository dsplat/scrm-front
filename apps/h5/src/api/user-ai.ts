/**
 * User AI 对外问答（Fork A：H5 C 端 AI 收敛到框架 UserAi 基座）
 *
 * 走 POST /api/v1/user-ai/ask（公开路由）：EnsureExternalActor 按 tenant_slug 解析租户、
 * 租户级 user-ai 模块门控、设 ActorContext（当前 anonymous）；throttle:user-ai 硬限频次；
 * 能力面锁死在 tool_surface 白名单（现仅 knowledge_search → RAG 知识问答）。
 *
 * 说明：本同步版为单轮问答（UserAiController 未透传 history）；页面侧本地保留 messages
 * 仅作展示。个人信息类工具（订单/券/错题讲解）属外部 agentic 工具面（BL-030e 后续刀），
 * 当前 anonymous + RAG-only 链路不触达。
 */
import { request } from '../utils/request'
import { parseDataStreamLine, type DataStreamEvent } from '@scrm/h5-ai'
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

/** 单个工具调用的呈现状态（`max_tool_calls` > 1 时同一条回复可并行多个） */
export interface LocalToolCallState {
  id: string
  name: string
  status: 'running' | 'done' | 'error'
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
 * 提问一次（匿名可用；同步整包返回，无流式）。
 *
 * @param question 用户本轮问题
 * @param tenantSlugHint 可选显式 slug；缺省从租户 bootstrap 缓存解析
 */
export async function askUserAi(question: string, tenantSlugHint?: string): Promise<UserAiAnswer> {
  const slug = tenantSlugHint || useTenantStore().state.tenant?.slug || ''
  const data = await request<UserAiAnswer>({
    url: '/user-ai/ask',
    method: 'POST',
    auth: 'optional',
    data: { tenant_slug: slug, question },
  })
  return {
    allowed: !!data?.allowed,
    answer: data?.answer ?? '',
    sources: Array.isArray(data?.sources) ? data.sources : [],
    denied: data?.denied ?? null,
  }
}

export interface StreamUserAiOptions {
  /** 前端本地历史（v1 C 端不落服务端会话，多轮靠上行 messages） */
  history?: LocalChatMessage[]
  /** 中止信号（切换新对话 / 组件卸载时中断流） */
  signal?: AbortSignal
  /** LLM 触发工具调用（knowledge_search 检索中）时的回调，可显示「正在检索…」（次参为 toolCallId，供多工具分项记账） */
  onToolCall?: (toolName: string, toolCallId: string) => void
  onToolResult?: (id: string, result: unknown) => void
  /**
   * `a:` 帧四类控制消息（`form_fill` / `workflow` / `pending_confirmation` / `user_choice`）
   * 的统一派发口。C 端**今日不消费**（边界与前提见下方 `streamUserAi` 的「消息类型边界」），通道保留待接。
   */
  onControl?: (event: DataStreamEvent) => void
}

/**
 * 流式提问：H5 走浏览器 fetch 打 Node `/ai-stream/chat`（scope=user）逐字回调 onDelta，
 * 非 H5（小程序 uni.request 无法流式）自动回退同步 `askUserAi` 一次性回填。
 * 拓扑与 operator 一致（Node 跑 SSE、PHP 权威鉴权），
 * 但护栏锁死 C 端面：匿名可用、租户由 X-Tenant-ID 头识别、工具面仅 knowledge_search。
 *
 * 行协议（Vercel AI data stream）：`0:` 文本增量、`9:` 工具调用、`3:` 错误、`d:` 结束。
 * 仅 H5 用（小程序 uni.request 无法流式，mp 发布路径仍走同步 askUserAi）。
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
 * 打包边界（S10b）：函数本体按平台条件编译裁剪，浏览器全局（fetch / ReadableStream /
 * TextDecoder / URL）只存在于 `#ifdef H5` 区域内，mp 产物不含这些实现，调用点无需再分支。
 */
export async function streamUserAi(
  question: string,
  onDelta: (chunk: string) => void,
  opts: StreamUserAiOptions = {},
): Promise<void> {
  let streamed = false
  // #ifdef H5
  await streamUserAiH5(question, onDelta, opts)
  streamed = true
  // #endif
  // #ifndef H5
  if (!streamed) {
    // 同步整包（无逐字）：allowed=false 且无答案时抛已整理原因，交由页面统一呈现
    const res = await askUserAi(question)
    if (!res.allowed && !res.answer) {
      throw new UserAiStreamError(res.denied || '抱歉，暂时无法回答这个问题。')
    }
    onDelta(res.answer)
  }
  // #endif
}

// #ifdef H5
/** 流式问答地址：把 API base（/api/v1 或注入的绝对 API 域）的 path 换成 /ai-stream/chat。 */
function streamEndpoint(): string {
  const base = import.meta.env.VITE_API_BASE || '/api/v1'
  try {
    // 浏览器必有 window；无 window（测试注入 / SSR）退回相对 origin，结果同为绝对地址
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
    const u = new URL(base, origin)
    u.pathname = '/ai-stream/chat'
    u.search = ''
    return u.toString()
  } catch {
    return '/ai-stream/chat'
  }
}

/** 仅 H5 产物：依赖 fetch / TextDecoder / window 等浏览器全局，禁止进小程序包。 */
async function streamUserAiH5(
  question: string,
  onDelta: (chunk: string) => void,
  opts: StreamUserAiOptions,
): Promise<void> {
  const tenant = useTenantStore().state.tenant

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (tenant?.tenant_id) headers['X-Tenant-ID'] = String(tenant.tenant_id)
  // 有 user_token 则带（C 端匿名也可用；未来登录态升级不改链路）
  const token = uni.getStorageSync('user_token')
  if (token) headers.Authorization = `Bearer ${token}`

  // 多轮靠前端历史：过滤出 user/assistant 纯文本（跳过错误/流式中的占位），末条为本轮问题
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = []
  for (const m of opts.history ?? []) {
    if ((m.role === 'user' || m.role === 'assistant') && m.content && !m.isError && !m.streaming) {
      messages.push({ role: m.role, content: m.content })
    }
  }
  messages.push({ role: 'user', content: question })

  const response = await fetch(streamEndpoint(), {
    method: 'POST',
    headers,
    body: JSON.stringify({ scope: 'user', messages }),
    signal: opts.signal,
  })

  if (!response.ok || !response.body) {
    const err = await response.json().catch(() => null)
    throw new UserAiStreamError(
      (err as { message?: string } | null)?.message || `请求失败 (HTTP ${response.status})`,
    )
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let errMsg = ''

  const dispatch = (line: string) => {
    const event = parseDataStreamLine(line)
    if (event.type === 'text') onDelta(event.value)
    else if (event.type === 'tool_call')
      opts.onToolCall?.(event.value.name || event.value.id || '工具', String(event.value.id ?? ''))
    else if (event.type === 'tool_result') opts.onToolResult?.(event.value.id, event.value.result)
    else if (event.type === 'error') errMsg = event.value
    else if (event.type !== 'ignore') opts.onControl?.(event)
  }
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) dispatch(line)
  }
  buffer += decoder.decode()
  if (buffer.trim()) dispatch(buffer.trim())

  // 服务端 `3:` 帧文案属「已整理原因」，透传给页面直呈
  if (errMsg) throw new UserAiStreamError(errMsg || 'AI 响应出错')
}
// #endif
