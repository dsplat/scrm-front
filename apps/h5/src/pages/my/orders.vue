<template>
  <view class="orders-page">
    <NavBar title="我的订单" />

    <!-- 未登录：页面内登录引导（保留返回出口，不强跳） -->
    <view v-if="!loggedIn" class="login-prompt">
      <text class="login-tip-text"> 登录后查看我的订单 </text>
      <button class="go-login-btn" @tap="goLogin">去登录</button>
    </view>

    <template v-else>
      <!-- 类型筛选 Tab -->
      <view class="type-tabs">
        <view
          v-for="tab in tabs"
          :key="tab.value"
          class="tab-item"
          :class="{ active: activeType === tab.value }"
          @tap="switchType(tab.value)"
        >
          <text>{{ tab.label }}</text>
        </view>
      </view>

      <ErrorState
        v-if="loadError && orders.length === 0"
        message="订单加载失败，请稍后重试"
        @retry="reload"
      />

      <view v-else class="order-list">
        <view
          v-for="order in orders"
          :key="order.order_id"
          class="order-card"
          @tap="goDetail(order)"
        >
          <view class="card-head">
            <text class="type-badge" :class="`type-${order.order_type}`">
              {{ typeText(order.order_type) }}
            </text>
            <text class="status-badge" :class="`st-${order.status}`">
              {{ statusText(order.status) }}
            </text>
          </view>
          <view class="card-body">
            <text class="order-title">
              {{ orderTitle(order) }}
            </text>
            <text class="order-no"> 订单号：{{ order.order_no }} </text>
          </view>
          <view class="card-foot">
            <text class="order-time">
              {{ formatTime(order.created_at) }}
            </text>
            <view class="foot-right">
              <text class="order-amount">
                {{ amountText(order) }}
              </text>
              <button
                v-if="order.status === 'pending'"
                class="pay-btn"
                :disabled="paying === order.order_no"
                @tap.stop="handlePay(order)"
              >
                {{ paying === order.order_no ? '支付中' : '去支付' }}
              </button>
            </view>
          </view>
        </view>

        <view v-if="orders.length === 0 && !loading" class="empty-tip">
          <text>暂无订单</text>
        </view>
        <view v-if="loading" class="loading-tip">
          <text>加载中...</text>
        </view>
        <view v-else-if="orders.length > 0 && page >= lastPage" class="loading-tip">
          <text>没有更多了</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow, onReachBottom, onPullDownRefresh } from '@dcloudio/uni-app'
import { getMyOrders, payOrder, invokePayment, fenToYuan, type OrderVO } from '@scrm/h5-commerce'
import { isLoggedIn } from '../../api/auth'
import { redirectToLogin } from '../../utils/request'
import { useTenantTitle } from '../../composables/useTenantTitle'
import NavBar from '../../components/NavBar.vue'
import ErrorState from '../../components/ErrorState.vue'

type OrderRow = OrderVO & {
  entity_type?: string
  entity_id?: number
  metadata?: Record<string, any>
}

const tabs = [
  { label: '全部', value: '' },
  { label: '活动', value: 'registration' },
  { label: '商品', value: 'product' },
  { label: '课程', value: 'course' },
  { label: '兑换', value: 'exchange' },
]

const TYPE_TEXT: Record<string, string> = {
  registration: '活动报名',
  product: '商品订单',
  course: '课程订单',
  exchange: '积分兑换',
}

const STATUS_TEXT: Record<string, string> = {
  pending: '待支付',
  paid: '已支付',
  checked_in: '已签到',
  completed: '已完成',
  refunded: '已退款',
  refund_failed: '退款失败',
  cancelled: '已取消',
}

const orders = ref<OrderRow[]>([])
const activeType = ref('')
const page = ref(1)
const lastPage = ref(1)
const loading = ref(false)
const loadError = ref(false)
const paying = ref('')
const loggedIn = computed(() => isLoggedIn())

useTenantTitle()

function typeText(type: string) {
  return TYPE_TEXT[type] || '订单'
}

function statusText(status: string) {
  return STATUS_TEXT[status] || status
}

function orderTitle(order: OrderRow) {
  const first: any = (order.items || [])[0]
  return first?.item_name || first?.name || TYPE_TEXT[order.order_type] || '订单'
}

function amountText(order: OrderRow) {
  const cash = Number(order.total_amount || 0)
  const points = Number(order.points_amount || 0)
  if (order.pay_method === 'points') return `${points} 积分`
  if (order.pay_method === 'mixed') return `¥${fenToYuan(cash)} + ${points}积分`
  return `¥${fenToYuan(cash)}`
}

