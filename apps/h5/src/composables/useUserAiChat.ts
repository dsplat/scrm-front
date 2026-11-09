import { onMounted, onUnmounted, ref } from 'vue'
import { getTenantId } from '@scrm/h5-ai'
import {
  DEFAULT_USER_AI_CAPABILITIES,
  getUserAiCapabilities,
  streamUserAi,
  type LocalChatMessage,
  type LocalToolCallState,
  type UserAiCapabilities,
  type UserAiSource,
} from '../api/user-ai'
import { getToken } from '../utils/request'

/** 会话 id 按租户隔离，避免切换租户后误续接别家会话 */
const CONVERSATION_STORAGE_PREFIX = 'secretary_conversation_id:'

function conversationStorageKey(): string {
  return `${CONVERSATION_STORAGE_PREFIX}${getTenantId()}`
}

function readStoredConversationId(): number | null {
  try {
    const raw = uni.getStorageSync(conversationStorageKey())
    const id = Number(raw)
    return Number.isFinite(id) && id > 0 ? id : null
  } catch {
    return null
  }
}

function writeStoredConversationId(id: number): void {
  try {
    uni.setStorageSync(conversationStorageKey(), String(id))
  } catch {
    // 存储失败不影响本轮会话；内存中的 id 仍可用于下一次续接
  }
}

function clearStoredConversationId(): void {
  try {
    uni.removeStorageSync(conversationStorageKey())
  } catch {
    // 忽略：下次读到空值同样视为新会话
  }
}

export function useUserAiChat() {
  const capabilities = ref<UserAiCapabilities>({
    ...DEFAULT_USER_AI_CAPABILITIES,
    quick_questions: [...DEFAULT_USER_AI_CAPABILITIES.quick_questions],
    tools: [...DEFAULT_USER_AI_CAPABILITIES.tools],
  })
  const draft = ref('')
  const answering = ref(false)
  const messages = ref<LocalChatMessage[]>([])
  /** 服务端会话 id（流首帧 meta 回填）；null 表示下一轮由服务端新建会话 */
  const conversationId = ref<number | null>(readStoredConversationId())
  let msgSeq = 0
  let activeController: { abort: () => void } | null = null

  async function loadCapabilities() {
    if (!getToken()) return
    try {
      capabilities.value = await getUserAiCapabilities()
    } catch {
      // 旧后端或配置接口暂不可用时保留同口径的默认能力。
    }
  }

  function upsertTool(
    msg: LocalChatMessage,
    patch: { id: string; name?: string; status: LocalToolCallState['status'] },
  ) {
    const tools = (msg.tools ??= [])
    const target = tools.find((tool) => tool.id === patch.id)
    const labels = capabilities.value.tools.find((tool) => tool.name === patch.name)
    if (target) {
      if (patch.name) target.name = patch.name
      if (labels) target.labels = labels
      target.status = patch.status
    } else {
      tools.push({
        id: patch.id,
        name: patch.name || '工具',
        status: patch.status,
        labels,
      })
    }
    msg.toolName = tools[tools.length - 1].name
    syncToolStatus(msg)
  }

  function syncToolStatus(msg: LocalChatMessage) {
    if (!msg.tools?.length) return
    if (msg.tools.some((tool) => tool.status === 'running')) msg.toolStatus = 'running'
    else if (msg.tools.some((tool) => tool.status === 'error')) msg.toolStatus = 'error'
    else msg.toolStatus = 'done'
  }

  function settleRunningTools(msg: LocalChatMessage) {
    for (const tool of msg.tools ?? []) {
      if (tool.status === 'running') tool.status = 'error'
    }
    syncToolStatus(msg)
  }

  function appendSources(msg: LocalChatMessage, sources: UserAiSource[]) {
    const current = (msg.sources ??= [])
    for (const source of sources) {
      if (!current.some((item) => item.content === source.content && item.title === source.title)) {
        current.push(source)
      }
    }
  }

  async function send(input?: string, options: { displayText?: string } = {}) {
    const text = (input ?? draft.value).trim()
    if (!text || answering.value) return
    draft.value = ''
    const displayText = options.displayText ?? text
    messages.value.push({
      id: ++msgSeq,
      role: 'user',
      content: displayText,
      ...(displayText !== text ? { requestContent: text } : {}),
    })
    messages.value.push({ id: ++msgSeq, role: 'assistant', content: '', streaming: true })
    const pending = messages.value[messages.value.length - 1]
    const history = messages.value.slice(0, -2)
    const controller: { signal?: AbortSignal; abort: () => void } =
      typeof AbortController !== 'undefined' ? new AbortController() : { abort: () => {} }
    activeController = controller
    answering.value = true

    try {
      await streamUserAi(
        text,
        (chunk) => {
          pending.content += chunk
        },
        {
          history,
          historyLimit: capabilities.value.history_limit,
          conversationId: conversationId.value,
          signal: controller.signal,
          onMeta: (meta) => {
            const id = Number(meta.conversation_id)
            if (Number.isFinite(id) && id > 0) {
              conversationId.value = id
              writeStoredConversationId(id)
            }
          },
          onToolCall: (toolName, toolCallId) => {
            upsertTool(pending, { id: toolCallId, name: toolName, status: 'running' })
          },
          onToolResult: (id, result) => {
            const failed = !!result && typeof result === 'object' && 'error' in result
            upsertTool(pending, { id, status: failed ? 'error' : 'done' })
          },
          onSources: (_id, sources) => appendSources(pending, sources),
        },
      )
      settleRunningTools(pending)
      if (!pending.content) pending.content = '抱歉，暂时无法回答这个问题。'
    } catch (error: any) {
      settleRunningTools(pending)
      if (error?.name === 'AbortError') {
        if (!pending.content) pending.content = '已停止回答。'
        return
      }
      pending.isError = true
      if (!draft.value) draft.value = text
      const reason = error?.curated ? String(error.message) : '网络异常，请稍后再试'
      pending.content = pending.content ? `${pending.content}\n\n（回答中断：${reason}）` : reason
    } finally {
      pending.streaming = false
      if (activeController === controller) {
        activeController = null
        answering.value = false
      }
    }
  }

  function stop() {
    activeController?.abort()
  }

  function startNewChat() {
    stop()
    activeController = null
    answering.value = false
    messages.value = []
    draft.value = ''
    // 清掉服务端会话 id，下一轮由服务端新建会话（不复用旧会话）
    conversationId.value = null
    clearStoredConversationId()
  }

  async function retry(message: LocalChatMessage) {
    if (answering.value) return
    const index = messages.value.findIndex((item) => item.id === message.id)
    const question = index > 0 ? messages.value[index - 1] : null
    if (question?.role === 'user') {
      await send(question.requestContent ?? question.content, { displayText: question.content })
    }
  }

  onMounted(loadCapabilities)
  onUnmounted(stop)

  return {
    capabilities,
    draft,
    answering,
    messages,
    conversationId,
    send,
    stop,
    startNewChat,
    retry,
    loadCapabilities,
  }
}
