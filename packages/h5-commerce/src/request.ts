/// <reference types="@dcloudio/types" />
/**
 * @scrm/h5-commerce HTTP 请求封装（自持，不依赖宿主 app）
 * - 自动注入 Bearer Token（存储键可配置，默认 user_token）
 * - 401 清 token 并跳转登录页（路径可配置）
 * - URL 前缀经 commerceApiUrl 拼接（apiBase + apiPrefix）
 */
import { getCommerceConfig, commerceApiUrl } from './config'

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

async function request<T = any>(options: RequestOptions): Promise<T> {
  const cfg = getCommerceConfig()
  const { url, method = 'GET', data, needAuth = true } = options

  const header: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (needAuth) {
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
          uni.reLaunch({ url: cfg.loginPage })
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

export { request }