function formatTime(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr.replace(' ', 'T'))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function loadOrders(reset = false) {
  if (loading.value) return
  if (reset) page.value = 1
  loading.value = true
  loadError.value = false
  try {
    const res = await getMyOrders({
      order_type: activeType.value || undefined,
      per_page: 10,
      page: page.value,
    })
    const list = (res?.data || []) as OrderRow[]
    orders.value = reset ? list : [...orders.value, ...list]
    lastPage.value = res?.last_page || 1
  } catch {
    if (reset) orders.value = []
    loadError.value = true
  } finally {
    loading.value = false
  }
}

function reload() {
  loadOrders(true)
}

function switchType(type: string) {
  if (activeType.value === type) return
  activeType.value = type
  loadOrders(true)
}

async function handlePay(order: OrderRow) {
  paying.value = order.order_no
  try {
    const res: any = await payOrder(order.order_no)
    await invokePayment(res?.pay_data || {})
    pollRefresh()
  } catch (e: any) {
    uni.showToast({ title: e.message || '支付失败', icon: 'none' })
  } finally {
    paying.value = ''
  }
}

/** 支付唤起后网关回调异步更新，轮询刷新列表直到无待支付或超时 */
function pollRefresh(retries = 3) {
  let count = 0
  const timer = setInterval(async () => {
    count++
    await loadOrders(true)
    const stillPending = orders.value.some((o) => o.status === 'pending')
    if (!stillPending || count >= retries) clearInterval(timer)
  }, 2000)
}

function goDetail(order: OrderRow) {
  uni.navigateTo({ url: `/pages/event/order?orderNo=${order.order_no}` })
}

function goLogin() {
  redirectToLogin()
}

onShow(() => {
  if (isLoggedIn()) loadOrders(true)
})

onReachBottom(() => {
  if (page.value < lastPage.value) {
    page.value++
    loadOrders(false)
  }
})

onPullDownRefresh(async () => {
  await loadOrders(true)
  uni.stopPullDownRefresh()
})
</script>

<style scoped>
.orders-page {
  min-height: 100vh;
  background: #f5f6fa;
}
.type-tabs {
  display: flex;
  background: #fff;
  padding: 0 12rpx;
  position: sticky;
  top: 0;
  z-index: 10;
}
.tab-item {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  font-size: 28rpx;
  color: #666;
  border-bottom: 4rpx solid transparent;
}
.tab-item.active {
  color: var(--scrm-primary);
  font-weight: 600;
  border-bottom-color: var(--scrm-primary);
}
.order-list {
  padding: 20rpx 24rpx;
}
.order-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 16rpx;
  border-bottom: 1px solid #f5f5f5;
}
.type-badge {
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
  background: #eef2fb;
  color: #576b95;
}
.type-registration {
  background: #fff1f0;
  color: #e64340;
}
.type-course {
  background: #eef0ff;
  color: #6366f1;
}
.type-exchange {
  background: #fff7e6;
  color: #e6a23c;
}
.status-badge {
  font-size: 24rpx;
  color: #999;
}
.status-badge.st-pending {
  color: #f39c12;
  font-weight: 600;
}
.status-badge.st-paid,
.status-badge.st-checked_in,
.status-badge.st-completed {
  color: var(--scrm-primary);
}
.card-body {
  padding: 20rpx 0;
}
.order-title {
  display: block;
  font-size: 30rpx;
  color: #333;
  font-weight: 500;
}
.order-no {
  display: block;
  font-size: 22rpx;
  color: #bbb;
  margin-top: 10rpx;
}
.card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16rpx;
  border-top: 1px solid #f5f5f5;
}
.order-time {
  font-size: 22rpx;
  color: #bbb;
}
.foot-right {
  display: flex;
  align-items: center;
}
.order-amount {
  font-size: 30rpx;
  color: #e64340;
  font-weight: 600;
  margin-right: 20rpx;
}
.pay-btn {
  margin: 0;
  padding: 0 32rpx;
  height: 60rpx;
  line-height: 60rpx;
  font-size: 26rpx;
  background: #e64340;
  color: #fff;
  border-radius: 30rpx;
}
.pay-btn[disabled] {
  opacity: 0.6;
}
.empty-tip,
.loading-tip {
  text-align: center;
  padding: 60rpx 0;
  color: #999;
  font-size: 28rpx;
}
.login-prompt {
  margin: 24rpx;
  padding: 80rpx 36rpx;
  background: #fff;
  border-radius: 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32rpx;
}
.login-tip-text {
  font-size: 28rpx;
  color: #999;
}
.go-login-btn {
  width: 320rpx;
  height: 80rpx;
  line-height: 80rpx;
  background: var(--scrm-primary);
  color: #fff;
  border-radius: 40rpx;
  font-size: 28rpx;
}
</style>
