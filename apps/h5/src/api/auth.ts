/**
 * C端用户认证 API
 *
 * 类型定义与框架 @dsplat/user-core 保持同步
 * 后续可通过 @scrm/shared/user-core 统一引用
 */
import { request, setToken, clearToken } from '../utils/request'

export interface UserInfo {
  user_id: number
  name: string
  email: string
  phone?: string
  avatar?: string
  email_verified_at?: string | null
}

export interface LoginResult {
  user: UserInfo
  tenant_id?: number
  auth_token: string
  refresh_token?: string
  auth_token_expires_in?: number
}

export interface MfaRequiredResult {
  mfa_required: true
  user_id: number
  available_types: string[]
}

export type LoginResponse = LoginResult | MfaRequiredResult

/**
 * 邮箱密码登录
 */
export async function emailLogin(email: string, password: string): Promise<LoginResponse> {
  const result = await request<LoginResponse>({
    url: '/auth/login',
    method: 'POST',
    data: { email, password },
    needAuth: false,
  })

  // 非 MFA 情况，直接存 token
  if ('auth_token' in result) {
    setToken(result.auth_token)
  }

  return result
}

/**
 * 邮箱注册
 */
export async function emailRegister(data: {
  name: string
  email: string
  password: string
  password_confirmation: string
}): Promise<LoginResult> {
  const result = await request<LoginResult>({
    url: '/auth/register',
    method: 'POST',
    data,
    needAuth: false,
  })

  if (result.auth_token) {
    setToken(result.auth_token)
  }

  return result
}

/**
 * 获取当前用户信息
 */
export async function getMe(): Promise<{ user: UserInfo; tenant_id?: number }> {
  return request({
    url: '/auth/me',
    method: 'GET',
  })
}

/**
 * 更新个人资料
 */
export async function updateProfile(data: { name?: string; avatar?: string }): Promise<UserInfo> {
  return request({
    url: '/auth/profile',
    method: 'PUT',
    data,
  })
}

/**
 * 修改密码
 */
export async function changePassword(data: {
  current_password: string
  password: string
  password_confirmation: string
}): Promise<void> {
  return request({
    url: '/auth/password',
    method: 'PUT',
    data,
  })
}

/**
 * 登出
 */
export async function logout(): Promise<void> {
  try {
    await request({ url: '/auth/logout', method: 'POST' })
  } finally {
    clearToken()
  }
}

/**
 * MFA 验证
 */
export async function mfaVerify(userId: number, type: string, code: string): Promise<LoginResult> {
  const result = await request<LoginResult>({
    url: '/auth/mfa/verify',
    method: 'POST',
    data: { user_id: userId, type, code },
    needAuth: false,
  })

  if (result.auth_token) {
    setToken(result.auth_token)
  }

  return result
}

/**
 * 微信 OAuth 登录（H5 / 小程序）
 */
export async function wechatLogin(code: string): Promise<LoginResult> {
  const result = await request<LoginResult>({
    url: '/auth/wechat/callback',
    method: 'POST',
    data: { code },
    needAuth: false,
  })

  if (result.auth_token) {
    setToken(result.auth_token)
  }

  return result
}

/**
 * H5 微信授权跳转
 */
export function redirectToWechatAuth(appId: string, redirectUri: string): void {
  const scope = 'snsapi_userinfo'
  const url = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&state=STATE#wechat_redirect`
  // #ifdef H5
  window.location.href = url
  // #endif
}

/**
 * 小程序登录
 */
export async function mpWeixinLogin(): Promise<LoginResult> {
  // @ts-ignore - uni is provided by uni-app runtime
  const { code } = await new Promise<UniApp.LoginRes>((resolve, reject) => {
    // @ts-ignore
    uni.login({
      provider: 'weixin',
      success: resolve,
      fail: reject,
    })
  })

  return wechatLogin(code)
}

/**
 * 检查登录状态
 */
export function isLoggedIn(): boolean {
  // @ts-ignore - uni is provided by uni-app runtime
  return !!uni.getStorageSync('scrm_token')
}
