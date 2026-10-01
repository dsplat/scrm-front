/**
 * C端营销互动 API — 优惠券 / 抽奖 / 投票 / 公告
 *
 * 均为框架层端点（无 /biz 前缀）：
 *  - /coupons/my           我的优惠券（登录）
 *  - /my/lottery/*         抽奖参与（登录）
 *  - /my/voting/*          投票参与（登录）
 *  - /announcements        系统公告（游客可读）
 * request() 已自动解包 body.data，故下列函数直接返回 data。
 */
import { request } from '../utils/request'

// ==================== 优惠券 ====================

export interface MyCoupon {
  coupon_id: number | string
  code: string
  description?: string | null
  type: 'fixed' | 'percentage' | 'exchange' | 'cash' | string
  value: number
  currency?: string | null
  min_amount?: number | null
  max_discount?: number | null
  starts_at?: string | null
  expires_at?: string | null
  status: 'available' | 'used' | 'expired' | 'disabled' | 'not_started' | string
}

/** 我的优惠券（status 可选：available/used/expired/disabled/not_started） */
export async function getMyCoupons(status?: string): Promise<MyCoupon[]> {
  return request({
    url: '/coupons/my',
    method: 'GET',
    data: status ? { status } : {},
  })
}

// ==================== 抽奖 ====================

export interface LotteryPrize {
  prize_id: number | string
  name: string
  image_url?: string | null
  type?: string | null
  value?: number | string | null
  remaining_count?: number
  total_count?: number
  sort_order?: number
}

export interface LotteryActivityVO {
  activity_id: number | string
  title: string
  slug?: string | null
  description?: string | null
  status: string
  rules?: Record<string, any> | null
  start_at?: string | null
  end_at?: string | null
  prizes?: LotteryPrize[]
  prizes_count?: number
  draw_logs_count?: number
}

export interface DrawResult {
  result: 'win' | 'miss' | 'blacklist' | string
  prize?: LotteryPrize | null
  log?: Record<string, any> | null
}

/** 进行中的抽奖活动列表 */
export async function getLotteryActivities(): Promise<LotteryActivityVO[]> {
  return request({ url: '/my/lottery', method: 'GET' })
}

/** 抽奖活动详情（含奖品） */
export async function getLotteryActivity(activityId: number | string): Promise<LotteryActivityVO> {
  return request({ url: `/my/lottery/${activityId}`, method: 'GET' })
}

/** 执行抽奖 */
export async function drawLottery(activityId: number | string): Promise<DrawResult> {
  return request({ url: `/my/lottery/${activityId}/draw`, method: 'POST' })
}

/** 我在某抽奖活动下的记录 */
export async function getMyLotteryLogs(activityId: number | string): Promise<any[]> {
  return request({ url: `/my/lottery/${activityId}/logs`, method: 'GET' })
}

// ==================== 投票 ====================

export interface VoteOptionVO {
  vote_option_id: number | string
  title: string
  image?: string | null
  description?: string | null
  vote_count: number
  percentage?: number
  sort_order?: number
}

export interface VoteVO {
  vote_id: number | string
  title: string
  description?: string | null
  vote_type: 'single' | 'multiple' | string
  status: string
  start_at?: string | null
  end_at?: string | null
  total_votes: number
  show_result: boolean
  show_rank: boolean
  created_at?: string
  options?: VoteOptionVO[]
}

export interface VoteRankingVO {
  vote_id: number | string
  title: string
  total_votes: number
  ranking: Array<{
    rank: number
    option_id: number | string
    title: string
    image?: string | null
    vote_count: number
    percentage?: number
  }>
}

/** 进行中的投票列表 */
export async function getVotes(): Promise<VoteVO[]> {
  return request({ url: '/my/voting', method: 'GET' })
}

/** 投票详情（含选项） */
export async function getVoteDetail(voteId: number | string): Promise<VoteVO> {
  return request({ url: `/my/voting/${voteId}`, method: 'GET' })
}

/** 执行投票 */
export async function castVote(
  voteId: number | string,
  optionIds: Array<number | string>,
): Promise<any[]> {
  return request({
    url: `/my/voting/${voteId}/cast`,
    method: 'POST',
    data: { option_ids: optionIds },
  })
}

/** 投票排行榜 */
export async function getVoteRanking(voteId: number | string): Promise<VoteRankingVO> {
  return request({ url: `/my/voting/${voteId}/ranking`, method: 'GET' })
}

// ==================== 公告 ====================

export interface AnnouncementVO {
  id: string
  title?: string | null
  message: string
  level: 'info' | 'warning' | 'error' | string
  created_at?: string | null
}

/** 系统公告（游客可读，登录后同样可见） */
export async function getAnnouncements(limit = 10): Promise<AnnouncementVO[]> {
  return request({ url: '/announcements', method: 'GET', data: { limit }, auth: 'optional' })
}
