import { http, type ApiResponse } from '@scrm/shared'

export interface LotteryPrize {
  id?: number
  name: string
  imageUrl: string
  probability: number
  quantity: number
  sortOrder: number
}

export interface LotteryWinnerRecord {
  id: number
  campaignId: number
  campaignName: string
  prizeName: string
  winnerName: string
  winnerPhone: string
  winTime: string
}

export interface LotteryCampaign {
  id: number
  name: string
  description: string
  status: 'pending' | 'active' | 'ended' | 'disabled'
  startTime: string
  endTime: string
  prizeCount: number
  participantCount: number
  prizes: LotteryPrize[]
  createdAt: string
  updatedAt: string
}

export interface LotteryCampaignListParams {
  page: number
  pageSize: number
  name?: string
  status?: string
}

export interface LotteryCampaignListResult {
  data: LotteryCampaign[]
  total: number
}

export interface CreateLotteryCampaignData {
  name: string
  description?: string
  startTime: string
  endTime: string
  prizes: Omit<LotteryPrize, 'id'>[]
}

export interface UpdateLotteryCampaignData {
  name?: string
  description?: string
  startTime?: string
  endTime?: string
  prizes?: Omit<LotteryPrize, 'id'>[]
}

export interface LotteryWinnerListParams {
  page: number
  pageSize: number
  campaignId?: number
}

export interface LotteryWinnerListResult {
  data: LotteryWinnerRecord[]
  total: number
}

function extractListResult<T>(res: ApiResponse<T[]>): { data: T[]; total: number } {
  return {
    data: res.data ?? [],
    total: res.meta?.total ?? res.total ?? 0,
  }
}

export async function getLotteryCampaignList(params: LotteryCampaignListParams): Promise<LotteryCampaignListResult> {
  const res = await http.get<LotteryCampaign[]>('/scrm/lottery-campaigns', { params })
  return extractListResult(res)
}

export async function getLotteryCampaignDetail(id: number): Promise<LotteryCampaign> {
  const res = await http.get<LotteryCampaign>(`/scrm/lottery-campaigns/${id}`)
  return res.data
}

export async function createLotteryCampaign(data: CreateLotteryCampaignData): Promise<LotteryCampaign> {
  const res = await http.post<LotteryCampaign>('/scrm/lottery-campaigns', data)
  return res.data
}

export async function updateLotteryCampaign(id: number, data: UpdateLotteryCampaignData): Promise<LotteryCampaign> {
  const res = await http.put<LotteryCampaign>(`/scrm/lottery-campaigns/${id}`, data)
  return res.data
}

export async function deleteLotteryCampaign(id: number): Promise<void> {
  await http.delete(`/scrm/lottery-campaigns/${id}`)
}

export async function updateLotteryCampaignStatus(id: number, status: 'active' | 'disabled'): Promise<void> {
  await http.put(`/scrm/lottery-campaigns/${id}/status`, { status })
}

export async function uploadLotteryPrizeImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await http.post<{ url: string }>('/scrm/lottery-campaigns/upload-prize', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data.url
}

export async function getLotteryWinnerList(params: LotteryWinnerListParams): Promise<LotteryWinnerListResult> {
  const res = await http.get<LotteryWinnerRecord[]>('/scrm/lottery-campaigns/winners', { params })
  return extractListResult(res)
}
