/// <reference types="@dcloudio/types" />
/**
 * uni-app HTTP 请求封装
 * - 三态认证：required（默认，带 token）/ optional（有 token 则带，过期按游客）/ none（不带 token）
 * - 401 分叉：required 跳登录页并携带 redirect（保留页面栈）；optional/none 清 token 后 reject，不跳转
 * - 统一错误处理
 * - 支持 /api/v1 前缀
 */

// BASE_URL 默认同源 /api/v1（H5 不设 env 行为不变）；
// 小程序构建经 Console 注入 VITE_API_BASE=https://{租户API域}（见 build:mp-weixin）
const BASE_URL = import.meta.env.VITE_API_BASE || '/api/v1'

/** 认证级别：required=需登录（401 引导登录）；optional=有 token 则带（401 按游客降级）；none=完全匿名 */
type AuthLevel = 'required' | 'optional' | 'none'

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: Record<string, any>
  /** 认证级别，默认 required */
  auth?: AuthLevel
  /** 自定义 token（覆盖默认 user_token，用于 pending token 场景；401 由调用方自行处置，不跳登录） */
  customToken?: string
}

interface ApiResponse<T = any> {
  success: boolean
  data: T
  message?: string
  /** 业务错误码（如 bind 冲突 contact_conflict / pending_token_expired） */
  code?: string
  /** 业务错误附带的上下文（如冲突摘要 summary） */
  summary?: Record<string, any>
}

/** 结构化业务错误：message 供直接展示，code/summary 供流程分支（如 409 确认态） */
export interface ApiError extends Error {
  code?: string
  summary?: Record<string, any>
  statusCode?: number
}

function toApiError(body: ApiResponse, statusCode: number): ApiError {
  const err = new Error(body.message || `请求失败 (${statusCode})`) as ApiError
  err.code = body.code
  err.summary = body.summary
  err.statusCode = statusCode
  return err
}

function getToken(): string | null {
  return uni.getStorageSync('user_token') || null
}

function setToken(token: string): void {
  uni.setStorageSync('user_token', token)
}

function clearToken(): void {
  uni.removeStorageSync('user_token')
}

const LOGIN_PAGE = '/pages/auth/login'

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
 * 模块级时间戳去重，并发多请求 401 只跳一次
 */
function redirectToLogin(): void {
  const now = Date.now()
  if (now - lastLoginRedirectAt < LOGIN_REDIRECT_DEDUP_MS) return
  lastLoginRedirectAt = now

  const redirect = currentPageUrl()
  if (redirect.startsWith(LOGIN_PAGE)) return

  uni.navigateTo({
    url: redirect ? `${LOGIN_PAGE}?redirect=${encodeURIComponent(redirect)}` : LOGIN_PAGE,
    // 页面栈满等极端场景兜底，保证不落孤儿页
    fail: () => uni.reLaunch({ url: LOGIN_PAGE }),
  })
}

async function request<T = any>(options: RequestOptions): Promise<T> {
  const { url, method = 'GET', data, auth = 'required', customToken } = options

  const header: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (customToken) {
    header['Authorization'] = `Bearer ${customToken}`
  } else if (auth !== 'none') {
    // required / optional：有 token 则带（optional 过期按游客处理）
    const token = getToken()
    if (token) {
      header['Authorization'] = `Bearer ${token}`
    }
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url: `${BASE_URL}${url}`,
      method,
      data,
      header,
      success: (res) => {
        const body = res.data as ApiResponse<T>

        if (res.statusCode === 401) {
          // customToken（pending token 流程）不涉及本地登录态：原样抛业务错误由页面处置
          if (customToken) {
            reject(toApiError(body as ApiResponse, res.statusCode))
            return
          }

          clearToken()
          if (auth === 'required') {
            redirectToLogin()
          }
          // optional/none：token 过期清理后按游客 reject（statusCode=401 供调用方分支），不跳转
          const err = new Error(body?.message || '未登录或登录已过期') as ApiError
          err.statusCode = 401
          err.code = body?.code
          err.summary = body?.summary
          reject(err)
          return
        }

        if (res.statusCode >= 400) {
          reject(toApiError(body as ApiResponse, res.statusCode))
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

export { request, getToken, setToken, clearToken, redirectToLogin }
export type { AuthLevel }
