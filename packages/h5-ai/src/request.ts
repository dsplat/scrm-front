/// <reference types="@dcloudio/types" />
/**
 * REST 与认证头辅助
 *
 * - streamHeaders：为流式请求组装 Bearer + X-Tenant-ID（H5 无 Cookie 会话，靠这两头认证/识别租户）。
 * - requestJSON：availability / history 等普通 GET 的轻量封装（不复用宿主 utils/request，保持包自包含）。
 */
import { getAIConfig, getToken, getTenantId } from './config'

/**
 * 组装流式/REST 请求的认证与租户头。
 *
 * - Authorization：存在 user_token 时携带（H5 前台用户 Sanctum token）。
 * - X-Tenant-ID：存在租户 bootstrap 缓存时携带（流式经 Node 回环回调 PHP 必须显式带）。
 */
export function streamHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  const tenantId = getTenantId()
  if (tenantId) headers['X-Tenant-ID'] = tenantId
  return headers
}

/** 是否已登录（读到 user_token） */
export function isLoggedIn(): boolean {
  return getToken() !== ''
}

interface JSONResult {
  success?: boolean
  data?: any
  message?: string
}

/**
 * 轻量 GET JSON（走 apiBase 前缀）。失败 resolve 为 null，不抛出。
 *
 * availability/history 属"锦上添花"探测，遵循 AI 可选性铁律：任何异常静默降级。
 */
export function requestJSON(path: string): Promise<JSONResult | null> {
  const cfg = getAIConfig()
  const url = `${cfg.apiBase}${path.startsWith('/') ? '' : '/'}${path}`
  const header: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) header['Authorization'] = `Bearer ${token}`
  const tenantId = getTenantId()
  if (tenantId) header['X-Tenant-ID'] = tenantId

  return new Promise((resolve) => {
    uni.request({
      url,
      method: 'GET',
      header,
      timeout: 5000,
      success: (res: any) => resolve((res.data as JSONResult) ?? null),
      fail: () => resolve(null),
    })
  })
}
