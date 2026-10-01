/**
 * C端 SCRM API — 活码、客服、活动、反馈
 *
 * 活动域已统一：Campaign/Event 旧 API 已软下线(410)，一律走 Activity 模块
 * （/biz/activities，type 区分 marketing/offline_event/hybrid/course/training_camp）。
 */
import { request } from '../utils/request'

/** 活码扫码记录 */
export async function recordLiveCodeScan(liveCodeId: string) {
  return request({
    url: `/biz/live-codes/${liveCodeId}/scan`,
    method: 'POST',
    auth: 'none',
  })
}

/** 获取活码信息 */
export async function getLiveCodeInfo(liveCodeId: string) {
  return request({
    url: `/biz/live-codes/${liveCodeId}`,
    auth: 'none',
  })
}

/** 联系 AI 客服 — 启动 Agent 对话 */
export async function startAgentConversation(agentId: number, message: string) {
  return request({
    url: `/biz/agents/${agentId}/conversations`,
    method: 'POST',
    data: { message },
  })
}

/** 获取活动列表（统一 Activity 模块；游客可浏览公开状态，登录后可见个性化） */
export async function getActivityList(params: Record<string, unknown> = {}) {
  return request({
    url: '/biz/activities',
    method: 'GET',
    data: params,
    auth: 'optional',
  })
}

/** 提交意见反馈（匿名可提） */
export async function submitFeedback(content: string, contact?: string) {
  return request({
    url: '/biz/feedback',
    method: 'POST',
    data: { content, contact },
    auth: 'optional',
  })
}

/** 智能推荐卡片（optional：登录带 token 出个性化券/会话，游客只出公开活动） */
export interface RecommendationCard {
  type: 'coupon' | 'activity' | 'message'
  title: string
  subtitle: string
  action_url: string
}

export async function getRecommendations(): Promise<RecommendationCard[]> {
  const data = await request<RecommendationCard[]>({
    url: '/biz/recommendations',
    auth: 'optional',
  })
  return Array.isArray(data) ? data : []
}

/** 获取常见问题 */
export async function getFAQs() {
  return request({
    url: '/biz/faqs',
    auth: 'none',
  })
}

/**
 * 我的证书记录（结课/打卡达标/手动颁发）
 *
 * user_id 由后端从登录态解析（C 端只能查自己），前端不传，杜绝越权。
 */
export async function getMyCertificates() {
  return request({
    url: '/biz/certificates/records',
    method: 'GET',
  })
}
