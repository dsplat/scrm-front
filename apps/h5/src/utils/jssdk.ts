/// <reference types="@dcloudio/types" />
/**
 * 微信 JS-SDK 封装（公众号 H5：扫一扫 / 定位 / 相册 / 自定义分享）
 *
 * 为什么需要后端签名：wx.config 的 signature 由 jsapi_ticket + 当前页面 URL 计算，
 * ticket 只能服务端持有（换取需 AppSecret），故签名必须走
 * GET /api/v1/wechat/jssdk/config?url=... 由后端下发。
 *
 * ⚠️ iOS / Android 的签名 URL 口径不同 —— 这是 JS-SDK 最高频且最难排的接入错误：
 *   - iOS 微信 WebView 只在**首次进入页面**时记录 URL，SPA 后续 hash / history
 *     路由切换都不会更新它，故 wx.config 必须用首次加载的 URL 签名
 *   - Android 每次路由变化都会更新，必须用**当前** URL 签名
 * 用错平台表现为 invalid signature，且只在其中一端复现（另一端完全正常），
 * 极易被误判为「后端签名算法错了」。本模块按 UA 分别取值，调用方无需关心。
 *
 * 仅 H5 生效：小程序构建（build:mp-weixin）共用本仓库源码但无 window/document，
 * 故全部实现包在 #ifdef H5 内，非 H5 端调用直接抛错而非静默失败。
 */
import { request } from './request'
import { isWechatBrowser } from './platform'

/** 微信官方 JS-SDK（1.6.0 起支持开放标签 wx-open-launch-*） */
const SDK_URL = 'https://res.wx.qq.com/open/js/jweixin-1.6.0.js'

/** 后端 /wechat/jssdk/config 下发的 wx.config 入参 */
interface JsSdkConfig {
  appId: string
  timestamp: number
  nonceStr: string
  signature: string
}

export interface JsSdkOptions {
  /** 需要使用的 JS 接口列表（必填，微信不接受空数组） */
  jsApiList: string[]
  /** 需要使用的开放标签列表（如 wx-open-launch-weapp），无则不传 */
  openTagList?: string[]
}

/** 失败原因枚举：便于调用方区分「环境不支持」与「签名/网络错误」而分别降级 */
export type JsSdkFailReason = 'unsupported' | 'signature' | 'sdk_load'

export class JsSdkError extends Error {
  reason: JsSdkFailReason

  constructor(reason: JsSdkFailReason, message: string) {
    super(message)
    this.name = 'JsSdkError'
    this.reason = reason
  }
}

/** 自定义分享常用接口（公众号 H5 分享卡片标题/描述/图） */
export const SHARE_JS_APIS = ['updateAppMessageShareData', 'updateTimelineShareData']

/** 扫一扫常用接口 */
export const SCAN_JS_APIS = ['scanQRCode']

// #ifdef H5
/** wx 全局对象由 jweixin 脚本挂载，无官方类型声明，按需最小化描述 */
interface WxGlobal {
  config: (conf: Record<string, unknown>) => void
  ready: (cb: () => void) => void
  error: (cb: (err: { errMsg: string }) => void) => void
  [api: string]: unknown
}

function wxGlobal(): WxGlobal | undefined {
  return (window as unknown as { wx?: WxGlobal }).wx
}

/**
 * 参与签名的 URL：location.href 去掉 `#` 及其后部分
 *
 * uni-app H5 默认 hash 路由（`/pages/x#/detail`），`#` 后的路由段不参与微信签名；
 * 后端同样会剥一次（双保险），但前端先剥可避免把整段 hash 发到日志里。
 */
function signingUrl(): string {
  return window.location.href.split('#')[0]
}

function isIOS(): boolean {
  return /iPhone|iPad|iPod/i.test(window.navigator.userAgent)
}

/**
 * 模块加载即固定 iOS 的签名基准 URL
 *
 * 必须在模块首次求值时抓取：若延后到 wx.config 调用时才取，iOS 上 SPA 已经切过
 * 路由，location.href 不再是 WebView 记录的那个 URL，签名必然不匹配。
 */
const INITIAL_URL = signingUrl()

function targetSigningUrl(): string {
  return isIOS() ? INITIAL_URL : signingUrl()
}

/** SDK 脚本只注入一次（并发调用共享同一 Promise，避免重复插入 script 标签） */
let sdkLoading: Promise<void> | null = null

function loadSdk(): Promise<void> {
  if (wxGlobal()) {
    return Promise.resolve()
  }
  if (sdkLoading) {
    return sdkLoading
  }

  sdkLoading = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SDK_URL
    script.onload = () => {
      // 脚本加载完成但 wx 未挂载（被 CDN 劫持 / 离线包异常）时明确报错，
      // 否则后续 wx.config 会抛「undefined is not an object」而看不出根因
      if (!wxGlobal()) {
        reject(new JsSdkError('sdk_load', 'JS-SDK 脚本已加载但 window.wx 未就绪'))
        return
      }
      resolve()
    }
    script.onerror = () => {
      // 失败后清空缓存的 Promise，允许下次重试（否则一次网络抖动会永久失败）
      sdkLoading = null
      reject(new JsSdkError('sdk_load', `JS-SDK 脚本加载失败：${SDK_URL}`))
    }
    document.head.appendChild(script)
  })

  return sdkLoading
}

