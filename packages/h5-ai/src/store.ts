/// <reference types="@dcloudio/types" />
/**
 * AI 助手状态存储（Vue 3 reactive，uni-app 兼容，不依赖 Pinia）
 *
 * 镜像 Console stores/assistant.ts 的核心状态：消息列表、流式标志、会话续接 id、
 * 可用性、本地持久化（按租户维度隔离，切换租户不串数据）。
 * 遵循「AI 可选性」铁律：默认关闭/不可用，AI 故障不影响业务。
 */
import { reactive, computed, readonly } from 'vue'
import { getTenantId } from './config'
import type {
  ChatMessage,
  ConversationMeta,
  HistoryTurn,
  ToolCall,
  FormFillSuggestion,
  WorkflowSuggestion,
  ActionConfirmData,
  ActionConfirmStatus,
  UserChoiceData,
} from './types'

let msgSeq = 0
function nextId(): string {
  return `h5msg_${Date.now()}_${++msgSeq}`
}

/** 租户维度持久化 key（无租户回退基础 key） */
function scopedKey(base: string): string {
  const tid = getTenantId()
  return tid ? `${base}_${tid}` : base
}

const PERSIST_CONVERSATION = 'h5_ai_conversation'
const PERSIST_MESSAGES = 'h5_ai_messages'
const MESSAGES_PERSIST_LIMIT = 50

interface StoreState {
  messages: ChatMessage[]
  streaming: boolean
  conversationId: number | null
  agentId: number | null
  availabilityLoaded: boolean
  available: boolean
  /** 当前流式中的助手消息 id（null 表示无） */
  currentAssistantId: string | null
}

/** 只恢复文本轮次（卡片/确认态不跨刷新恢复） */
function loadPersistedMessages(): ChatMessage[] {
  try {
    const raw = uni.getStorageSync(scopedKey(PERSIST_MESSAGES)) as string
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (m: any) =>
          m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant'),
      )
      .map((m: any) => ({
        id: String(m.id ?? nextId()),
        role: m.role,
        content: m.content,
        timestamp: Number(m.timestamp) || Date.now(),
      }))
  } catch {
    return []
  }
}

function loadPersistedConversation(): number | null {
  try {
    const raw = uni.getStorageSync(scopedKey(PERSIST_CONVERSATION)) as string
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return typeof parsed?.id === 'number' ? parsed.id : null
  } catch {
    return null
  }
}

const state = reactive<StoreState>({
  messages: loadPersistedMessages(),
  streaming: false,
  conversationId: loadPersistedConversation(),
  agentId: null,
  availabilityLoaded: false,
  available: false,
  currentAssistantId: null,
})

function persistMessages(): void {
  try {
    const trimmed = state.messages.slice(-MESSAGES_PERSIST_LIMIT).map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
    }))
    uni.setStorageSync(scopedKey(PERSIST_MESSAGES), JSON.stringify(trimmed))
  } catch {
    /* 存储失败不影响会话（内存态仍在） */
  }
}

function persistConversation(): void {
  try {
    if (state.conversationId) {
      uni.setStorageSync(
        scopedKey(PERSIST_CONVERSATION),
        JSON.stringify({ id: state.conversationId }),
      )
    }
  } catch {
    /* 忽略 */
  }
}

function findMessage(id: string | null): ChatMessage | undefined {
  if (!id) return undefined
  return state.messages.find((m) => m.id === id)
}

/** 追加一条用户消息 */
function pushUser(content: string): ChatMessage {
  const msg: ChatMessage = { id: nextId(), role: 'user', content, timestamp: Date.now() }
  state.messages.push(msg)
  persistMessages()
  return msg
}

/** 开启一条流式助手消息（返回其 id，供流回调累积） */
function beginAssistant(): string {
  const msg: ChatMessage = {
    id: nextId(),
    role: 'assistant',
    content: '',
    streaming: true,
    timestamp: Date.now(),
  }
  state.messages.push(msg)
  state.currentAssistantId = msg.id
  return msg.id
}

function withCurrent(fn: (m: ChatMessage) => void): void {
  const m = findMessage(state.currentAssistantId)
  if (m) fn(m)
}

