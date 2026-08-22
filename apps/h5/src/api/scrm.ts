/**
 * C端 SCRM API — 活码、客服、活动、反馈
 *
 * 活动域已统一：Campaign/Event 旧 API 已软下线(410)，一律走 Activity 模块
 * （/scrm/activities，type 区分 marketing/offline_event/hybrid/course/training_camp）。
 */
import { request } from '../utils/request'

/** 活码扫码记录 */
export async function recordLiveCodeScan(liveCodeId: string) {
  return request({
    url: `/scrm/live-codes/${liveCodeId}/scan`,
    method: 'POST',
    needAuth: false,
  })
}

/** 获取活码信息 */
export async function getLiveCodeInfo(liveCodeId: string) {
  return request({
    url: `/scrm/live-codes/${liveCodeId}`,
    needAuth: false,
  })
}

/** 联系 AI 客服 — 启动 Agent 对话 */
export async function startAgentConversation(agentId: number, message: string) {
  return request({
    url: `/scrm/agents/${agentId}/conversations`,
    method: 'POST',
    data: { message },
  })
}

/** 获取活动列表（统一 Activity 模块，需登录；列表页默认只展示可参与状态） */
export async function getActivityList(params: Record<string, unknown> = {}) {
  return request({
    url: '/scrm/activities',
    method: 'GET',
    data: params,
  })
}

/** 提交意见反馈 */
export async function submitFeedback(content: string, contact?: string) {
  return request({
    url: '/scrm/feedback',
    method: 'POST',
    data: { content, contact },
  })
}

/** 获取常见问题 */
export async function getFAQs() {
  return request({
    url: '/scrm/faqs',
    needAuth: false,
  })
}
