/**
 * @scrm/shared/user-core
 *
 * 框架 @dsplat/user-core 的 uni-app 端桥接层。
 * 提供类型定义 + 适配器初始化 + token 管理。
 */

export * from './types'
export {
  initUserCore,
  configure,
  getConfig,
  getToken,
  setToken,
  clearToken,
  BASE_URL,
  TOKEN_KEY,
} from './adapter'
