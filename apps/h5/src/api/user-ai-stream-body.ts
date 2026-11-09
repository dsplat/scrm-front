/**
 * User AI 流式请求体组装（纯函数，无 uni / Vue 依赖，便于单测）
 *
 * 两条链路共用同一份组包规则：
 * - 有服务端会话 id：只上行本轮问题，服务端历史是唯一上下文；
 * - 无会话 id：保持旧版前端历史上行，兼容不支持服务端会话的旧后端。
 */

/** 组包所需的最小历史消息形态（与 LocalChatMessage 的结构子集兼容） */
export interface UserAiHistoryMessage {
  role: 'user' | 'assistant'
  content: string
  isError?: boolean
  streaming?: boolean
  requestContent?: string
}

export type UserAiSourcePlatform = 'h5' | 'miniapp'

export interface UserAiStreamBody {
  scope: 'user'
  source: UserAiSourcePlatform
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  conversation_id?: number
}

export interface BuildUserAiStreamBodyInput {
  question: string
  history?: UserAiHistoryMessage[]
  historyLimit?: number
  conversationId?: number | null
  source: UserAiSourcePlatform
}

/** 上行历史条数上限（不含本轮问题） */
const HISTORY_LIMIT = 12

/** 归一化服务端会话 id：只接受正整数 */
export function normalizeUserAiConversationId(value: number | null | undefined): number | null {
  const id = Number(value)
  return Number.isFinite(id) && id > 0 ? id : null
}

/**
 * 组包（旧链路）：无服务端会话时多轮靠前端历史上行，过滤出 user/assistant 纯文本，
 * 跳过错误/流式中的占位，末条为本轮问题。
 *
 * 历史上限 12 条（6 轮）与后端 `user-ai.ask.max_history_turns` 默认值同口径：
 * 服务端流式入口只校验 `max:40`，不做过期裁剪，不设上限会让长会话每轮都带上全部旧内容。
 */
export function buildMessages(
  question: string,
  history: UserAiHistoryMessage[] = [],
  historyLimit = HISTORY_LIMIT,
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = []
  for (const m of history) {
    if ((m.role === 'user' || m.role === 'assistant') && m.content && !m.isError && !m.streaming) {
      messages.push({ role: m.role, content: m.requestContent ?? m.content })
    }
  }
  messages.push({ role: 'user', content: question })
  return messages.slice(-Math.max(0, historyLimit) - 1)
}

/**
 * 生成 `/ai-stream/chat` 请求体。
 *
 * 服务端会话存在时，它的历史是唯一上下文；只带本轮这一条，避免双份历史。
 */
export function buildUserAiStreamBody(input: BuildUserAiStreamBodyInput): UserAiStreamBody {
  const conversationId = normalizeUserAiConversationId(input.conversationId)
  const body: UserAiStreamBody = {
    scope: 'user',
    source: input.source,
    messages: conversationId
      ? [{ role: 'user', content: input.question }]
      : buildMessages(input.question, input.history, input.historyLimit),
  }
  if (conversationId) body.conversation_id = conversationId
  return body
}
