/**
 * @scrm/h5-ai — 前台 H5 AI 助手共享包（BL-030a 基建）
 *
 * 内容：
 * - config：运行时配置（端点 / tokenKey / 租户缓存键）
 * - store：Vue 3 reactive 会话状态（消息/流式/续接/可用性/本地持久化）
 * - sse：SSE 传输平台适配层（H5 fetch / 小程序 enableChunked 预留）
 * - request：认证头组装 + 轻量 GET
 * - composables：useAssistantStream / usePageContext / useAvailability
 *
 * 后端零改动：复用 ai-streaming Node 哑管道引擎 /ai-stream/chat。
 * 越权防线在服务端 Agent::effectiveTools() 的 audience 过滤（User 仅见 audience='user'
 * 工具，且租户未开 mcp_user 时 fail-closed 不下发）。
 *
 * 宿主接入：
 * 1. main.ts 中 configureH5AI({ ... })（小程序端需给绝对 streamEndpoint/apiBase）
 * 2. 页面 import useAssistantStream/usePageContext/useAvailability 渲染对话或按钮
 */

export * from './config'
export * from './types'
export { assistantStore } from './store'
export { postStream, type StreamOptions, type StreamHandle } from './sse'
export { streamHeaders, isLoggedIn, requestJSON } from './request'
export { useAssistantStream } from './composables/useAssistantStream'
export { usePageContext, type PageContextExtras } from './composables/usePageContext'
export { useAvailability } from './composables/useAvailability'
