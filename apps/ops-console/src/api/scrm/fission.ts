import { http, type ApiResponse } from '@scrm/shared'

export interface FissionCampaign {
  id: number
  name: string
  description: string
  status: 'pending' | 'active' | 'ended'
  startTime: string
  endTime: string
  participantCount: number
  shareCount: number
  convertCount: number
  fissionType: 'single' | 'multi'
  targetCount: number
  rewardType: 'coupon' | 'points' | 'custom'
  rewardValue: number
  rewardName: string
  posterUrl: string
  shareTitle: string
  shareDesc: string
  createdAt: string
  updatedAt: string
}

export interface FissionCampaignListParams {
  page: number
  pageSize: number
  name?: string
  status?: string
}

export interface FissionCampaignListResult {
  data: FissionCampaign[]
  total: number
}

export interface CreateFissionCampaignData {
  name: string
  description?: string
  startTime: string
  endTime: string
  fissionType: 'single' | 'multi'
  targetCount: number
  rewardType: 'coupon' | 'points' | 'custom'
  rewardValue: number
  rewardName: string
  posterUrl?: string
  shareTitle?: string
  shareDesc?: string
}

export interface UpdateFissionCampaignData {
  name?: string
  description?: string
  startTime?: string
  endTime?: string
  fissionType?: 'single' | 'multi'
  targetCount?: number
  rewardType?: 'coupon' | 'points' | 'custom'
  rewardValue?: number
  rewardName?: string
  posterUrl?: string
  shareTitle?: string
  shareDesc?: string
}

function extractListResult<T>(res: ApiResponse<T[]>): { data: T[]; total: number } {
  return {
    data: res.data ?? [],
    total: res.meta?.total ?? res.total ?? 0,
  }
}

export async function getFissionCampaignList(params: FissionCampaignListParams): Promise<FissionCampaignListResult> {
  const res = await http.get<FissionCampaign[]>('/scrm/fission-campaigns', { params })
  return extractListResult(res)
}

export async function getFissionCampaignDetail(id: number): Promise<FissionCampaign> {
  const res = await http.get<FissionCampaign>(`/scrm/fission-campaigns/${id}`)
  return res.data
}

export async function createFissionCampaign(data: CreateFissionCampaignData): Promise<FissionCampaign> {
  const res = await http.post<FissionCampaign>('/scrm/fission-campaigns', data)
  return res.data
}

export async function updateFissionCampaign(id: number, data: UpdateFissionCampaignData): Promise<FissionCampaign> {
  const res = await http.put<FissionCampaign>(`/scrm/fission-campaigns/${id}`, data)
  return res.data
}

export async function deleteFissionCampaign(id: number): Promise<void> {
  await http.delete(`/scrm/fission-campaigns/${id}`)
}

export async function updateFissionCampaignStatus(id: number, status: 'pending' | 'active' | 'ended'): Promise<void> {
  await http.put(`/scrm/fission-campaigns/${id}/status`, { status })
}

export async function uploadFissionPoster(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await http.post<{ url: string }>('/scrm/fission-campaigns/upload-poster', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data.url
}
