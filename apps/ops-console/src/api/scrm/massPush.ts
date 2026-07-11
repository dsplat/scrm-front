import { http } from '@scrm/shared'

export interface MassPushTask {
  id: number
  name: string
  content: string
  targetType: 'all' | 'group' | 'tag'
  targetValue: string
  scheduledTime: string | null
  status: 'draft' | 'pending' | 'sending' | 'paused' | 'completed' | 'failed'
  totalCount: number
  sentCount: number
  successCount: number
  failCount: number
  createdAt: string
  updatedAt: string
}

export interface MassPushListParams {
  page: number
  pageSize: number
  name?: string
  status?: string
}

export interface MassPushListResult {
  data: MassPushTask[]
  total: number
}

export interface CreateMassPushData {
  name: string
  content: string
  targetType: 'all' | 'group' | 'tag'
  targetValue: string
  scheduledTime?: string
}

export interface UpdateMassPushData {
  name?: string
  content?: string
  targetType?: 'all' | 'group' | 'tag'
  targetValue?: string
  scheduledTime?: string
}

export async function getMassPushList(params: MassPushListParams): Promise<MassPushListResult> {
  const res = await http.get<any>('/scrm/mass-push', { params })
  return {
    data: res.data ?? [],
    total: res.meta?.total ?? res.total ?? 0,
  }
}

export async function getMassPushDetail(id: number) {
  const res = await http.get<MassPushTask>(`/scrm/mass-push/${id}`)
  return res.data
}

export async function createMassPush(data: CreateMassPushData) {
  const res = await http.post('/scrm/mass-push', data)
  return res.data
}

export async function updateMassPush(id: number, data: UpdateMassPushData) {
  const res = await http.put(`/scrm/mass-push/${id}`, data)
  return res.data
}

export async function deleteMassPush(id: number) {
  const res = await http.delete(`/scrm/mass-push/${id}`)
  return res.data
}

export async function pauseMassPush(id: number) {
  const res = await http.patch(`/scrm/mass-push/${id}/pause`)
  return res.data
}

export async function resumeMassPush(id: number) {
  const res = await http.patch(`/scrm/mass-push/${id}/resume`)
  return res.data
}
