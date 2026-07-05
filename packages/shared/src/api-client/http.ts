import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'

export interface ApiResponse<T = unknown> {
  data: T
  message?: string
  meta?: {
    current_page?: number
    per_page?: number
    total?: number
  }
}

const http: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

http.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('scrm_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

http.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('scrm_token')
      window.location.href = '/scrm-console/login'
    }
    return Promise.reject(error)
  },
)

export { http }