/** wx.config 一个页面生命周期内只应调用一次，故结果（含失败）整体记忆化 */
let configured: Promise<void> | null = null
// #endif

/** 当前环境是否可能支持 JS-SDK（非微信内 / 非 H5 直接 false，调用方据此跳过） */
export function isJsSdkSupported(): boolean {
  // #ifdef H5
  return isWechatBrowser()
  // #endif
  // #ifndef H5
  return false
  // #endif
}

/**
 * 初始化 JS-SDK：加载脚本 → 向后端取签名 → wx.config → 等待 ready
 *
 * 幂等：重复调用复用同一次 config 结果（wx.config 二次调用会被微信忽略并可能
 * 触发 error 回调，故必须去重）。传不同 jsApiList 重复调用不会重新 config——
 * 首次调用即应传齐本次页面所需的全部接口。
 *
 * @throws JsSdkError reason=unsupported 非微信环境；signature 后端拒签或验签失败；
 *                    sdk_load 脚本加载失败
 */
export async function setupJsSdk(options: JsSdkOptions): Promise<void> {
  // 非微信 / 非 H5 一律拒绝：小程序构建下 isJsSdkSupported() 恒 false，
  // 条件编译后本守卫即「非 H5 直接抛 unsupported」，故无需再写 #ifndef 分支。
  // 必须写成运行时判断而不能是 #ifndef 里的裸 throw：裸 throw 会让 TS 将其后
  // 全部实现判为不可达，控制流分析随之失效（Promise<void> 被推成 void）。
  if (!isJsSdkSupported()) {
    throw new JsSdkError('unsupported', '当前环境不支持 JS-SDK（需微信内置浏览器 H5）')
  }
  if (!options.jsApiList?.length) {
    throw new JsSdkError('signature', 'jsApiList 不能为空（微信不接受空接口列表）')
  }

  // #ifdef H5
  // 用局部量承接：configured 是模块级 let 且在下方闭包内被重置为 null，
  // TS 对被捕获的可变变量不做窄化，直读会报 void | null 不可赋给 void
  const pending = configured
  if (pending) {
    return pending
  }

  const task = (async () => {
    await loadSdk()

    const url = targetSigningUrl()
    let config: JsSdkConfig
    try {
      config = await request<JsSdkConfig>({
        url: '/wechat/jssdk/config',
        method: 'GET',
        // 公开端点：分享等能力在登录前就要用，不能带 token（带了反而在 token 过期时 401）
        needAuth: false,
        data: { url },
      })
    } catch (e) {
      // 取签名失败要重置记忆化状态，否则后续调用会永远复用同一次失败
      configured = null
      throw new JsSdkError('signature', (e as Error).message || '获取 JS-SDK 签名失败')
    }

    await new Promise<void>((resolve, reject) => {
      const wx = wxGlobal()
      if (!wx) {
        configured = null
        reject(new JsSdkError('sdk_load', 'window.wx 未就绪'))
        return
      }

      wx.error((err) => {
        // 验签失败同样重置，便于路由切换后按新 URL 重试（Android 场景）
        configured = null
        reject(new JsSdkError('signature', err.errMsg || 'wx.config 校验失败'))
      })

      wx.config({
        debug: false,
        appId: config.appId,
        timestamp: config.timestamp,
        nonceStr: config.nonceStr,
        signature: config.signature,
        jsApiList: options.jsApiList,
        ...(options.openTagList?.length ? { openTagList: options.openTagList } : {}),
      })

      wx.ready(() => resolve())
    })
  })()

  configured = task

  return task
  // #endif
}

/**
 * 取已就绪的 wx 对象以调用具体接口（scanQRCode / chooseImage 等）
 *
 * @throws JsSdkError 尚未 setupJsSdk 成功时抛错，避免调用方拿到 undefined 后
 *                    报「Cannot read properties of undefined」而看不出是没初始化
 */
export function getWx(): unknown {
  // 同 setupJsSdk：用运行时守卫兼顾「非 H5」与「非微信内」两种不可用情形
  if (!isJsSdkSupported()) {
    throw new JsSdkError('unsupported', 'JS-SDK 仅在 H5（微信内置浏览器）环境可用')
  }

  // #ifdef H5
  const wx = wxGlobal()
  if (!wx) {
    throw new JsSdkError('sdk_load', 'JS-SDK 尚未初始化，请先 await setupJsSdk(...)')
  }
  return wx
  // #endif
}
