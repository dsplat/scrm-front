import { request } from '../utils/request'

export interface CheckInActivity {
  check_in_activity_id: number
  title: string
  description: string | null
  cover_url: string | null
  start_date: string
  end_date: string | null
  status: 'draft' | 'active' | 'paused' | 'ended'
  total_participants: number
}

export interface CheckInRecord {
  check_in_record_id: number
  user_id: number
  check_in_date: string
  streak_count: number
  metadata: { image_url?: string; note?: string } | null
}

export interface CheckInLeaderboardItem {
  user_id: number
  total_check_ins: number
  max_streak: number
}

// 获取进行中的打卡活动列表
export function getCheckInActivities(params?: { status?: string; per_page?: number }) {
  return request<{ data: CheckInActivity[]; total: number }>({
    url: '/scrm/check-in-activities',
    method: 'GET',
    data: params,
  })
}

// 获取打卡活动详情
export function getCheckInActivity(activityId: string | number) {
  return request<CheckInActivity>({
    url: `/scrm/check-in-activities/${activityId}`,
    method: 'GET',
  })
}

// 打卡（user_id 由后端从登录态解析，无需传入）
export function checkIn(activityId: string | number, data?: { note?: string }) {
  return request<CheckInRecord>({
    url: `/scrm/check-in-activities/${activityId}/check-in`,
    method: 'POST',
    data: data || {},
  })
}

// 获取我的打卡记录（后端强制限定为当前用户）
export function getCheckInRecords(
  activityId: string | number,
  params?: { start_date?: string; end_date?: string; per_page?: number },
) {
  return request<{ data: CheckInRecord[]; total: number }>({
    url: `/scrm/check-in-activities/${activityId}/records`,
    method: 'GET',
    data: params,
  })
}

// 获取打卡排行榜
export function getCheckInLeaderboard(activityId: string | number) {
  return request<CheckInLeaderboardItem[]>({
    url: `/scrm/check-in-activities/${activityId}/leaderboard`,
    method: 'GET',
  })
}

// 获取活动统计
export function getCheckInStats(activityId: string | number) {
  return request<{
    total_records: number
    unique_participants: number
    today_check_ins: number
    max_streak: number
  }>({
    url: `/scrm/check-in-activities/${activityId}/stats`,
    method: 'GET',
  })
}
