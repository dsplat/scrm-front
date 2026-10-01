/// <reference types="@dcloudio/types" />
/**
 * @scrm/h5-ai 运行时配置
 *
 * 与 @scrm/h5-commerce 同构：包内自持默认值，宿主在 main.ts 经 configureH5AI 覆盖。
 *
 * 双端差异（关键）：
 * - H5：与后端同源部署，streamEndpoint/availabilityEndpoint/apiBase 走相对路径即可；
 *   认证走 Authorization: Bearer {user_token}（uni storage），无 Cookie 会话。
 * - 小程序：wx.request 不认同域相对路径，apiBase/streamEndpoint 必须是绝对地址
 *   （构建期由 Console 注入 VITE_API_BASE 同源前缀）。
 *
 * 租户上下文：H5 平时靠请求域名识别租户（IdentifyTenant），但流式请求经 Node 引擎
 * 回环回调 PHP（http://127.0.0.1），域名丢失，故必须显式携带 X-Tenant-ID —— 该值
 * 从租户 bootstrap 缓存解析（getTenantId）。
 */

export interface AIConfig {
  /** REST 基址（availability/history），H5 相对 '/api/v1'，小程序绝对 */
  apiBase: string
  /** Node SSE 引擎对话入口，H5 相对 '/ai-stream/chat'，小程序绝对 */
  streamEndpoint: string
  /** 可用性探测端点 */
  availabilityEndpoint: string
  /** User Sanctum token 存储键（与 utils/request.ts 同源约定） */
  tokenKey: string
  /** 租户 bootstrap 缓存键，用于解析 X-Tenant-ID */
  tenantCacheKey: string
  /** 未登录跳转页 */
  loginPage: string
}

const config: AIConfig = {
  apiBase: '/api/v1',
  streamEndpoint: '/ai-stream/chat',
  availabilityEndpoint: '/api/v1/ai/assistant/availability',
  tokenKey: 'user_token',
  tenantCacheKey: 'scrm_tenant_bootstrap',
  loginPage: '/pages/auth/login',
}

/** 覆盖默认配置（浅合并） */
export function configureH5AI(partial: Partial<AIConfig>): void {
  Object.assign(config, partial)
}

export function getAIConfig(): AIConfig {
  return config
}

/** 读取当前登录 User 的 token（无则空串） */
export function getToken(): string {
  try {
    return (uni.getStorageSync(config.tokenKey) as string) || ''
  } catch {
    return ''
  }
}

/**
 * 读取当前租户 ID（字符串，无则空串）
 *
 * 从租户 bootstrap 缓存对象中取 tenant.tenant_id（apps/h5 store/tenant.ts 写入的
 * 结构）。流式请求须显式带此值作 X-Tenant-ID，否则 Node 回环回调 PHP 时无法识别租户。
 */
export function getTenantId(): string {
  try {
    const cached = uni.getStorageSync(config.tenantCacheKey) as
      { tenant?: { tenant_id?: number | string } } | ''
    const id = cached && typeof cached === 'object' ? cached.tenant?.tenant_id : undefined
    return id ? String(id) : ''
  } catch {
    return ''
  }
}
