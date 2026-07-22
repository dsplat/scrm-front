/**
 * C端分销员中心 API — 创业变现
 */
import { request } from '../utils/request'

export interface DistributorProfile {
  id: number
  name: string
  avatar: string
  level: number
  inviteCode: string
  status: 'pending' | 'active' | 'frozen'
  totalCommission: number
  availableCommission: number
  frozenCommission: number
  subordinateCount: number
  createdAt: string
}

export interface DistributionCenterProfile {
  enabled: boolean
  isDistributor: boolean
  distributor: DistributorProfile | null
  config: {
    maxLevel: number
    withdrawMinAmount: number
    withdrawFeeRate: number
    settleDays: number
  }
}

export interface TeamMember {
  id: number
  name: string
  avatar: string
  level: number
  status: string
  createdAt: string
}

export interface CommissionItem {
  id: number
  orderNo: string
  level: number
  orderAmount: number
  commissionAmount: number
  status: 'pending' | 'settled' | 'cancelled'
  settledAt: string | null
  createdAt: string
}

/** 分销中心首页（身份 + 概览 + 配置） */
export async function getDistributionProfile(): Promise<DistributionCenterProfile> {
  return request({
    url: '/scrm/distribution-center/profile',
    method: 'GET',
  })
}

/** 申请成为分销员 */
export async function applyDistributor(data: {
  name?: string
  phone?: string
  parentInviteCode?: string
}): Promise<DistributorProfile> {
  return request({
    url: '/scrm/distribution-center/apply',
    method: 'POST',
    data,
  })
}

/** 我的邀请信息 */
export async function getInviteInfo(): Promise<{ inviteCode: string; inviteUrl: string }> {
  return request({
    url: '/scrm/distribution-center/invite',
    method: 'GET',
  })
}

/** 我的团队 */
export async function getMyTeam(): Promise<{
  direct: TeamMember[]
  indirectCount: number
  subordinateCount: number
}> {
  return request({
    url: '/scrm/distribution-center/team',
    method: 'GET',
  })
}

/** 我的佣金记录 */
export async function getMyCommissions(status?: string): Promise<CommissionItem[]> {
  const query = status ? `?status=${status}&pageSize=100` : '?pageSize=100'
  return request({
    url: `/scrm/distribution-center/commissions${query}`,
    method: 'GET',
  })
}

/** 申请提现 */
export async function requestWithdrawal(data: {
  amount: number
  accountType?: string
  bankName?: string
  bankAccount?: string
  accountName?: string
  remark?: string
}): Promise<any> {
  return request({
    url: '/scrm/distribution-center/withdrawals',
    method: 'POST',
    data,
  })
}

/** 我的提现记录 */
export async function getMyWithdrawals(): Promise<any[]> {
  return request({
    url: '/scrm/distribution-center/withdrawals?pageSize=100',
    method: 'GET',
  })
}
