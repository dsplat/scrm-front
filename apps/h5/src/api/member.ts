/**
 * C端会员 API — 积分余额、流水、会员档案与成就
 *
 * 积分商城商品/兑换已上移至 @scrm/h5-commerce（api/exchange）
 */
import { request } from '../utils/request'

export interface PointsBalance {
  balance: number
  linked: boolean
  customer_name?: string
}

export interface PointsFlowItem {
  id: number
  points: number
  type: string
  description?: string
  created_at: string
}

export interface MemberLevel {
  level_id: number
  name: string
  icon?: string | null
  benefits?: Record<string, unknown>
}

export interface MemberProfile {
  user_id: number
  growth_value: number
  level_status: 'none' | 'active' | 'expired'
  level_started_at?: string | null
  level_expires_at?: string | null
  validity_days: number
  level: MemberLevel | null
  expired_level?: { level_id: number; name: string } | null
  benefits: {
    level_id: number | null
    level_name: string | null
    discount_basis_points: number
    points_multiplier_basis_points: number
  }
}

export interface MemberAchievement {
  achievement_id: number
  code: string
  name: string
  description?: string | null
  icon?: string | null
  condition_type: string
  condition_value: number
  reward_type: string
  points_reward: number
  progress_value: number
  target_value: number
  status: 'pending' | 'completed'
  completed_at?: string | null
  awarded_at?: string | null
}

/** 我的会员档案（等级、成长值、权益） */
export async function getMyMembershipProfile(): Promise<MemberProfile> {
  return request({
    url: '/biz/member/profile',
    method: 'GET',
  })
}

/** 我的成就墙 */
export async function getMyAchievements(): Promise<MemberAchievement[]> {
  return request({
    url: '/biz/member/achievements',
    method: 'GET',
  })
}

/** 我的积分余额 */
export async function getMyPointsBalance(): Promise<PointsBalance> {
  return request({
    url: '/biz/member/points/balance',
    method: 'GET',
  })
}

/** 我的积分流水 */
export async function getMyPointsFlow(
  type?: string,
): Promise<{ items: PointsFlowItem[]; total: number }> {
  return request({
    url: `/biz/member/points/flow${type ? `?type=${type}` : ''}`,
    method: 'GET',
  })
}
