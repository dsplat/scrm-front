import axios, { type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'

export interface ApiResponse<T = unknown> {
  data: T
  message?: string
  meta?: {
    current_page?: number
    per_page?: number
    total?: number
  }
  total?: number
}

/**
 * 自定义 HTTP 实例类型
 *
 * Axios response interceptor 已做 response.data 解包，
 * 实际返回 ApiResponse<T> 而非 AxiosResponse<T>。
 * 此类型让 TypeScript 正确推断返回值。
 */
interface HttpInstance {
  get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>>
  post<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>>
  put<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>>
  patch<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>>
  delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>>
}

const instance = axios.create({
  baseURL: '/api/v1',
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

instance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('scrm_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

instance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('scrm_token')
      window.location.href = '/scrm-console/login'
    }
    return Promise.reject(error)
  },
)

const http = instance as unknown as HttpInstance
export { http }
