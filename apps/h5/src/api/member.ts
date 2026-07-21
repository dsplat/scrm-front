/**
 * C端会员 API — 积分余额、流水、商城
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

export interface PointsProduct {
  id: number
  name: string
  points_cost: number
  stock?: number
  image?: string
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

/** 积分商城商品 */
export async function getPointsProducts(): Promise<PointsProduct[]> {
  return request({
    url: '/scrm/member/points/products',
    method: 'GET',
  })
}
