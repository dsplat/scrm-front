/**
 * SCRM 共享包统一导出
 *
 * 类型由 openapi-typescript-codegen 自动生成到 types/ 目录
 * 运行 `pnpm gen:types` 从 Swagger JSON 重新生成
 */

// 常量和枚举
export * from './constants/enums'

// HTTP 客户端
export { http, type ApiResponse } from './api-client/http'

// API 类型（由 openapi-typescript-codegen 自动生成）
// 当 types/ 目录有生成文件时自动导出
// 运行 pnpm gen:types 后会生成 types/index.ts

// 用户核心逻辑（框架 @dsplat/user-core 桥接）
export * as userCore from './user-core'
