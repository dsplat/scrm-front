import type { ToolCall } from './types'

export type DataStreamEvent =
  | { type: 'text'; value: string }
  | { type: 'tool_call'; value: ToolCall }
  | { type: 'meta'; value: Record<string, unknown> }
  | { type: 'tool_result'; value: { id: string; result: unknown } }
  | { type: 'form_fill'; value: Record<string, unknown> }
  | { type: 'workflow'; value: Record<string, unknown> }
  | { type: 'pending_confirmation'; value: Record<string, unknown> }
  | { type: 'user_choice'; value: Record<string, unknown> }
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
  } catch {
    return { type: 'ignore' }
  }
  return { type: 'ignore' }
}
