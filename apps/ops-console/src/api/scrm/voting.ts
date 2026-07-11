import { http, type ApiResponse } from '@scrm/shared'

export interface VotingOption {
  id?: number
  title: string
  sortOrder: number
}

export interface VotingOptionResult {
  optionId: number
  title: string
  voteCount: number
}

export interface VotingCampaign {
  id: number
  title: string
  status: 'draft' | 'active' | 'ended' | 'disabled'
  totalVotes: number
  options: VotingOption[]
  startTime: string
  endTime: string
  createdAt: string
  updatedAt: string
}

export interface VotingCampaignListParams {
  page: number
  pageSize: number
  title?: string
  status?: string
}

export interface VotingCampaignListResult {
  data: VotingCampaign[]
  total: number
}

export interface CreateVotingCampaignData {
  title: string
  startTime: string
  endTime: string
  options: Omit<VotingOption, 'id'>[]
}

export interface UpdateVotingCampaignData {
  title?: string
  startTime?: string
  endTime?: string
  options?: Omit<VotingOption, 'id'>[]
}

function extractListResult<T>(res: ApiResponse<T[]>): { data: T[]; total: number } {
  return {
    data: res.data ?? [],
    total: res.meta?.total ?? res.total ?? 0,
  }
}

export async function getVotingCampaignList(
  params: VotingCampaignListParams,
): Promise<VotingCampaignListResult> {
  const res = await http.get<VotingCampaign[]>('/scrm/voting-campaigns', { params })
  return extractListResult(res)
}

export async function getVotingCampaignDetail(id: number): Promise<VotingCampaign> {
  const res = await http.get<VotingCampaign>(`/scrm/voting-campaigns/${id}`)
  return res.data
}

export async function createVotingCampaign(
  data: CreateVotingCampaignData,
): Promise<VotingCampaign> {
  const res = await http.post<VotingCampaign>('/scrm/voting-campaigns', data)
  return res.data
}

export async function updateVotingCampaign(
  id: number,
  data: UpdateVotingCampaignData,
): Promise<VotingCampaign> {
  const res = await http.put<VotingCampaign>(`/scrm/voting-campaigns/${id}`, data)
  return res.data
}

export async function deleteVotingCampaign(id: number): Promise<void> {
  await http.delete(`/scrm/voting-campaigns/${id}`)
}

export async function updateVotingCampaignStatus(
  id: number,
  status: 'active' | 'disabled',
): Promise<void> {
  await http.put(`/scrm/voting-campaigns/${id}/status`, { status })
}

export async function getVotingResults(id: number): Promise<VotingOptionResult[]> {
  const res = await http.get<VotingOptionResult[]>(`/scrm/voting-campaigns/${id}/results`)
  return res.data ?? []
}
