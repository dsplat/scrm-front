import { http } from '@scrm/shared'

export interface MomentsSop {
  id: number
  name: string
  content: string
  executeTime: string
  status: number
  createdAt: string
  updatedAt: string
}

export interface MomentsSopListParams {
  page: number
  pageSize: number
  name?: string
  status?: number
}

export interface MomentsSopListResult {
  data: MomentsSop[]
  total: number
}

export interface CreateMomentsSopData {
  name: string
  content: string
  executeTime: string
  status: number
}

export interface UpdateMomentsSopData {
  name?: string
  content?: string
  executeTime?: string
  status?: number
}

export async function getMomentsSopList(
  params: MomentsSopListParams,
): Promise<MomentsSopListResult> {
  const res = await http.get<any>('/scrm/moments-sops', { params })
  return {
    data: res.data ?? [],
    total: res.meta?.total ?? res.total ?? 0,
  }
}

export async function getMomentsSopDetail(id: number) {
  const res = await http.get<MomentsSop>(`/scrm/moments-sops/${id}`)
  return res.data
}

export async function createMomentsSop(data: CreateMomentsSopData) {
  const res = await http.post('/scrm/moments-sops', data)
  return res.data
}

export async function updateMomentsSop(id: number, data: UpdateMomentsSopData) {
  const res = await http.put(`/scrm/moments-sops/${id}`, data)
  return res.data
}

export async function deleteMomentsSop(id: number) {
  const res = await http.delete(`/scrm/moments-sops/${id}`)
  return res.data
}

export async function toggleMomentsSop(id: number, status: number) {
  const res = await http.patch(`/scrm/moments-sops/${id}/toggle`, { status })
  return res.data
}
