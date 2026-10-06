/// <reference types="@dcloudio/types" />
/**
 * 企业微信「聊天侧边栏」JS-SDK 封装（BL-011 第一切片）
 *
 * 侧边栏 = 企业微信客户端在**聊天右侧栏**内置 webview 打开的 H5 页面：进入时企微
 * 注入全局对象 `wx`，须先 `wx.agentConfig`（**企业应用级**鉴权，签名由后端用企业
 * 应用的 jsapi_ticket + 当前 URL 计算）通过后，才能调用侧边栏专属接口。
 *
 * 与公众号 H5 的 `utils/jssdk.ts` 的区别（切勿混用）：
 *   - 鉴权走 `wx.agentConfig`（企业应用），不是 `wx.config`（公众号）；入参为
 *     `corpid` / `agentid`（全小写），不是 `appId`。
 *   - 侧边栏接口经 `wx.invoke('getCurExternalContact' | 'sendChatMessage')` 调用。
 *   - 仅在企业微信客户端内可用（UA 含 `wxwork`）。
 * 详见企业微信官方《JS-SDK 权限验证》《聊天侧边栏》文档。
 *
 * 安全：本模块**不持有任何 appid/secret**。签名 / agentId 一律由后端下发
 * （契约见 `api/wecom.ts#getSidebarSignature`），前端只做参数透传与调用编排。
 *
 * 可测性：模块顶层不触碰 window/document/uni；签名获取经依赖注入
 * （`SignatureProvider`），故可在 Node（`node --experimental-strip-types`）下
 * import 并直接单测纯函数与调用编排。
 */

/** 后端 `GET /wecom/sidebar/signature` 下发的 wx.agentConfig 入参（契约详见 api/wecom.ts） */
export interface WecomSignature {
  corp_id: string
  agent_id: string | number
  timestamp: number
  nonce_str: string
  signature: string
}

/** 签名提供者：由页面注入 `api/wecom.getSidebarSignature`（解耦 HTTP，便于单测注入桩） */
export type SignatureProvider = (url: string) => Promise<WecomSignature>

/** 失败原因枚举：调用方据此区分「环境不支持」与「签名/脚本错误」而分别降级 */
export type WecomSidebarFailReason = 'unsupported' | 'sdk_load' | 'signature' | 'sdk_error'

export class WecomSidebarError extends Error {
  reason: WecomSidebarFailReason

  constructor(reason: WecomSidebarFailReason, message: string) {
    super(message)
    this.name = 'WecomSidebarError'
    this.reason = reason
  }
}

/** 企业微信官方 JS-SDK（与公众号共用同一份 jweixin 脚本，但鉴权走 agentConfig） */
export const WECOM_SDK_URL = 'https://res.wx.qq.com/open/js/jweixin-1.6.0.js'

/**
 * 侧边栏必需 JS 接口（wx.agentConfig 的 jsApiList 必须一次给齐，二次 config 会被忽略）：
 * - getContext：获取进入侧边栏的场景上下文
 * - getCurExternalContact：取当前会话的外部联系人 external_userid
 * - sendChatMessage：向当前会话发送文本/链接等消息（话术、素材、活动一键发送）
 * - shareAppMessage：分享（预留）
 */
export const WECOM_SIDEBAR_JS_APIS = [
  'getContext',
  'getCurExternalContact',
  'sendChatMessage',
  'shareAppMessage',
]

/** wx.agentConfig 载荷（企业微信字段名：corpid / agentid / nonceStr，全小写 corp/agent） */
export interface WecomAgentConfigPayload {
  corpid: string
  agentid: string | number
  timestamp: number
  nonceStr: string
  signature: string
  jsApiList: string[]
}

/** 发送到当前会话的消息（企微 sendChatMessage 的 msgtype 子集） */
export interface WecomTextMessage {
  msgtype: 'text'
  text: { content: string }
}

export interface WecomLinkCard {
  url: string
  title?: string
  desc?: string
  imgUrl?: string
}

export interface WecomLinkMessage {
  msgtype: 'link'
  link: { title: string; desc: string; url: string; imgUrl: string }
}

export type WecomChatMessage = WecomTextMessage | WecomLinkMessage

/** wx.invoke 回调结果的最小描述（errMsg 约定为 `api:ok` / `api:fail ...`） */
export interface WxInvokeResult {
  errMsg?: string
  userId?: string
  external_userid?: string
  [key: string]: unknown
}

interface WxSidebarApi {
  agentConfig: (conf: Record<string, unknown>) => void
  invoke: (api: string, params: Record<string, unknown>, cb: (res: WxInvokeResult) => void) => void
  error?: (cb: (err: WxInvokeResult) => void) => void
  ready?: (cb: () => void) => void
}

/** 运行时全局（浏览器 window / Node globalThis 同为全局 var；顶层不触碰，仅函数内读） */
function runtimeGlobal(): Record<string, unknown> {
  return globalThis as unknown as Record<string, unknown>
}

function getUserAgent(): string {
  const nav = runtimeGlobal().navigator as { userAgent?: string } | undefined
  return nav?.userAgent ?? ''
}

