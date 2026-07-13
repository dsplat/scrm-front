import { http } from '@scrm/shared'

export interface ScheduledReach {
  id: number
  name: string
  channelType: string
  targetType: string
  targetCount: number
  sentCount: number
  successCount: number
  scheduledAt: string
  executedAt: string
  status: number
  createdAt: string
  updatedAt: string
}

export interface ScheduledReachListParams {
  page: number
  pageSize: number
  name?: string
  status?: number
}

export interface ScheduledReachListResult {
  data: ScheduledReach[]
  total: number
}

export async function getScheduledReachList(
  params: ScheduledReachListParams,
): Promise<ScheduledReachListResult> {
  const res = await http.get<any>('/scrm/scheduled-reaches', { params })
  return { data: res.data ?? [], total: res.meta?.total ?? res.total ?? 0 }
}

export async function createScheduledReach(data: Partial<ScheduledReach>) {
  const res = await http.post('/scrm/scheduled-reaches', data)
  return res.data
}

export async function updateScheduledReach(id: number, data: Partial<ScheduledReach>) {
  const res = await http.put(`/scrm/scheduled-reaches/${id}`, data)
  return res.data
}

export async function deleteScheduledReach(id: number) {
  const res = await http.delete(`/scrm/scheduled-reaches/${id}`)
  return res.data
}

export async function executeScheduledReach(id: number) {
  const res = await http.post(`/scrm/scheduled-reaches/${id}/execute`)
  return res.data
}
