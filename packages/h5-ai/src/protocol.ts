import type {
  ActionConfirmData,
  FormFillSuggestion,
  StepFinishInfo,
  ToolCall,
  UserChoiceData,
  WorkflowSuggestion,
} from './types'

export type DataStreamEvent =
  | { type: 'text'; value: string }
  | { type: 'tool_call'; value: ToolCall }
  | { type: 'meta'; value: Record<string, unknown> }
  | { type: 'tool_result'; value: { id: string; result: unknown } }
  | { type: 'form_fill'; value: FormFillSuggestion }
  | { type: 'workflow'; value: WorkflowSuggestion }
  | { type: 'pending_confirmation'; value: ActionConfirmData }
  | { type: 'user_choice'; value: UserChoiceData }
  | { type: 'step_finish'; value: StepFinishInfo }
  | { type: 'error'; value: string }
  | { type: 'done'; value: Record<string, unknown> | null }
  | { type: 'ignore' }

/** 解析一条 Vercel AI data stream 行，供 H5 页面和共享助手使用同一语义。 */
export function parseDataStreamLine(line: string): DataStreamEvent {
  const separator = line.indexOf(':')
  if (separator <= 0) return { type: 'ignore' }
  const kind = line.slice(0, separator)
  const payload = line.slice(separator + 1)
  try {
    const value = JSON.parse(payload)
    if (kind === '0' && typeof value === 'string') return { type: 'text', value }
    if (kind === '9') {
      return {
        type: 'tool_call',
        value: {
          id: value.toolCallId,
          name: value.toolName,
          arguments: value.args ?? {},
          status: 'running',
        },
      }
    }
    if (kind === '2' && Array.isArray(value)) {
      const meta = value.find((item) => item?.type === 'meta')
      return meta ? { type: 'meta', value: meta } : { type: 'ignore' }
    }
    if (kind === 'a' && value?.toolCallId) {
      const result = value.result ?? value
      if (result?.action === 'form_fill') return { type: 'form_fill', value: result }
      if (result?.action === 'workflow') return { type: 'workflow', value: result }
      if (result?.action === 'pending_confirmation')
        return { type: 'pending_confirmation', value: result }
      if (result?.action === 'user_choice') return { type: 'user_choice', value: result }
      return { type: 'tool_result', value: { id: String(value.toolCallId), result } }
    }
    if (kind === '3')
      return { type: 'error', value: typeof value === 'string' ? value : 'AI 助手遇到错误。' }
    if (kind === 'd') return { type: 'done', value: value ?? null }
    // e: finish_step（Vercel AI SDK「步完成」控制帧）：多步链每一步结束下发一次。
    // 仅承载进度信号；usage 只透传记录，不参与授权/计费（BL-059）。
    if (kind === 'e' && value && typeof value === 'object') {
      return {
        type: 'step_finish',
        value: {
          finishReason: typeof value.finishReason === 'string' ? value.finishReason : undefined,
          usage: value.usage,
          isContinued: typeof value.isContinued === 'boolean' ? value.isContinued : undefined,
        },
      }
    }
  } catch {
    return { type: 'ignore' }
  }
  return { type: 'ignore' }
}

/**
 * 行分派回调（缺项即忽略该事件）。
 *
 * 消费层与解析层的唯一接缝：把「帧语义」与「传输/UI 副作用」解耦，
 * 使四类控制消息、工具结果、EOF 等分派可在无传输桩的情况下被测试覆盖。
 */
export interface StreamLineHandlers {
  onText?: (text: string) => void
  /** 仅在 meta 帧携带 conversation_id 时触发（与历史行为一致） */
  onMeta?: (meta: { conversation_id: number; agent_id: number | null }) => void
  onToolCall?: (call: ToolCall) => void
  onToolResult?: (id: string, result: unknown) => void
  onFormFill?: (payload: FormFillSuggestion) => void
  onWorkflow?: (payload: WorkflowSuggestion) => void
  onPendingConfirmation?: (payload: ActionConfirmData) => void
  onUserChoice?: (payload: UserChoiceData) => void
  /** 多步链单步完成（`e:` finish_step 帧）；缺项即忽略该事件 */
  onStepFinish?: (info: StepFinishInfo) => void
  onError?: (message: string) => void
  onDone?: (meta: Record<string, unknown> | null) => void
  /**
   * 业务回调自身抛异常时的上报口（携带原始 error 与回调名）。
   * 传输层不得因此被误判为「连接失败」——见 useAssistantStream 的用法。
   */
  onCallbackError?: (error: unknown, callback: string) => void
}

/**
 * 解析并分派一行数据帧。返回 true 表示本行是结束帧（`d:`）。
 *
 * 每个回调独立 try/catch：一个 UI 回调的 bug 不得中断后续帧的处理，
 * 也不得让原始异常被转写成「AI 助手连接失败」之类的传输文案而丢真因。
 */
export function dispatchDataStreamLine(line: string, h: StreamLineHandlers): boolean {
  const event = parseDataStreamLine(line)

  const invoke = (name: string, fn?: () => void) => {
    if (!fn) return
    try {
      fn()
    } catch (e) {
      if (h.onCallbackError) h.onCallbackError(e, name)
      else throw e
    }
  }

  switch (event.type) {
    case 'text':
      invoke('onText', () => h.onText?.(event.value))
      break
    case 'meta':
      if (event.value.conversation_id) {
        // 缺失的 agent_id 归一为 null（声明类型是 number | null，不把 undefined 泄给 store）
        const meta = {
          conversation_id: Number(event.value.conversation_id),
          agent_id: event.value.agent_id == null ? null : Number(event.value.agent_id),
        }
        invoke('onMeta', () => h.onMeta?.(meta))
      }
      break
    case 'tool_call':
      invoke('onToolCall', () => h.onToolCall?.(event.value))
      break
    case 'tool_result':
      invoke('onToolResult', () => h.onToolResult?.(event.value.id, event.value.result))
      break
    case 'form_fill':
      invoke('onFormFill', () => h.onFormFill?.(event.value))
      break
    case 'workflow':
      invoke('onWorkflow', () => h.onWorkflow?.(event.value))
      break
    case 'pending_confirmation':
      invoke('onPendingConfirmation', () => h.onPendingConfirmation?.(event.value))
      break
    case 'user_choice':
      invoke('onUserChoice', () => h.onUserChoice?.(event.value))
      break
    case 'step_finish':
      invoke('onStepFinish', () => h.onStepFinish?.(event.value))
      break
    case 'error':
      invoke('onError', () => h.onError?.(event.value))
      break
    case 'done':
      invoke('onDone', () => h.onDone?.(event.value))
      return true
    case 'ignore':
      break
  }

  return false
}
