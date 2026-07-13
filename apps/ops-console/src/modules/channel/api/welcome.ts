import { http, type ApiResponse } from '@scrm/shared'

export interface WelcomeMessage {
  id: number
  name: string
  triggerType: 'new_friend' | 'keyword' | 'qr_code'
  triggerValue: string
  content: string
  materials: WelcomeMaterial[]
  status: number
  createdAt: string
  updatedAt: string
}

export interface WelcomeMaterial {
  type: 'text' | 'image' | 'link' | 'miniprogram'
  content: string
  title?: string
  url?: string
  thumbUrl?: string
}

export interface WelcomeMessageListParams {
  page: number
  pageSize: number
  name?: string
  triggerType?: string
}

export interface WelcomeMessageListResult {
  data: WelcomeMessage[]
  total: number
}

export interface CreateWelcomeMessageData {
  name: string
  triggerType: 'new_friend' | 'keyword' | 'qr_code'
  triggerValue?: string
  content: string
  materials?: WelcomeMaterial[]
  status?: number
}

export interface UpdateWelcomeMessageData {
  name?: string
  triggerType?: 'new_friend' | 'keyword' | 'qr_code'
  triggerValue?: string
  content?: string
  materials?: WelcomeMaterial[]
  status?: number
}

function extractListResult<T>(res: ApiResponse<T[]>): { data: T[]; total: number } {
  return {
    data: res.data ?? [],
    total: res.meta?.total ?? res.total ?? 0,
  }
}

export async function getWelcomeMessageList(
  params: WelcomeMessageListParams,
): Promise<WelcomeMessageListResult> {
  const res = await http.get<WelcomeMessage[]>('/scrm/welcome-messages', { params })
  return extractListResult(res)
}

export async function getWelcomeMessageDetail(id: number): Promise<WelcomeMessage> {
  const res = await http.get<WelcomeMessage>(`/scrm/welcome-messages/${id}`)
  return res.data
}

export async function createWelcomeMessage(
  data: CreateWelcomeMessageData,
): Promise<WelcomeMessage> {
  const res = await http.post<WelcomeMessage>('/scrm/welcome-messages', data)
  return res.data
}

export async function updateWelcomeMessage(
  id: number,
  data: UpdateWelcomeMessageData,
): Promise<WelcomeMessage> {
  const res = await http.put<WelcomeMessage>(`/scrm/welcome-messages/${id}`, data)
  return res.data
}

export async function deleteWelcomeMessage(id: number): Promise<void> {
  await http.delete(`/scrm/welcome-messages/${id}`)
}
