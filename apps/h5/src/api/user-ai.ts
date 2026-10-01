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

/** 页面内联气泡所需的最小消息形态（与后端 Message/Conversation 模型无关） */
export interface LocalChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
  isError?: boolean
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

/**
 * 流式问答地址：把 API base（/api/v1 或注入的绝对 API 域）的 path 换成 /ai-stream/chat。
 * 与 operator console 同一 Node 引擎入口（nginx 反代 /ai-stream），scope=user 分流到 C 端护栏。
 */
function streamEndpoint(): string {
  const base = import.meta.env.VITE_API_BASE || '/api/v1'
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
    const u = new URL(base, origin)
    u.pathname = '/ai-stream/chat'
    u.search = ''
    return u.toString()
  } catch {
    return '/ai-stream/chat'
  }
}

export interface StreamUserAiOptions {
  /** 前端本地历史（v1 C 端不落服务端会话，多轮靠上行 messages） */
  history?: LocalChatMessage[]
  /** 中止信号（切换新对话 / 组件卸载时中断流） */
  signal?: AbortSignal
  /** LLM 触发工具调用（knowledge_search 检索中）时的回调，可显示「正在检索…」 */
  onToolCall?: () => void
}

/**
 * 流式提问（BL-030e 外部真·流式）：浏览器 fetch 打 Node `/ai-stream/chat`（scope=user），
 * 逐字回调 onDelta 实现打字机。拓扑与 operator 一致（Node 跑 SSE、PHP 权威鉴权），
 * 但护栏锁死 C 端面：匿名可用、租户由 X-Tenant-ID 头识别、工具面仅 knowledge_search。
 *
 * 行协议（Vercel AI data stream）：`0:` 文本增量、`9:` 工具调用、`3:` 错误、`d:` 结束。
 * 仅 H5 用（小程序 uni.request 无法流式，mp 发布路径仍走同步 askUserAi）。
 */
export async function streamUserAi(
  question: string,
  onDelta: (chunk: string) => void,
  opts: StreamUserAiOptions = {},
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
    throw new Error(
      (err as { message?: string } | null)?.message || `请求失败 (HTTP ${response.status})`,
    )
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let errMsg = ''

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const sep = line.indexOf(':')
      if (sep <= 0) continue
      const type = line.slice(0, sep)
      const payload = line.slice(sep + 1)

      if (type === '0') {
        try {
          onDelta(JSON.parse(payload) as string)
        } catch {
          /* 半包容错：跨帧未完整的 JSON 行跳过 */
        }
      } else if (type === '9') {
        opts.onToolCall?.()
      } else if (type === '3') {
        try {
          errMsg = JSON.parse(payload) as string
        } catch {
          errMsg = payload
        }
      }
    }
  }

  if (errMsg) throw new Error(errMsg || 'AI 响应出错')
}
