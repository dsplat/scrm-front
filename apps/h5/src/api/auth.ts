/**
 * C端微信 OAuth 登录
 * - 框架已有 Socialite 集成
 * - 获取 Token 后存本地，后续请求带 Bearer Token
 */
import { request, setToken } from '../utils/request'

interface LoginResult {
  token: string
  user: {
    id: number
    name: string
    avatar?: string
  }
}

/**
 * 微信 OAuth 登录
 * H5: 通过 URL 跳转获取 code
 * 小程序: 通过 uni.login 获取 code
 */
export async function wechatLogin(code: string): Promise<LoginResult> {
  const result = await request<LoginResult>({
    url: '/auth/wechat',
    method: 'POST',
    data: { code },
    needAuth: false,
  })

  setToken(result.token)
  return result
}

/**
 * H5 微信授权跳转
 */
export function redirectToWechatAuth(appId: string, redirectUri: string): void {
  const scope = 'snsapi_userinfo'
  const url = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&state=STATE#wechat_redirect`
  window.location.href = url
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
