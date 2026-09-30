/**
 * 邀请码注册门禁 API
 *
 * 对应框架 Auth 模块三处消费面：
 *  - 公开校验：POST /api/v1/auth/invite-code/verify（注册前实时校验，限流 20/min）
 *  - 用户端：GET /api/v1/app/invite-code（我的专属码，懒创建）
 *  - 用户端：GET /api/v1/app/invite-code/usages（我邀请的记录，老带新归因）
 */
import { request } from '../utils/request'

/** 我的专属邀请码 */
export interface MyInviteCode {
  invite_code_id: number
  code: string
  max_uses: number
  used_count: number
  expires_at: string | null
}

/** 一条邀请归因记录 */
export interface InviteUsage {
  invite_code_usage_id: number
  invitee_user_id: number
  invitee_name?: string | null
  channel?: string | null
  created_at: string
}

export interface InviteUsagePage {
  data: InviteUsage[]
  total: number
  current_page: number
  last_page: number
}

/**
 * 注册前实时校验邀请码是否有效（公开端点）
 *
 * 恒返回 200，valid 字段区分有效/无效，避免枚举探测（配合服务端限流）。
 */
export async function verifyInviteCode(code: string): Promise<{ valid: boolean; message: string }> {
  return request({
    url: '/auth/invite-code/verify',
    method: 'POST',
    data: { code },
    auth: 'none',
  })
}

/** 获取当前用户的专属邀请码（首次调用懒创建，无限次） */
export async function getMyInviteCode(): Promise<MyInviteCode> {
  return request({
    url: '/app/invite-code',
    method: 'GET',
  })
}

/** 获取我邀请的用户记录（分页） */
export async function getMyInviteUsages(page = 1): Promise<InviteUsagePage> {
  return request({
    url: '/app/invite-code/usages',
    method: 'GET',
    data: { page },
  })
}
