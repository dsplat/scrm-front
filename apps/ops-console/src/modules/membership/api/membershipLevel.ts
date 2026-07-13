import { http } from '@scrm/shared'

export interface MembershipLevel {
  id: number
  name: string
  icon: string
  sortOrder: number
  upgradeConditions: Record<string, any>
  retainConditions: Record<string, any>
  benefits: Record<string, any>
  status: number
  createdAt: string
  updatedAt: string
}

export interface MembershipLevelListParams {
  page: number
  pageSize: number
  name?: string
}

export interface MembershipLevelListResult {
  data: MembershipLevel[]
  total: number
}

export async function getMembershipLevelList(
  params: MembershipLevelListParams,
): Promise<MembershipLevelListResult> {
  const res = await http.get<any>('/scrm/membership-levels', { params })
  return {
    data: res.data ?? [],
    total: res.meta?.total ?? res.total ?? 0,
  }
}

export async function createMembershipLevel(data: Partial<MembershipLevel>) {
  const res = await http.post('/scrm/membership-levels', data)
  return res.data
}

export async function updateMembershipLevel(id: number, data: Partial<MembershipLevel>) {
  const res = await http.put(`/scrm/membership-levels/${id}`, data)
  return res.data
}

export async function deleteMembershipLevel(id: number) {
  const res = await http.delete(`/scrm/membership-levels/${id}`)
  return res.data
}

export async function getMembershipLevelBenefits(id: number) {
  const res = await http.get<any>(`/scrm/membership-levels/${id}/benefits`)
  return res.data
}

export async function updateMembershipLevelBenefits(id: number, data: Record<string, any>) {
  const res = await http.put(`/scrm/membership-levels/${id}/benefits`, data)
  return res.data
}
