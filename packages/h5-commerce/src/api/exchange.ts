/**
 * 积分兑换 API — 积分商城商品 / 兑换下单
 *
 * 端点位于项目层 Membership（积分虚拟支付渠道），
 * 派生新商城未实现该端点时调用将返回 404，页面区块自动置空。
 */
import { request } from '../request'

export interface PointsProduct {
  id: number
  name: string
  points_cost: number
  stock?: number
  image?: string
}

/** 积分商城商品 */
export async function getPointsProducts(): Promise<PointsProduct[]> {
  return request({
    url: 'member/points/products',
    method: 'GET',
  })
}

/** 积分兑换（创建统一订单，虚拟支付即时完成） */
export async function exchangePointsProduct(
  productId: number,
  quantity = 1,
): Promise<{ order_id: number; order_no: string; status: string }> {
  return request({
    url: 'member/points/exchange',
    method: 'POST',
    data: { product_id: productId, quantity },
  })
}
