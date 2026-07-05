import { http } from '@scrm/shared'

export async function listChannels(params?: { type?: string; status?: string }) {
  const res = await http.get('/scrm/channels', { params })
  return res.data
}

export async function getChannel(id: number) {
  const res = await http.get(`/scrm/channels/${id}`)
  return res.data
}

export async function createChannel(data: Record<string, any>) {
  const res = await http.post('/scrm/channels', data)
  return res.data
}

export async function updateChannel(id: number, data: Record<string, any>) {
  const res = await http.put(`/scrm/channels/${id}`, data)
  return res.data
}

export async function deleteChannel(id: number) {
  await http.delete(`/scrm/channels/${id}`)
}

export async function testConnection(id: number) {
  const res = await http.post(`/scrm/channels/${id}/test`)
  return res.data
}

export async function getCallbackInfo(id: number) {
  const res = await http.get(`/scrm/channels/${id}/callback-info`)
  return res.data
}
