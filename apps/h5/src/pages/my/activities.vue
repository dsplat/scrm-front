<template>
  <view class="activities-page">
    <NavBar title="我的活动" />

    <view v-if="!loggedIn" class="login-prompt">
      <text class="login-tip-text"> 登录后查看报名的活动 </text>
      <button class="go-login-btn" @tap="goLogin">去登录</button>
    </view>

    <template v-else>
      <!-- 状态筛选 -->
      <view class="status-tabs">
        <view
          v-for="tab in tabs"
          :key="tab.value"
          class="tab-item"
          :class="{ active: activeStatus === tab.value }"
          @tap="switchStatus(tab.value)"
        >
          <text>{{ tab.label }}</text>
        </view>
      </view>

      <ErrorState
        v-if="loadError && orders.length === 0"
        message="活动加载失败，请稍后重试"
        @retry="reload"
      />

      <view v-else class="act-list">
        <view v-for="order in orders" :key="order.order_id" class="act-card">
          <view class="act-main" @tap="goActivity(order)">
            <text class="act-title">
              {{ activityTitle(order) }}
            </text>
            <view class="act-meta">
              <text class="status-badge" :class="`st-${order.status}`">
                {{ statusText(order.status) }}
              </text>
              <text v-if="ticketName(order)" class="ticket">
                {{ ticketName(order) }}
              </text>
            </view>
            <text class="act-time"> 报名于 {{ formatTime(order.created_at) }} </text>
          </view>
          <view class="act-actions">
            <button
              v-if="order.status === 'pending'"
              class="btn primary"
              :disabled="paying === order.order_no"
              @tap.stop="handlePay(order)"
            >
              {{ paying === order.order_no ? '支付中' : '去支付' }}
            </button>
            <button v-if="canEvaluate(order)" class="btn" @tap.stop="goEvaluate(order)">
              去评价
            </button>
            <button class="btn ghost" @tap.stop="goDetail(order)">详情</button>
          </view>
        </view>

        <view v-if="orders.length === 0 && !loading" class="empty-tip">
          <text>还没有报名活动，去活动中心逛逛吧</text>
          <button class="go-login-btn browse-btn" @tap="goCampaign">浏览活动</button>
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
import { getMyOrders, payOrder, invokePayment, type OrderVO } from '@scrm/h5-commerce'
import { getEventDetail } from '../../api/event'
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
  { label: '待支付', value: 'pending' },
  { label: '已报名', value: 'paid' },
  { label: '已签到', value: 'checked_in' },
]

const STATUS_TEXT: Record<string, string> = {
  pending: '待支付',
  paid: '已报名',
  checked_in: '已签到',
  completed: '已完成',
  refunded: '已退款',
  refund_failed: '退款失败',
  cancelled: '已取消',
}

const orders = ref<OrderRow[]>([])
const activeStatus = ref('')
const page = ref(1)
const lastPage = ref(1)
const loading = ref(false)
const loadError = ref(false)
const paying = ref('')
// 活动名懒加载缓存（订单不冗余实体名，按 entity_id 去重拉取详情补全）
const titleCache = ref<Record<string, string>>({})
const loggedIn = computed(() => isLoggedIn())

useTenantTitle()

function statusText(status: string) {
  return STATUS_TEXT[status] || status
}

function canEvaluate(order: OrderRow) {
  return ['paid', 'checked_in', 'completed'].includes(order.status)
}

function activityTitle(order: OrderRow) {
  if (order.entity_id && titleCache.value[String(order.entity_id)]) {
    return titleCache.value[String(order.entity_id)]
  }
  return (order.metadata?.activity_name as string) || ticketName(order) || '活动报名'
}

