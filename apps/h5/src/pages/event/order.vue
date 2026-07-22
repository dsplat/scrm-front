<template>
  <view class="order-page">
    <NavBar title="订单详情" />
    <view class="status-card" :class="order.status">
      <text class="status-text">
        {{ statusText }}
      </text>
      <text class="order-no"> 订单号：{{ order.order_no }} </text>
    </view>
    <view class="info-section">
      <view class="info-row">
        <text class="label"> 活动 </text>
        <text class="value">
          {{ order.event?.title }}
        </text>
      </view>
      <view class="info-row">
        <text class="label"> 票种 </text>
        <text class="value">
          {{ order.ticket_type?.name }}
        </text>
      </view>
      <view class="info-row">
        <text class="label"> 数量 </text>
        <text class="value"> {{ order.quantity }} 人 </text>
      </view>
      <view class="info-row">
        <text class="label"> 金额 </text>
        <text class="value price"> ¥{{ order.total_amount }} </text>
      </view>
      <view v-if="order.paid_at" class="info-row">
        <text class="label"> 支付时间 </text>
        <text class="value">
          {{ order.paid_at }}
        </text>
      </view>
      <view v-if="order.checked_in_at" class="info-row">
        <text class="label"> 签到时间 </text>
        <text class="value">
          {{ order.checked_in_at }}
        </text>
      </view>
    </view>
    <!-- 操作按钮 -->
    <view class="actions">
      <button v-if="order.status === 'pending'" class="pay-btn" @tap="handlePay">去支付</button>
      <button
        v-if="order.status === 'paid' || order.status === 'checked_in'"
        class="eval-btn"
        @tap="goEvaluate"
      >
        评价活动
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getOrderDetail, payOrder } from '../../api/event'
import NavBar from '../../components/NavBar.vue'

const order = ref<any>({})
let orderNo = ''

const statusText = computed(() => {
  const map: Record<string, string> = {
    pending: '待支付',
    paid: '已支付',
    checked_in: '已签到',
    completed: '已完成',
    refunded: '已退款',
    cancelled: '已取消',
  }
  return map[order.value.status] || order.value.status
})

async function handlePay() {
  try {
    // request 封装已解包 body.data，res 即 { order_no, total_amount, pay_data }
    const res: any = await payOrder(orderNo)
    await invokePayment(res?.pay_data || {})
    // 支付唤起后轮询订单状态（网关回调异步更新）
    pollOrderStatus()
  } catch (e: any) {
    uni.showToast({ title: e.message || '支付失败', icon: 'none' })
  }
}

/**
 * 唤起支付
 *
 * 兼容两种预下单返回：
 * - MWEB/H5：pay_data 含跳转 URL（h5_url/mweb_url/pay_url），跳转微信支付中转页
 * - JSAPI：pay_data 含 timeStamp/nonceStr/package/paySign，经 WeixinJSBridge 唤起
 */
function invokePayment(payData: Record<string, any>): Promise<void> {
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

/** 轮询订单状态直到支付成功或超时 */
function pollOrderStatus(retries = 5) {
  let count = 0
  const timer = setInterval(async () => {
    count++
    try {
      await loadOrder()
      if (order.value.status !== 'pending' || count >= retries) {
        clearInterval(timer)
      }
    } catch (e) {
      if (count >= retries) clearInterval(timer)
    }
  }, 2000)
}

function goEvaluate() {
  uni.navigateTo({
    url: `/pages/event/evaluate?eventId=${order.value.event_id}&orderNo=${orderNo}`,
  })
}

async function loadOrder() {
  // request 封装已解包 body.data，res 即订单对象
  const res: any = await getOrderDetail(orderNo)
  order.value = res || {}
}

onMounted(() => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  orderNo = page.$page?.options?.orderNo || page.options?.orderNo || ''
  if (orderNo) loadOrder()
})
</script>

<style scoped>
.status-card {
  padding: 48rpx 32rpx;
  text-align: center;
  color: #fff;
}
.status-card.pending {
  background: #f39c12;
}
.status-card.paid,
.status-card.checked_in {
  background: #27ae60;
}
.status-card.refunded,
.status-card.cancelled {
  background: #95a5a6;
}
.status-text {
  font-size: 40rpx;
  font-weight: bold;
  display: block;
}
.order-no {
  font-size: 24rpx;
  opacity: 0.8;
  margin-top: 8rpx;
  display: block;
}
.info-section {
  padding: 32rpx;
}
.info-row {
  display: flex;
  justify-content: space-between;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}
.info-row .label {
  color: #999;
  font-size: 28rpx;
}
.info-row .value {
  font-size: 28rpx;
}
.info-row .price {
  color: #e74c3c;
  font-weight: bold;
}
.actions {
  padding: 32rpx;
}
.pay-btn {
  background: #e74c3c;
  color: #fff;
  border-radius: 44rpx;
  margin-bottom: 16rpx;
}
.eval-btn {
  background: #4a90d9;
  color: #fff;
  border-radius: 44rpx;
}
</style>
