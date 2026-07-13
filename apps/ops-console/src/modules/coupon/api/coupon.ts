import { http, type ApiResponse } from '@scrm/shared'

export interface Coupon {
  id: number
  name: string
  type: 'cash' | 'discount' | 'free_shipping'
  value: number
  minAmount: number
  totalCount: number
  usedCount: number
  validityType: 'permanent' | 'period'
  validityStart: string
  validityEnd: string
  description: string
  status: number
  createdAt: string
  updatedAt: string
}

export interface CouponListParams {
  page: number
  pageSize: number
  name?: string
  type?: string
  status?: number
}

export interface CouponListResult {
  data: Coupon[]
  total: number
}

export interface CreateCouponData {
  name: string
  type: 'cash' | 'discount' | 'free_shipping'
  value: number
  minAmount?: number
  totalCount: number
  validityType: 'permanent' | 'period'
  validityStart?: string
  validityEnd?: string
  description?: string
  status: number
}

export interface UpdateCouponData {
  name?: string
  type?: 'cash' | 'discount' | 'free_shipping'
  value?: number
  minAmount?: number
  totalCount?: number
  validityType?: 'permanent' | 'period'
  validityStart?: string
  validityEnd?: string
  description?: string
  status?: number
}

function extractListResult<T>(res: ApiResponse<T[]>): { data: T[]; total: number } {
  return {
    data: res.data ?? [],
    total: res.meta?.total ?? res.total ?? 0,
  }
}

export async function getCouponList(params: CouponListParams): Promise<CouponListResult> {
  const res = await http.get<Coupon[]>('/scrm/coupons', { params })
  return extractListResult(res)
}

export async function getCouponDetail(id: number): Promise<Coupon> {
  const res = await http.get<Coupon>(`/scrm/coupons/${id}`)
  return res.data
}

export async function createCoupon(data: CreateCouponData): Promise<Coupon> {
  const res = await http.post<Coupon>('/scrm/coupons', data)
  return res.data
}

export async function updateCoupon(id: number, data: UpdateCouponData): Promise<Coupon> {
  const res = await http.put<Coupon>(`/scrm/coupons/${id}`, data)
  return res.data
}

export async function deleteCoupon(id: number): Promise<void> {
  await http.delete(`/scrm/coupons/${id}`)
}

export async function batchDeleteCoupons(ids: number[]): Promise<void> {
  await http.post('/scrm/coupons/batch-delete', { ids })
}
