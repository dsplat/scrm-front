/// <reference types="@dcloudio/types" />
/**
 * @scrm/h5-commerce HTTP 请求封装（自持，不依赖宿主 app）
 * - 三态认证：required（默认，带 token）/ optional（有 token 则带，过期按游客）/ none（不带 token）；存储键可配置，默认 user_token
 * - 401 分叉：required 携带 redirect 跳登录页（保留页面栈，路径可配置）；optional/none 清 token 后 reject，不跳转
 * - URL 前缀经 commerceApiUrl 拼接（apiBase + apiPrefix）
 */
import { getCommerceConfig, commerceApiUrl } from './config'

/** 认证级别：required=需登录（401 引导登录）；optional=有 token 则带（401 按游客降级）；none=完全匿名 */
type AuthLevel = 'required' | 'optional' | 'none'

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: Record<string, any>
  /** 认证级别，默认 required */
  auth?: AuthLevel
}

interface ApiResponse<T = any> {
  success: boolean
  data: T
  message?: string
}

/** 结构化错误：statusCode 供调用方分支（如 401 按游客降级展示） */
interface CommerceError extends Error {
  statusCode?: number
}

/** 401 引导登录去重时间窗（并发多请求 401 只跳一次） */
const LOGIN_REDIRECT_DEDUP_MS = 1500
let lastLoginRedirectAt = 0

/** 当前页 route+query（登录后回跳的 redirect 参数） */
function currentPageUrl(): string {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  if (!page) return ''
  const query = Object.keys(page.options || {})
    .map((key) => `${key}=${encodeURIComponent(page.options[key])}`)
    .join('&')
  return `/${page.route || ''}${query ? `?${query}` : ''}`
}

/**
 * 401 → 跳登录页：navigateTo 保留页面栈并携带 redirect（登录成功后回原页），
 * 并发多请求 401 只跳一次
 */
function redirectToLogin(loginPage: string): void {
  const now = Date.now()
  if (now - lastLoginRedirectAt < LOGIN_REDIRECT_DEDUP_MS) return
  lastLoginRedirectAt = now

  const redirect = currentPageUrl()
  if (redirect.startsWith(loginPage)) return

  uni.navigateTo({
    url: redirect ? `${loginPage}?redirect=${encodeURIComponent(redirect)}` : loginPage,
    // 页面栈满等极端场景兜底，保证不落孤儿页
    fail: () => uni.reLaunch({ url: loginPage }),
  })
}

async function request<T = any>(options: RequestOptions): Promise<T> {
  const cfg = getCommerceConfig()
  const { url, method = 'GET', data, auth = 'required' } = options

  const header: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (auth !== 'none') {
    // required / optional：有 token 则带（optional 过期按游客处理）
    const token = uni.getStorageSync(cfg.tokenKey)
    if (token) {
      header['Authorization'] = `Bearer ${token}`
    }
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url: `${cfg.apiBase}${commerceApiUrl(url)}`,
      method,
      data,
      header,
      success: (res) => {
        const body = res.data as ApiResponse<T>

        if (res.statusCode === 401) {
          uni.removeStorageSync(cfg.tokenKey)
          if (auth === 'required') {
            redirectToLogin(cfg.loginPage)
          }
          // optional/none：token 过期清理后按游客 reject（statusCode=401 供调用方分支），不跳转
          const err = new Error(body?.message || '未登录或登录已过期') as CommerceError
          err.statusCode = 401
          reject(err)
          return
        }

        if (res.statusCode >= 400) {
          const err = new Error(body?.message || `请求失败 (${res.statusCode})`) as CommerceError
          err.statusCode = res.statusCode
          reject(err)
          return
        }

        resolve(body.data !== undefined ? body.data : (body as any))
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '网络请求失败'))
      },
    })
  })
}

export { request }
export type { RequestOptions, CommerceError, AuthLevel }
