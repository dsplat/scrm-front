import { request } from '../utils/request'

// 获取活动详情
export function getEventDetail(eventId: string | number) {
  return request({ url: `/scrm/events/${eventId}`, method: 'GET' })
}

// 获取活动票种
export function getEventTicketTypes(eventId: string | number) {
  return request({ url: `/scrm/events/${eventId}/ticket-types`, method: 'GET' })
}

// 报名（创建订单）
export function registerEvent(
  eventId: string | number,
  data: {
    ticket_type_id: number
    quantity?: number
    attendees?: Array<{ name: string; phone?: string; age?: number; relation?: string }>
  },
) {
  return request({ url: `/scrm/events/${eventId}/register`, method: 'POST', data })
}

// 发起支付
export function payOrder(orderNo: string, openid?: string) {
  return request({
    url: `/scrm/registration-orders/${orderNo}/pay`,
    method: 'POST',
    data: { openid },
  })
}

// 获取订单详情
export function getOrderDetail(orderNo: string) {
  return request({ url: `/scrm/registration-orders/${orderNo}`, method: 'GET' })
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
  return request({ url: `/scrm/events/${eventId}/evaluations`, method: 'POST', data })
}

// 获取评价列表
export function getEvaluations(eventId: string | number, params?: { per_page?: number }) {
  return request({ url: `/scrm/events/${eventId}/evaluations`, method: 'GET', data: params })
}
