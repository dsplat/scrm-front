import { http } from '@scrm/shared'

export interface PointsRule {
  id: number
  name: string
  scene: string
  points: number
  startTime: string
  endTime: string
  status: number
  createdAt: string
  updatedAt: string
}

export interface PointsLog {
  id: number
  customerId: number
  customerName: string
  ruleId: number
  ruleName: string
  points: number
  type: number
  remark: string
  createdAt: string
}

export interface PointsRuleListParams {
  page: number
  pageSize: number
  name?: string
  status?: number
}

export interface PointsRuleListResult {
  data: PointsRule[]
  total: number
}

export interface PointsLogListParams {
  page: number
  pageSize: number
  ruleId?: number
}

export interface PointsLogListResult {
  data: PointsLog[]
  total: number
}

export interface CreatePointsRuleData {
  name: string
  scene: string
  points: number
  startTime: string
  endTime: string
  status: number
}

export interface UpdatePointsRuleData {
  name?: string
  scene?: string
  points?: number
  startTime?: string
  endTime?: string
  status?: number
}

export async function getPointsRuleList(
  params: PointsRuleListParams,
): Promise<PointsRuleListResult> {
  const res = await http.get<any>('/scrm/points-rules', { params })
  return {
    data: res.data ?? [],
    total: res.meta?.total ?? res.total ?? 0,
  }
}

export async function getPointsRuleDetail(id: number) {
  const res = await http.get<PointsRule>(`/scrm/points-rules/${id}`)
  return res.data
}

export async function createPointsRule(data: CreatePointsRuleData) {
  const res = await http.post('/scrm/points-rules', data)
  return res.data
}

export async function updatePointsRule(id: number, data: UpdatePointsRuleData) {
  const res = await http.put(`/scrm/points-rules/${id}`, data)
  return res.data
}

export async function deletePointsRule(id: number) {
  const res = await http.delete(`/scrm/points-rules/${id}`)
  return res.data
}

export async function togglePointsRule(id: number, status: number) {
  const res = await http.patch(`/scrm/points-rules/${id}/toggle`, { status })
  return res.data
}

export async function getPointsLogList(params: PointsLogListParams): Promise<PointsLogListResult> {
  const res = await http.get<any>('/scrm/points-logs', { params })
  return {
    data: res.data ?? [],
    total: res.meta?.total ?? res.total ?? 0,
  }
}
