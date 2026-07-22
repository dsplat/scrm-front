/// <reference types="@dcloudio/types" />
/**
 * 平台环境检测工具
 *
 * 用于 H5 多端适配：识别微信内置浏览器、获取当前租户域名等。
 */

/**
 * 是否微信内置浏览器（含企业微信）
 *
 * 微信 WebView 顶部自带原生导航栏（读取 document.title），
 * 此时页面应隐藏自绘导航栏，避免双重标题栏。
 */
export function isWechatBrowser(): boolean {
  // #ifdef H5
  return /MicroMessenger/i.test(window.navigator.userAgent)
  // #endif
  // #ifndef H5
  return false
  // #endif
}

/**
 * 获取当前访问域名（host）
 *
 * 用作租户初始化缓存的归属键：切换租户域名访问时缓存自动失效。
 */
export function getCurrentDomain(): string {
  // #ifdef H5
  return window.location.host
  // #endif
  // #ifndef H5
  return ''
  // #endif
}

/**
 * 设置浏览器/微信原生导航栏标题
 */
export function setDocumentTitle(title: string): void {
  // #ifdef H5
  if (title) {
    document.title = title
  }
  // #endif
}