function currentHref(): string {
  const loc = runtimeGlobal().location as { href?: string } | undefined
  return loc?.href ?? ''
}

function isIOS(): boolean {
  return /iPhone|iPad|iPod/i.test(getUserAgent())
}

/**
 * 取企微注入的 wx 对象（浏览器 H5 下即 window.wx；Node 单测下 globalThis.wx）。
 *
 * 返回 undefined 而非抛错：调用方（loadWecomSdk / 守卫）需据此判断"是否已注入"。
 */
export function getWecomWx(): WxSidebarApi | undefined {
  return runtimeGlobal().wx as WxSidebarApi | undefined
}

/** 当前环境是否企业微信客户端（UA 含 wxwork 标记；非 H5 恒 false） */
export function isWecomBrowser(): boolean {
  // #ifdef H5
  return /wxwork/i.test(getUserAgent())
  // #endif
  // #ifndef H5
  return false
  // #endif
}

/**
 * 校验签名五要素齐备；缺失即抛 signature 错误 —— 避免把 undefined 拼进 agentConfig
 * 后只收到笼统的 agentConfig:fail 而无从定位。
 */
export function assertSignatureValid(sig: WecomSignature): void {
  const required: Array<keyof WecomSignature> = [
    'corp_id',
    'agent_id',
    'timestamp',
    'nonce_str',
    'signature',
  ]
  const missing = required.filter((key) => {
    const v = sig?.[key]
    return v === undefined || v === null || v === ''
  })
  if (missing.length) {
    throw new WecomSidebarError('signature', `侧边栏签名缺失字段：${missing.join(', ')}`)
  }
}

/**
 * 契约映射：后端 `{corp_id, agent_id, nonce_str, ...}` → wx.agentConfig 入参。
 *
 * 字段名必须是企微要求的 `corpid` / `agentid` / `nonceStr`（与后端 snake_case 契约不同），
 * 映射集中在此一处，页面与后端改动都无需再碰字段名。
 */
export function buildAgentConfigPayload(
  sig: WecomSignature,
  jsApiList: string[] = WECOM_SIDEBAR_JS_APIS,
): WecomAgentConfigPayload {
  assertSignatureValid(sig)
  if (!jsApiList?.length) {
    throw new WecomSidebarError('signature', 'jsApiList 不能为空（企业微信不接受空接口列表）')
  }
  return {
    corpid: sig.corp_id,
    agentid: sig.agent_id,
    timestamp: sig.timestamp,
    nonceStr: sig.nonce_str,
    signature: sig.signature,
    jsApiList: [...jsApiList],
  }
}

/**
 * getCurExternalContact 回调 → 外部联系人 id。
 *
 * 企微回调字段名为 `userId`（非后端术语 external_userid），此处兼容两种拼写以便
 * 上游若改用后端字段名也不破。取不到即抛错（通常意味着当前不在客户会话中）。
 */
export function extractExternalUserId(res: unknown): string {
  const r = (res ?? {}) as WxInvokeResult
  const id = r.userId ?? r.external_userid
  if (typeof id !== 'string' || !id) {
    throw new WecomSidebarError('sdk_error', '未获取到当前外部联系人（可能不在客户会话中）')
  }
  return id
}

/** 文本消息（话术一键发送） */
export function buildTextMessage(content: string): WecomTextMessage {
  const text = (content ?? '').trim()
  if (!text) {
    throw new WecomSidebarError('sdk_error', '话术内容不能为空')
  }
  return { msgtype: 'text', text: { content: text } }
}

/** 链接卡片消息（素材 / 活动一键发送） */
export function buildLinkMessage(card: WecomLinkCard): WecomLinkMessage {
  if (!card?.url) {
    throw new WecomSidebarError('sdk_error', '链接消息缺少 url')
  }
  return {
    msgtype: 'link',
    link: {
      title: card.title ?? '',
      desc: card.desc ?? '',
      url: card.url,
      imgUrl: card.imgUrl ?? '',
    },
  }
}

// #ifdef H5
/** SDK 脚本只注入一次（并发调用共享同一 Promise，避免重复插入 script 标签） */
let sdkLoading: Promise<void> | null = null

function loadWecomSdk(): Promise<void> {
  if (getWecomWx()) {
    return Promise.resolve()
  }
  if (sdkLoading) {
    return sdkLoading
  }

  sdkLoading = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = WECOM_SDK_URL
    script.onload = () => {
      // 脚本加载完成但 wx 未挂载（CDN 劫持 / 网络异常）时明确报错，避免后续
      // getWecomWx() 返回 undefined 而报「Cannot read properties of undefined」
      if (!getWecomWx()) {
        sdkLoading = null
        reject(new WecomSidebarError('sdk_load', 'JS-SDK 脚本已加载但 window.wx 未就绪'))
        return
      }
      resolve()
    }
    script.onerror = () => {
      // 失败后清空缓存，允许下次重试（否则一次网络抖动会永久失败）
      sdkLoading = null
      reject(new WecomSidebarError('sdk_load', `JS-SDK 脚本加载失败：${WECOM_SDK_URL}`))
    }
    document.head.appendChild(script)
  })

  return sdkLoading
}