/** 累积文本增量 */
function appendText(text: string): void {
  withCurrent((m) => {
    m.content += text
  })
}

/** 合并/回填工具调用（9: 帧新增 running，a: 帧按 id 更新状态） */
function mergeToolCalls(calls: ToolCall[]): void {
  withCurrent((m) => {
    if (!m.toolCalls) m.toolCalls = []
    for (const c of calls) {
      const exist = m.toolCalls.find((t) => t.id && t.id === c.id)
      if (exist) Object.assign(exist, c)
      else m.toolCalls.push({ ...c })
    }
  })
}

function updateToolResult(toolCallId: string, result: any): void {
  withCurrent((m) => {
    const t = m.toolCalls?.find((x) => x.id === toolCallId)
    if (t) {
      t.result = result
      t.status = result && result.error ? 'error' : 'done'
    }
  })
}

function attachFormFill(s: FormFillSuggestion): void {
  withCurrent((m) => {
    m.formFill = s
  })
}
function attachWorkflow(w: WorkflowSuggestion): void {
  withCurrent((m) => {
    m.workflow = w
  })
}
function attachConfirm(d: ActionConfirmData): void {
  withCurrent((m) => {
    m.actionConfirm = d
    m.confirmStatus = 'pending'
  })
}
function attachChoice(d: UserChoiceData): void {
  withCurrent((m) => {
    m.userChoice = d
  })
}
function setConfirmStatus(status: ActionConfirmStatus, feedback?: string): void {
  withCurrent((m) => {
    m.confirmStatus = status
    if (feedback !== undefined) m.confirmFeedback = feedback
  })
}
function answerChoice(options: string[]): void {
  withCurrent((m) => {
    m.userChoiceAnswer = options
  })
}

/** 收尾当前助手消息 */
function endAssistant(): void {
  withCurrent((m) => {
    m.streaming = false
  })
  state.currentAssistantId = null
  persistMessages()
}

/** 追加一条错误消息（不影响历史文本持久化的正常轮次之外的卡片态） */
function pushError(message: string, action?: { label: string; route: string } | null): void {
  const msg: ChatMessage = {
    id: nextId(),
    role: 'assistant',
    content: message,
    isError: true,
    action: action ?? null,
    streaming: false,
    timestamp: Date.now(),
  }
  state.messages.push(msg)
  state.currentAssistantId = null
  persistMessages()
}

/** 会话元信息（2: data 帧下发） */
function setConversation(meta: ConversationMeta): void {
  state.conversationId = meta.conversation_id
  if (meta.agent_id != null) state.agentId = Number(meta.agent_id)
  persistConversation()
}

function setStreaming(v: boolean): void {
  state.streaming = v
}

function setAvailability(v: boolean): void {
  state.availabilityLoaded = true
  state.available = v
}

/** 供发送时携带的历史轮次（纯文本、不含当前正在流式的助手消息） */
function historyForSend(): HistoryTurn[] {
  return state.messages
    .filter((m) => m.content && !m.streaming && !m.isError)
    .map((m) => ({ role: m.role, content: m.content }))
}

/** 重置会话（新建对话） */
function reset(): void {
  state.messages = []
  state.conversationId = null
  state.agentId = null
  state.currentAssistantId = null
  state.streaming = false
  try {
    uni.removeStorageSync(scopedKey(PERSIST_MESSAGES))
    uni.removeStorageSync(scopedKey(PERSIST_CONVERSATION))
  } catch {
    /* 忽略 */
  }
}

export const assistantStore = {
  state: readonly(state),
  messages: computed(() => state.messages),
  streaming: computed(() => state.streaming),
  available: computed(() => state.available),
  conversationId: computed(() => state.conversationId),
  /** 上一轮流式 meta 里的 Agent 归属（页面未显式传 agent_id 时由 useAssistantStream 回退取用） */
  agentId: computed(() => state.agentId),
  pushUser,
  beginAssistant,
  appendText,
  mergeToolCalls,
  updateToolResult,
  attachFormFill,
  attachWorkflow,
  attachConfirm,
  attachChoice,
  setConfirmStatus,
  answerChoice,
  endAssistant,
  pushError,
  setConversation,
  setStreaming,
  setAvailability,
  historyForSend,
  reset,
}
