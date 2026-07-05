/**
 * C端 SCRM API — 活码、客服、活动、反馈
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

/** 获取活动详情 */
export async function getCampaignDetail(campaignId: string) {
  return request({
    url: `/scrm/campaigns/${campaignId}`,
    needAuth: false,
  })
}

/** 参与活动 */
export async function joinCampaign(campaignId: string) {
  return request({
    url: `/scrm/campaigns/${campaignId}/participants`,
    method: 'POST',
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
