import { http, type ApiResponse } from '@scrm/shared'

export interface CustomerProfileData {
  id: number
  avatar: string
  name: string
  level: string
  levelIcon: string
  phone: string
  channel: string
  source: string
  createdAt: string
  lastActiveAt: string
  tags: CustomerTag[]
  stats: CustomerStats
}

export interface CustomerTag {
  id: number
  name: string
  color: string
  category: string
}

export interface CustomerStats {
  totalSpent: number
  orderCount: number
  avgOrderAmount: number
  lastSpentAt: string
  visitCount: number
  messageCount: number
}

export interface ConsumptionTrendItem {
  date: string
  amount: number
  orderCount: number
}

export interface TagDistributionItem {
  name: string
  value: number
  color: string
}

export interface InteractionRecord {
  id: number
  type: 'message' | 'order' | 'visit' | 'coupon' | 'event'
  title: string
  content: string
  channel: string
  createdAt: string
  metadata?: Record<string, unknown>
}

export interface InteractionListParams {
  page: number
  pageSize: number
  startDate?: string
  endDate?: string
  type?: string
}

export interface InteractionListResult {
  data: InteractionRecord[]
  total: number
}

export interface ProfileFilterParams {
  startDate?: string
  endDate?: string
}

function extractListResult<T>(res: ApiResponse<T[]>): { data: T[]; total: number } {
  return {
    data: res.data ?? [],
    total: res.meta?.total ?? res.total ?? 0,
  }
}

export async function getCustomerProfile(customerId: number): Promise<CustomerProfileData> {
  const res = await http.get<CustomerProfileData>(`/scrm/analytics/customer-profile/${customerId}`)
  return res.data
}

export async function getConsumptionTrend(
  customerId: number,
  params?: ProfileFilterParams,
): Promise<ConsumptionTrendItem[]> {
  const res = await http.get<ConsumptionTrendItem[]>(
    `/scrm/analytics/customer-profile/${customerId}/consumption-trend`,
    { params },
  )
  return res.data ?? []
}

export async function getTagDistribution(customerId: number): Promise<TagDistributionItem[]> {
  const res = await http.get<TagDistributionItem[]>(
    `/scrm/analytics/customer-profile/${customerId}/tag-distribution`,
  )
  return res.data ?? []
}

export async function getInteractionList(
  customerId: number,
  params: InteractionListParams,
): Promise<InteractionListResult> {
  const res = await http.get<InteractionRecord[]>(
    `/scrm/analytics/customer-profile/${customerId}/interactions`,
    { params },
  )
  return extractListResult(res)
}
