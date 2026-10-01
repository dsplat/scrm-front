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
