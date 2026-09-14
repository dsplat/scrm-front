/// <reference types="@dcloudio/types" />
/**
 * uni-app HTTP 请求封装
 * - 自动注入 Bearer Token
 * - 统一错误处理
 * - 支持 /api/v1 前缀
 */

// BASE_URL 默认同源 /api/v1（H5 不设 env 行为不变）；
// 小程序构建经 Console 注入 VITE_API_BASE=https://{租户API域}（见 build:mp-weixin）
const BASE_URL = import.meta.env.VITE_API_BASE || '/api/v1'

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: Record<string, any>
  needAuth?: boolean
  /** 自定义 token（覆盖默认 user_token，用于 pending token 场景） */
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

async function request<T = any>(options: RequestOptions): Promise<T> {
  const { url, method = 'GET', data, needAuth = true, customToken } = options

  const header: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (customToken) {
    header['Authorization'] = `Bearer ${customToken}`
  } else if (needAuth) {
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
          clearToken()
          uni.reLaunch({ url: '/pages/auth/login' })
          reject(new Error('未登录或登录已过期'))
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

export { request, getToken, setToken, clearToken }