/** wx.agentConfig 一个页面生命周期内只应调用一次，故结果（含失败）整体记忆化 */
let configured: Promise<void> | null = null

/**
 * 参与签名的 URL：location.href 去掉 `#` 及其后部分。
 *
 * uni-app H5 默认 hash 路由，`#` 后路由段不参与企微签名；iOS 微信 WebView 只在
 * **首次进入页面**时记录 URL（SPA 后续路由切换不更新），故 iOS 用首次调用时的 URL，
 * Android 用当前 URL —— 与公众号 `jssdk.ts` 同口径，仅取值时机改为首次调用时捕获
 * （侧边栏 webview 为独立入口，首次调用即等价于模块加载，差异可忽略）。
 */
let initialHref: string | null = null

function sidebarSigningUrl(): string {
  const href = currentHref().split('#')[0]
  if (initialHref === null) {
    initialHref = href
  }
  return isIOS() ? initialHref : href
}
// #endif

export interface SetupWecomSidebarOptions {
  /** 签名获取（注入 `api/wecom.getSidebarSignature`） */
  getSignature: SignatureProvider
  /** 覆盖默认 jsApiList（一般无需传；须一次给齐本次页面全部接口） */
  jsApiList?: string[]
}

/**
 * 初始化侧边栏 JS-SDK：加载脚本 → 取签名 → wx.agentConfig → 等待成功。
 *
 * 幂等：重复调用复用同一次结果（agentConfig 二次调用会被企微忽略并可能触发 error，
 * 故必须去重）。失败时重置记忆化状态，允许路由切换后按新 URL 重试。
 *
 * @throws WecomSidebarError reason=unsupported 非企业微信客户端；
 *         sdk_load 脚本/wx 未就绪；signature 后端拒签或验签失败
 */
export async function setupWecomSidebar(options: SetupWecomSidebarOptions): Promise<void> {
  // 运行时守卫兼顾「非 H5」与「非企微内」两种不可用情形（非 H5 下 isWecomBrowser 恒 false）
  if (!isWecomBrowser()) {
    throw new WecomSidebarError('unsupported', '当前环境非企业微信客户端，聊天侧边栏不可用')
  }

  // #ifdef H5
  // 局部量承接：configured 为模块级 let 且在下方闭包内被重置，TS 对被捕获可变变量不做窄化
  const pending = configured
  if (pending) {
    return pending
  }

  const task = (async () => {
    await loadWecomSdk()

    const wx = getWecomWx()
    if (!wx) {
      configured = null
      throw new WecomSidebarError('sdk_load', 'window.wx 未就绪')
    }

    const url = sidebarSigningUrl()
    let sig: WecomSignature
    try {
      sig = await options.getSignature(url)
    } catch (e) {
      // 取签名失败要重置记忆化状态，否则后续调用会永远复用同一次失败
      configured = null
      throw new WecomSidebarError('signature', (e as Error).message || '获取侧边栏签名失败')
    }

    const payload = buildAgentConfigPayload(sig, options.jsApiList)

    await new Promise<void>((resolve, reject) => {
      wx.error?.((err) => {
        // 验签失败同样重置，便于路由切换后按新 URL 重试（Android 场景）
        configured = null
        reject(new WecomSidebarError('signature', err?.errMsg || 'wx.agentConfig 校验失败'))
      })

      wx.agentConfig({
        ...payload,
        success: () => resolve(),
        fail: (err: WxInvokeResult) => {
          configured = null
          reject(new WecomSidebarError('signature', err?.errMsg || 'wx.agentConfig 失败'))
        },
      })
    })
  })()

  configured = task

  return task
  // #endif
}

/**
 * 触发 wx.invoke 并 Promise 化，统一失败分支（errMsg 含 `:fail` 视为失败）。
 *
 * @throws WecomSidebarError sdk_load 未初始化；sdk_error 接口返回失败
 */
function invokeWx<T = WxInvokeResult>(
  api: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const wx = getWecomWx()
  if (!wx || typeof wx.invoke !== 'function') {
    throw new WecomSidebarError(
      'sdk_load',
      '侧边栏 JS-SDK 尚未初始化，请先 await setupWecomSidebar(...)',
    )
  }

  return new Promise<T>((resolve, reject) => {
    wx.invoke(api, params, (res) => {
      const errMsg = res?.errMsg
      if (typeof errMsg === 'string' && /:fail/.test(errMsg)) {
        reject(new WecomSidebarError('sdk_error', errMsg))
        return
      }
      resolve(res as T)
    })
  })
}

/** 获取当前外部联系人 external_userid（客户画像 / 话术 / 素材按此维度取数） */
export async function getExternalUserId(): Promise<string> {
  const res = await invokeWx<WxInvokeResult>('getCurExternalContact')
  return extractExternalUserId(res)
}

/**
 * 发送消息到当前会话（话术 / 素材 / 活动一键发送）。
 *
 * 复用企微原生发送通道（`sendChatMessage`），**不新造后端发送链路**。
 */
export async function sendChatMessage(message: WecomChatMessage): Promise<void> {
  await invokeWx('sendChatMessage', message as unknown as Record<string, unknown>)
}
