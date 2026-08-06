/**
 * C端商城 API — 商品浏览 / 统一下单 / 支付 / 我的订单
 * （Product + Order 框架模块 C 端端点）
 */
import { request } from '../request'

export interface ShopProduct {
  product_id: number
  name: string
  description?: string | null
  price: string | number
  stock: number
  status: string
  type?: string
  sale_mode?: 'cash' | 'points' | 'mixed'
  media_assets?: { type?: string; url?: string }[] | null
}

export interface ShopSku {
  sku_id: number
  product_id: number
  name: string
  spec_attrs?: Record<string, string> | null
  price: string | number
  points_price: number
  stock: number
  status: string
}

export interface ShopDetailResult {
  product: ShopProduct
  skus: ShopSku[]
}

export interface OrderItemPayload {
  sku_id?: number
  item_type?: string
  ref_id?: number
  item_name?: string
  unit_price?: number
  points_unit_price?: number
  quantity?: number
}

export interface CreateOrderPayload {
  order_type?: 'registration' | 'product' | 'course' | 'exchange'
  pay_method: 'cash' | 'points' | 'mixed'
  points_to_use?: number
  items: OrderItemPayload[]
  source?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export interface OrderVO {
  order_id: number
  order_no: string
  order_type: string
  total_amount: string | number
  points_amount: number
  pay_method: string
  status: 'pending' | 'paid' | 'refunded' | 'cancelled'
  paid_at?: string | null
  created_at: string
  items?: any[]
}

/** 商城商品列表（仅上架） */
export async function getShopProducts(): Promise<{ data: ShopProduct[]; total: number }> {
  return request({
    url: 'shop/products',
    method: 'GET',
  })
}

/** 商城商品详情（含 SKU） */
export async function getShopProductDetail(id: number): Promise<ShopDetailResult> {
  return request({
    url: `shop/products/${id}`,
    method: 'GET',
  })
}

/** 创建统一订单 */
export async function createOrder(payload: CreateOrderPayload): Promise<OrderVO> {
  return request({
    url: 'orders',
    method: 'POST',
    data: payload,
  })
}

/** 发起支付（积分支付即时完成；现金返回网关参数） */
export async function payOrder(orderNo: string, openid?: string): Promise<Record<string, unknown>> {
  return request({
    url: `orders/${orderNo}/pay`,
    method: 'POST',
    data: openid ? { openid } : {},
  })
}

/** 我的订单 */
export async function getMyOrders(params?: {
  order_type?: string
  status?: string
  per_page?: number
}): Promise<{ data: OrderVO[]; total: number }> {
  const query: string[] = []
  if (params?.order_type) query.push(`order_type=${params.order_type}`)
  if (params?.status) query.push(`status=${params.status}`)
  if (params?.per_page) query.push(`per_page=${params.per_page}`)
  return request({
    url: `my/orders${query.length ? `?${query.join('&')}` : ''}`,
    method: 'GET',
  })
}
