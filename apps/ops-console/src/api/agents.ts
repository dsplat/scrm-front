import { http } from '@scrm/shared'

export async function listAgents(params?: { status?: string }) {
  const res = await http.get('/scrm/agents', { params })
  return res.data
}

export async function getAgent(id: number) {
  const res = await http.get(`/scrm/agents/${id}`)
  return res.data
}

export async function toggleAgent(id: number) {
  const res = await http.patch(`/scrm/agents/${id}/toggle`)
  return res.data
}

export async function bindTools(id: number, toolIds: string[]) {
  const res = await http.post(`/scrm/agents/${id}/tools`, { tool_ids: toolIds })
  return res.data
}

export async function unbindTools(id: number, toolIds: string[]) {
  const res = await http.delete(`/scrm/agents/${id}/tools`, { data: { tool_ids: toolIds } })
  return res.data
}

export async function getConversations(id: number) {
  const res = await http.get(`/scrm/agents/${id}/conversations`)
  return res.data
}

export async function startConversation(id: number, message: string, context?: Record<string, any>) {
  const res = await http.post(`/scrm/agents/${id}/conversations`, { message, context })
  return res.data
}

export async function setInteractionMode(id: number, mode: string) {
  const res = await http.patch(`/scrm/agents/${id}/interaction-mode`, { mode })
  return res.data
}
