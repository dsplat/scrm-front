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
    await payOrder(orderNo)
    // 实际场景：调用微信/支付宝 SDK 唤起支付
    uni.showToast({ title: '支付发起成功', icon: 'success' })
    // 轮询订单状态
    setTimeout(loadOrder, 2000)
  } catch (e: any) {
    uni.showToast({ title: e.message || '支付失败', icon: 'none' })
  }
}

function goEvaluate() {
  uni.navigateTo({
    url: `/pages/event/evaluate?eventId=${order.value.event_id}&orderNo=${orderNo}`,
  })
}

async function loadOrder() {
  const res = await getOrderDetail(orderNo)
  order.value = res.data || {}
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
