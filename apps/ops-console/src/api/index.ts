/**
 * ops-console API 封装层
 * 统一调用 @scrm/shared 的 HTTP 客户端
 */
export { http } from '@scrm/shared'

export * as authApi from './auth'
export * as channelApi from './channels'
export * as customerApi from './customers'
export * as agentApi from './agents'
export * as dashboardApi from './dashboard'
