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
  phone?: string | null
  avatar?: string | null
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
 * 小程序登录桥用户结构（对齐后端 userToArray：role / email_verified）
 */
export interface MpWeixinUser {
  user_id: number
  name: string
  email: string
  avatar?: string | null
  role?: string | null
  email_verified?: boolean
}

/** 存量已验证用户：直接落地正式登录态 */
export interface MpWeixinLoginSuccess {
  needs_bindcontact: false
  user: MpWeixinUser
  tenant_id: number
  auth_token: string
}

/** 新壳用户（无已验证联系方式）：引导绑定页，pending token 不落地正式登录态 */
export interface MpWeixinLoginPending {
  needs_bindcontact: true
  pending_token: string
}

export type MpWeixinLoginResponse = MpWeixinLoginSuccess | MpWeixinLoginPending

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
 * 发送短信验证码（登录/注册）
 */
export async function sendSmsCode(phone: string): Promise<{ expires_in: number }> {
  return request({
    url: '/auth/sms/send-code',
    method: 'POST',
    data: { phone },
    needAuth: false,
  })
}

/**
 * 短信验证码登录（未注册自动注册）
 */
export async function smsLogin(phone: string, code: string): Promise<LoginResult> {
  const result = await request<LoginResult>({
    url: '/auth/sms/login',
    method: 'POST',
    data: { phone, code },
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
 * 取小程序 URL Link（手机非微信浏览器的微信登录出口）
 *
 * 必须服务端生成，前端拼不出来：微信官方约束 —— 仅非个人主体小程序开放、
 * 最长 30 天有效、50 万/日额度，后端按 path+query 缓存复用避免打爆额度。
 *
 * ⚠️ 导流非打通：跳过去后登录态留在小程序，不会回传浏览器 H5 会话
 * （跨 app 无回传通道），调用方文案需如实说明「将在微信小程序中继续」。
 *
 * path 必须显式指定：小程序首页 onMounted 仅在 isLoggedIn() 时拉数据（匿名展示
 * 空态），不触发 401 也就不会自动跳登录页。本入口出现在 H5 登录页，用户点了就是
 * 要登录，落空态首页等于把最后一步丢给用户自己找。
 *
 * 微信要求 path 不带前导斜杠（与 uni 路由 '/pages/...' 写法相反，勿「顺手统一」）。
 */
export async function getMiniappUrlLink(): Promise<{ url_link: string }> {
  return request({
    url: '/auth/wechat/miniapp/url-link',
    method: 'GET',
    needAuth: false,
    data: { path: 'pages/auth/login' },
  })
}

/**
 * 小程序微信登录（登录桥 POST /auth/mp-weixin/login）
 *
 * 仅 MP-WEIXIN 端使用：uni.login 换一次性 code → 服务端 jscode2session
 * （self 自建 / component 服务商代换双 driver）→ 存量已验证用户直接落
 * 正式 token；新壳用户（无已验证联系方式）返回 needs_bindcontact +
 * pending_token，由登录页编排跳转 bindcontact（与 H5 公众号 OAuth
 * pending 语义一致）。原 /auth/wechat/callback 为公众号 OAuth code
 * 语义，小程序不可用。
 */
export async function mpWeixinLogin(): Promise<MpWeixinLoginResponse> {
  // @ts-ignore - uni is provided by uni-app runtime
  const { code } = await new Promise<UniApp.LoginRes>((resolve, reject) => {
    // @ts-ignore
    uni.login({
      provider: 'weixin',
      success: resolve,
      fail: reject,
    })
  })

  const result = await request<MpWeixinLoginResponse>({
    url: '/auth/mp-weixin/login',
    method: 'POST',
    data: { code },
    needAuth: false,
  })

  // 正式登录态才落 user_token（pending token 不覆盖正式态，由登录页单独编排）
  if (result.needs_bindcontact === false) {
    setToken(result.auth_token)
  }

  return result
}

/**
 * 检查登录状态
 */
export function isLoggedIn(): boolean {
  // @ts-ignore - uni is provided by uni-app runtime
  return !!uni.getStorageSync('user_token')
}
