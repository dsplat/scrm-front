import { currentPayChannel } from '@scrm/h5-commerce'
import { request } from '../utils/request'

// C4：H5 活动链路已全量迁移至统一 Activity 模块（旧 /scrm/events/* 与
// /scrm/registration-orders/* 已软下线返回 410）。

// 获取活动详情
export function getEventDetail(eventId: string | number) {
  return request({ url: `/scrm/activities/${eventId}`, method: 'GET' })
}

// 获取活动票种
export function getEventTicketTypes(eventId: string | number) {
  return request({ url: `/scrm/activities/${eventId}/ticket-types`, method: 'GET' })
}

// 报名（创建订单）：报名人由后端从登录态取，不传 user_id；
// 多人报名传 attendees，数量以参与者数为准，明细存订单 metadata
export function registerEvent(
  eventId: string | number,
  data: {
    ticket_type_id: number
    quantity?: number
    attendees?: Array<{ name: string; phone?: string; age?: number; relation?: string }>
  },
) {
  return request({ url: `/scrm/activities/${eventId}/register`, method: 'POST', data })
}

// 发起支付（活动报名订单走 Activity 模块支付入口，含订单归属校验）
export function payOrder(orderNo: string, openid?: string) {
  // 小程序端显式上报 wechat_miniapp 通道（后端据此按小程序 appid/openid 下单）；
  // H5 留空交由后端自动判定（租户 JSAPI 开关 + 微信 UA）
  const channel = currentPayChannel()
  return request({
    url: `/scrm/activities/orders/${orderNo}/pay`,
    method: 'POST',
    data: { ...(openid ? { openid } : {}), ...(channel ? { channel } : {}) },
  })
}

// 获取订单详情（统一订单中心）
export function getOrderDetail(orderNo: string) {
  return request({ url: `/scrm/orders/${orderNo}`, method: 'GET' })
}

// 提交评价
export function submitEvaluation(
  eventId: string | number,
  data: {
    overall_score: number
    content_score?: number
    venue_score?: number
    service_score?: number
    comment?: string
    tags?: string[]
  },
) {
  return request({ url: `/scrm/activities/${eventId}/evaluations`, method: 'POST', data })
}

// 获取评价列表
export function getEvaluations(eventId: string | number, params?: { per_page?: number }) {
  return request({ url: `/scrm/activities/${eventId}/evaluations`, method: 'GET', data: params })
}

// 渲染活动推广海报（新体系：取该活动绑定的分销海报 → 以登录身份渲染专属海报）
export async function renderEventPoster(eventId: string | number) {
  const list: any = await request({ url: '/scrm/my/posters', method: 'GET' })
  const posters: any[] = Array.isArray(list) ? list : (list?.data ?? [])
  const poster = posters.find((p) => String(p.activity_id) === String(eventId)) ?? posters[0]
  if (!poster?.poster_id) {
    throw new Error('该活动暂无可分享的推广海报')
  }
  return request({ url: `/scrm/my/posters/${poster.poster_id}/render`, method: 'POST', data: {} })
}
