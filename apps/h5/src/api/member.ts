/**
 * C端会员 API — 积分余额、流水
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

/** 我的积分余额 */
export async function getMyPointsBalance(): Promise<PointsBalance> {
  return request({
    url: '/scrm/member/points/balance',
    method: 'GET',
  })
}

/** 我的积分流水 */
export async function getMyPointsFlow(
  type?: string,
): Promise<{ items: PointsFlowItem[]; total: number }> {
  return request({
    url: `/scrm/member/points/flow${type ? `?type=${type}` : ''}`,
    method: 'GET',
  })
}
