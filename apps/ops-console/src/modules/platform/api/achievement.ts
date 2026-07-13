import { http, type ApiResponse } from '@scrm/shared'

export interface Achievement {
  id: number
  name: string
  icon: string
  description: string
  conditionType: string
  conditionValue: number
  rewardType: string
  rewardValue: number
  status: number
  createdAt: string
  updatedAt: string
}

export interface AchievementListParams {
  page: number
  pageSize: number
  name?: string
  status?: number
}

export interface AchievementListResult {
  data: Achievement[]
  total: number
}

export interface CreateAchievementData {
  name: string
  icon: string
  description?: string
  conditionType: string
  conditionValue: number
  rewardType: string
  rewardValue: number
  status: number
}

export interface UpdateAchievementData {
  name?: string
  icon?: string
  description?: string
  conditionType?: string
  conditionValue?: number
  rewardType?: string
  rewardValue?: number
  status?: number
}

function extractListResult<T>(res: ApiResponse<T[]>): { data: T[]; total: number } {
  return {
    data: res.data ?? [],
    total: res.meta?.total ?? res.total ?? 0,
  }
}

export async function getAchievementList(
  params: AchievementListParams,
): Promise<AchievementListResult> {
  const res = await http.get<Achievement[]>('/scrm/achievements', { params })
  return extractListResult(res)
}

export async function getAchievementDetail(id: number): Promise<Achievement> {
  const res = await http.get<Achievement>(`/scrm/achievements/${id}`)
  return res.data
}

export async function createAchievement(data: CreateAchievementData): Promise<Achievement> {
  const res = await http.post<Achievement>('/scrm/achievements', data)
  return res.data
}

export async function updateAchievement(
  id: number,
  data: UpdateAchievementData,
): Promise<Achievement> {
  const res = await http.put<Achievement>(`/scrm/achievements/${id}`, data)
  return res.data
}

export async function deleteAchievement(id: number): Promise<void> {
  await http.delete(`/scrm/achievements/${id}`)
}