function ticketName(order: OrderRow) {
  const first: any = (order.items || [])[0]
  return first?.item_name || first?.name || ''
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
      order_type: 'registration',
      status: activeStatus.value || undefined,
      per_page: 10,
      page: page.value,
    })
    const list = (res?.data || []) as OrderRow[]
    orders.value = reset ? list : [...orders.value, ...list]
    lastPage.value = res?.last_page || 1
    enrichTitles()
  } catch {
    if (reset) orders.value = []
    loadError.value = true
  } finally {
    loading.value = false
  }
}

/** 并发补全活动标题（按 entity_id 去重 + 缓存，避免翻页重复请求） */
async function enrichTitles() {
  const ids = [
    ...new Set(
      orders.value
        .filter(
          (o) =>
            o.entity_type === 'activity' && o.entity_id && !titleCache.value[String(o.entity_id)],
        )
        .map((o) => String(o.entity_id)),
    ),
  ]
  await Promise.all(
    ids.map(async (id) => {
      try {
        const d: any = await getEventDetail(id)
        if (d?.name) titleCache.value[id] = d.name
      } catch {
        /* 补全失败不影响列表主体展示 */
      }
    }),
  )
}

function reload() {
  loadOrders(true)
}

function switchStatus(status: string) {
  if (activeStatus.value === status) return
  activeStatus.value = status
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

function pollRefresh(retries = 3) {
  let count = 0
  const timer = setInterval(async () => {
    count++
    await loadOrders(true)
    const stillPending = orders.value.some((o) => o.status === 'pending')
    if (!stillPending || count >= retries) clearInterval(timer)
  }, 2000)
}

function goActivity(order: OrderRow) {
  if (order.entity_id) {
    uni.navigateTo({ url: `/pages/event/detail?eventId=${order.entity_id}` })
  } else {
    goDetail(order)
  }
}

function goEvaluate(order: OrderRow) {
  uni.navigateTo({
    url: `/pages/event/evaluate?eventId=${order.entity_id}&orderNo=${order.order_no}`,
  })
}

function goDetail(order: OrderRow) {
  uni.navigateTo({ url: `/pages/event/order?orderNo=${order.order_no}` })
}

function goCampaign() {
  uni.switchTab({ url: '/pages/campaign/index' })
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
.activities-page {
  min-height: 100vh;
  background: #f5f6fa;
}
.status-tabs {
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
.act-list {
  padding: 20rpx 24rpx;
}
.act-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}
.act-main {
  display: flex;
  flex-direction: column;
}
.act-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}
.act-meta {
  display: flex;
  align-items: center;
  margin-top: 12rpx;
}
.status-badge {
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 20rpx;
  background: #f0f0f0;
  color: #999;
}
.status-badge.st-pending {
  background: #fff7e6;
  color: #f39c12;
}
.status-badge.st-paid,
.status-badge.st-checked_in,
.status-badge.st-completed {
  background: #e6f7ee;
  color: var(--scrm-primary);
}
.ticket {
  font-size: 22rpx;
  color: #576b95;
  background: #eef2fb;
  padding: 4rpx 14rpx;
  border-radius: 20rpx;
  margin-left: 12rpx;
}
.act-time {
  font-size: 22rpx;
  color: #bbb;
  margin-top: 12rpx;
}
.act-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16rpx;
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 1px solid #f5f5f5;
}
.btn {
  margin: 0;
  padding: 0 30rpx;
  height: 60rpx;
  line-height: 60rpx;
  font-size: 26rpx;
  border-radius: 30rpx;
  background: #f2f3f5;
  color: #555;
}
.btn.primary {
  background: #e64340;
  color: #fff;
}
.btn.ghost {
  background: #fff;
  color: #888;
  border: 1px solid #e0e0e0;
}
.btn[disabled] {
  opacity: 0.6;
}
.empty-tip {
  text-align: center;
  padding: 100rpx 0 40rpx;
  color: #999;
  font-size: 28rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32rpx;
}
.browse-btn {
  width: 280rpx;
}
.loading-tip {
  text-align: center;
  padding: 40rpx 0;
  color: #999;
  font-size: 26rpx;
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
