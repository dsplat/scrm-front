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

export interface FunnelStage {
  name: string
  count: number
  conversionRate: number
}

export interface FunnelData {
  stages: FunnelStage[]
  totalVisitors: number
  overallConversionRate: number
}

export interface FunnelFilterParams {
  startDate?: string
  endDate?: string
  campaignId?: number
}

export interface CampaignOption {
  id: number
  name: string
}

const defaultFunnelData: FunnelData = { stages: [], totalVisitors: 0, overallConversionRate: 0 }

export async function getFunnelData(params?: FunnelFilterParams): Promise<FunnelData> {
  const res = await http.get<FunnelData>('/scrm/analytics/funnel', { params })
  return res.data ?? defaultFunnelData
}

export async function getCampaignOptions(): Promise<CampaignOption[]> {
  const res = await http.get<CampaignOption[]>('/scrm/analytics/campaigns')
  return res.data ?? []
}

export interface ChurnAlertSummary {
  highRiskCount: number
  churnRate: number
  alertCount: number
  recoveryRate: number
}

export interface ChurnTrendItem {
  date: string
  count: number
}

export interface ChurnCustomer {
  customerId: number
  customerName: string
  avatar: string
  phone: string
  riskLevel: 'high' | 'medium' | 'low'
  churnProbability: number
  lastActiveAt: string
  totalSpent: number
  churnReason: string
}

export interface ChurnTrendParams {
  startDate?: string
  endDate?: string
}

export interface ChurnCustomerListParams {
  page: number
  pageSize: number
  startDate?: string
  endDate?: string
  riskLevel?: string
}

export interface ChurnCustomerListResult {
  data: ChurnCustomer[]
  total: number
}

export async function getChurnAlertSummary(params?: ChurnTrendParams): Promise<ChurnAlertSummary> {
  const res = await http.get<ChurnAlertSummary>('/scrm/analytics/churn-alert/summary', { params })
  return res.data ?? { highRiskCount: 0, churnRate: 0, alertCount: 0, recoveryRate: 0 }
}

export async function getChurnTrend(params?: ChurnTrendParams): Promise<ChurnTrendItem[]> {
  const res = await http.get<ChurnTrendItem[]>('/scrm/analytics/churn-alert/trend', { params })
  return res.data ?? []
}

export async function getChurnCustomerList(
  params: ChurnCustomerListParams,
): Promise<ChurnCustomerListResult> {
  const res = await http.get<ChurnCustomer[]>('/scrm/analytics/churn-alert/customers', {
    params,
  })
  return extractListResult(res)
}

export interface CommunityRankItem {
  communityId: number
  name: string
  memberCount: number
  activityScore: number
}

export interface CommunityTrendItem {
  date: string
  score: number
}

export interface CommunityInfo {
  id: number
  name: string
  memberCount: number
  activityScore: number
  owner: string
  createdAt: string
}

export interface CommunityFilterParams {
  startDate?: string
  endDate?: string
}

export interface CommunityListParams {
  page: number
  pageSize: number
  keyword?: string
}

export interface CommunityListResult {
  data: CommunityInfo[]
  total: number
}

export async function getCommunityRank(
  params?: CommunityFilterParams,
): Promise<CommunityRankItem[]> {
  const res = await http.get<CommunityRankItem[]>('/scrm/analytics/community/rank', { params })
  return res.data ?? []
}

export async function getCommunityTrend(
  params?: CommunityFilterParams,
): Promise<CommunityTrendItem[]> {
  const res = await http.get<CommunityTrendItem[]>('/scrm/analytics/community/trend', { params })
  return res.data ?? []
}

export async function getCommunityList(params: CommunityListParams): Promise<CommunityListResult> {
  const res = await http.get<CommunityInfo[]>('/scrm/analytics/community/list', { params })
  return extractListResult(res)
}
