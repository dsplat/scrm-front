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

export type MassPushStatus = MassPushTask['status']

export interface MassPushListParams {
  page: number
  pageSize: number
  name?: string
  status?: MassPushStatus
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
  const res = await http.get<MassPushTask[]>('/scrm/mass-push', { params })
  return {
    data: res.data ?? [],
    total: res.meta?.total ?? res.total ?? 0,
  }
}

export async function getMassPushDetail(id: number): Promise<MassPushTask> {
  const res = await http.get<MassPushTask>(`/scrm/mass-push/${id}`)
  return res.data
}

export async function createMassPush(data: CreateMassPushData): Promise<void> {
  await http.post('/scrm/mass-push', data)
}

export async function updateMassPush(id: number, data: UpdateMassPushData): Promise<void> {
  await http.put(`/scrm/mass-push/${id}`, data)
}

export async function deleteMassPush(id: number): Promise<void> {
  await http.delete(`/scrm/mass-push/${id}`)
}

export async function pauseMassPush(id: number): Promise<void> {
  await http.patch(`/scrm/mass-push/${id}/pause`)
}

export async function resumeMassPush(id: number): Promise<void> {
  await http.patch(`/scrm/mass-push/${id}/resume`)
}
