/**
 * @dsplat/user-core uni-app 适配器
 *
 * 将 user-core 的请求适配器配置为 uni.request，
 * 使 H5 / 小程序 / App 端均可复用框架的认证与用户中心逻辑。
 *
 * 使用方式：
 *   import { initUserCore } from '@scrm/shared/user-core'
 *   initUserCore()  // 在 App.vue onLaunch 或 main.ts 中调用一次
 */

// uni-app 全局对象声明（由宿主 app 提供实际实现）
declare const uni: any

export interface RequestAdapterOptions {
  method?: string
  body?: unknown
  headers?: Record<string, string>
}

export interface UserCoreConfig {
  request: (url: string, options?: RequestAdapterOptions) => Promise<unknown>
  baseURL?: string
  getToken?: () => string | null
  setToken?: (token: string) => void
  clearToken?: () => void
}

// 简化版 configure（与框架 user-core 的 configure 逻辑一致）
let _config: UserCoreConfig | null = null

export function configure(config: UserCoreConfig): void {
  _config = config
}

export function getConfig(): UserCoreConfig {
  if (!_config) throw new Error('[user-core] Not configured. Call initUserCore() first.')
  return _config
}

const TOKEN_KEY = 'scrm_token'
const BASE_URL = '/api/v1'

/** uni.request 适配器实现 */
function uniRequestAdapter(url: string, options?: any): Promise<unknown> {
  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method: options?.method || 'GET',
      data: options?.body,
      header: options?.headers || {},
      success: (res: any) => {
        if (res.statusCode === 401) {
          clearToken()
          // 触发全局登出事件，由业务层处理跳转
          uni.$emit('auth:expired')
          reject(new Error('登录已过期'))
          return
        }
        resolve(res.data)
      },
      fail: (err: any) => {
        reject(new Error(err.errMsg || '网络请求失败'))
      },
    })
  })
}

export function getToken(): string | null {
  return uni.getStorageSync(TOKEN_KEY) || null
}

export function setToken(token: string): void {
  uni.setStorageSync(TOKEN_KEY, token)
}

export function clearToken(): void {
  uni.removeStorageSync(TOKEN_KEY)
}

/**
 * 初始化 user-core（应用启动时调用一次）
 */
export function initUserCore(): void {
  configure({
    request: uniRequestAdapter,
    baseURL: BASE_URL,
    getToken,
    setToken,
    clearToken,
  })
}

export { BASE_URL, TOKEN_KEY }
