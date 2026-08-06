/// <reference types="@dcloudio/types" />
/**
 * @scrm/h5-commerce 运行时配置
 *
 * - scrm-platform：configureH5Commerce({ apiPrefix: 'scrm' })（生产 URL 零变更）
 * - 派生新商城：不配置即可（框架 5 模块默认 route_prefix 为空）
 */

export interface CommercePagesConfig {
  /** 商品详情页路径（uni-app pages.json 注册路径） */
  shopDetail: string
  /** 课程详情页路径 */
  courseDetail: string
  /** 课程学习页路径 */
  courseLearn: string
}

export interface CommerceConfig {
  /** API 基础路径 */
  apiBase: string
  /** 交易域 API 路由前缀（如 'scrm'），框架默认路由时为空字符串 */
  apiPrefix: string
  /** 登录 token 存储键 */
  tokenKey: string
  /** 401 未登录跳转页 */
  loginPage: string
  /** 无上级页面时 NavBar 返回的兜底首页（tabbar 页） */
  homePage: string
  /** C 端页面路由路径 */
  pages: CommercePagesConfig
}

const config: CommerceConfig = {
  apiBase: '/api/v1',
  apiPrefix: '',
  tokenKey: 'user_token',
  loginPage: '/pages/auth/login',
  homePage: '/pages/index/index',
  pages: {
    shopDetail: '/pages/shop/detail',
    courseDetail: '/pages/course/detail',
    courseLearn: '/pages/course/learn',
  },
}

/** 覆盖默认配置（部分合并） */
export function configureH5Commerce(partial: Partial<CommerceConfig>): void {
  Object.assign(config, partial)
  if (partial.pages) {
    Object.assign(config.pages, partial.pages)
  }
}

export function getCommerceConfig(): CommerceConfig {
  return config
}

/** 拼接交易域 API 相对路径：'/' + [apiPrefix, ...path] */
export function commerceApiUrl(path: string): string {
  const prefix = config.apiPrefix.replace(/^\/+|\/+$/g, '')
  const clean = path.replace(/^\/+/, '')
  return `/${prefix ? `${prefix}/` : ''}${clean}`
}

/** 跳转商品详情 */
export function navShopDetail(id: number): void {
  uni.navigateTo({ url: `${config.pages.shopDetail}?id=${id}` })
}

/** 课程详情页 URL（含 query，供 redirectTo 使用） */
export function courseDetailUrl(id: number): string {
  return `${config.pages.courseDetail}?id=${id}`
}

/** 跳转课程详情页 */
export function navCourseDetail(id: number): void {
  uni.navigateTo({ url: courseDetailUrl(id) })
}

/** 跳转课程学习页 */
export function navCourseLearn(id: number): void {
  uni.navigateTo({ url: `${config.pages.courseLearn}?id=${id}` })
}
