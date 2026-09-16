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
 * 是否移动设备浏览器（手机 / 平板，不区分是否微信内）
 *
 * 用于登录入口 UA 三分发（docs/wechat-carrier-model.md §1.2）：微信内 → 公众号
 * 网页授权；PC → 网站应用扫码；手机非微信 → 两个载体都不可用（公众号授权
 * 只认微信 UA；qrconnect 虽不拦移动 UA，但手机无法扫自己屏幕上的二维码），
 * 改渲染小程序导流或短信登录分支。
 *
 * 正则与后端 SocialiteService::isMobileUA() 完全同口径 —— 两端判定必须一致，
 * 否则前端渲染了入口、后端却 422 拒绝（或反之）。
 *
 * 已知局限：iPadOS 13+ 默认「请求桌面网站」，UA 伪装成 Macintosh 不含
 * Mobile/iPad，会被判为非移动 —— 该场景给二维码尚可接受（屏幕大，可用另一台
 * 手机扫），与后端保持一致不做特殊处理。
 */
export function isMobileBrowser(): boolean {
  // #ifdef H5
  return /Android|iPhone|iPod|iPad|Windows Phone|webOS|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(
    window.navigator.userAgent,
  )
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
