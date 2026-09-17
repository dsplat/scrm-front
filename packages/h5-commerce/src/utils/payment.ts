/// <reference types="@dcloudio/types" />
/**
 * 统一支付唤起工具（复用 event/order 的支付模式）
 *
 * 兼容三种预下单返回：
 * - MWEB/H5：pay_data 含跳转 URL（h5_url/mweb_url/pay_url），跳转微信支付中转页
 * - JSAPI：pay_data 含 timeStamp/nonceStr/package/paySign，经 WeixinJSBridge 唤起
 * - 小程序：pay_data 同 JSAPI 字段，经 uni.requestPayment（wxpay）唤起
 */

export function invokePayment(payData: Record<string, any>): Promise<void> {
  const redirectUrl = payData.h5_url || payData.mweb_url || payData.pay_url || payData.url
  if (redirectUrl) {
    // #ifdef H5
    window.location.href = redirectUrl
    // #endif
    return Promise.resolve()
  }

  if (payData.timeStamp || payData.timestamp || payData.paySign) {
    // 小程序与 H5 网页互斥：小程序运行时有原生支付能力，H5 走 WeixinJSBridge。
    // 运行时判定而不依赖条件编译在共享包内的生效性（包被 H5/小程序两套构建共用）
    if (isMiniappRuntime()) {
      return invokeWechatMiniapp(payData)
    }
    return invokeWechatJsapi(payData)
  }

  return Promise.reject(new Error('未获取到有效支付参数'))
}

/**
 * 是否微信小程序运行时
 *
 * uniPlatform 由 uni-app 运行时提供（H5 = 'web'，微信小程序 = 'mp-weixin'）；
 * 取不到时保守返回 false（按 H5 处理），避免在浏览器里误走小程序 API。
 */
function isMiniappRuntime(): boolean {
  try {
    return (uni.getSystemInfoSync() as any)?.uniPlatform === 'mp-weixin'
  } catch {
    return false
  }
}

/**
 * 当前运行端的支付通道值（与后端 TradePayService::CHANNEL_* 契约对齐）
 *
 * 小程序端显式报 'wechat_miniapp'（后端据此用小程序 appid/openid 下单）；
 * H5 返回空串交由后端自动判定（租户 JSAPI 开关 + 微信 UA）
 */
export function currentPayChannel(): string {
  return isMiniappRuntime() ? 'wechat_miniapp' : ''
}

/** 微信小程序内唤起（后端按 mini_app_id 预下单，参数与 JSAPI 同构） */
function invokeWechatMiniapp(payData: Record<string, any>): Promise<void> {
  return new Promise((resolve, reject) => {
    uni.requestPayment({
      provider: 'wxpay',
      timeStamp: String(payData.timeStamp || payData.timestamp || ''),
      nonceStr: payData.nonceStr || payData.nonce_str || '',
      package: payData.package || payData.packageValue || '',
      signType: payData.signType || 'RSA',
      paySign: payData.paySign || payData.pay_sign || '',
      success: () => {
        uni.showToast({ title: '支付成功', icon: 'success' })
        resolve()
      },
      fail: (err: any) => {
        const msg = String(err?.errMsg || '')
        reject(new Error(msg.includes('cancel') ? '支付已取消' : '支付未完成'))
      },
    })
  })
}

/** 微信公众号内 JSAPI 唤起 */
function invokeWechatJsapi(payData: Record<string, any>): Promise<void> {
  return new Promise((resolve, reject) => {
    // #ifdef H5
    const doInvoke = () => {
      ;(window as any).WeixinJSBridge.invoke(
        'getBrandWCPayRequest',
        {
          appId: payData.appId || payData.appid || '',
          timeStamp: String(payData.timeStamp || payData.timestamp || ''),
          nonceStr: payData.nonceStr || payData.nonce_str || '',
          package: payData.package || payData.packageValue || '',
          signType: payData.signType || 'RSA',
          paySign: payData.paySign || payData.pay_sign || '',
        },
        (bridgeRes: any) => {
          if (bridgeRes.err_msg === 'get_brand_wcpay_request:ok') {
            uni.showToast({ title: '支付成功', icon: 'success' })
            resolve()
          } else {
            reject(new Error('支付未完成'))
          }
        },
      )
    }

    if (typeof (window as any).WeixinJSBridge === 'undefined') {
      document.addEventListener('WeixinJSBridgeReady', doInvoke, false)
    } else {
      doInvoke()
    }
    // #endif
  })
}

/** 轮询回调（网关异步确认）：fn 返回 true 表示达成目标 */
export function pollUntil(fn: () => Promise<boolean>, retries = 5, intervalMs = 1200): void {
  let count = 0
  const timer = setInterval(async () => {
    count++
    try {
      const done = await fn()
      if (done || count >= retries) {
        clearInterval(timer)
      }
    } catch {
      if (count >= retries) clearInterval(timer)
    }
  }, intervalMs)
}
