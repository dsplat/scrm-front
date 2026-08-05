/// <reference types="@dcloudio/types" />
/**
 * 统一支付唤起工具（复用 event/order 的支付模式）
 *
 * 兼容两种预下单返回：
 * - MWEB/H5：pay_data 含跳转 URL（h5_url/mweb_url/pay_url），跳转微信支付中转页
 * - JSAPI：pay_data 含 timeStamp/nonceStr/package/paySign，经 WeixinJSBridge 唤起
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
    return invokeWechatJsapi(payData)
  }

  return Promise.reject(new Error('未获取到有效支付参数'))
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
