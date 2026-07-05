/// <reference types="@dcloudio/types" />
/**
 * uni-app HTTP 请求封装
 * - 自动注入 Bearer Token
 * - 统一错误处理
 * - 支持 /api/v1 前缀
 */

const BASE_URL = '/api/v1'

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: Record<string, any>
  needAuth?: boolean
}

interface ApiResponse<T = any> {
  success: boolean
  data: T
  message?: string
}

function getToken(): string | null {
  return uni.getStorageSync('scrm_token') || null
}

function setToken(token: string): void {
  uni.setStorageSync('scrm_token', token)
}

function clearToken(): void {
  uni.removeStorageSync('scrm_token')
}

async function request<T = any>(options: RequestOptions): Promise<T> {
  const { url, method = 'GET', data, needAuth = true } = options

  const header: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (needAuth) {
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
          uni.navigateTo({ url: '/pages/index/index' })
          reject(new Error('未登录或登录已过期'))
          return
        }

        if (res.statusCode >= 400) {
          reject(new Error(body.message || `请求失败 (${res.statusCode})`))
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
