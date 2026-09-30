<template>
  <view class="coupons-page">
    <NavBar title="我的优惠券" />

    <view v-if="!loggedIn" class="login-prompt">
      <text class="login-tip-text"> 登录后查看你的优惠券 </text>
      <button class="go-login-btn" @tap="goLogin">去登录</button>
    </view>

    <template v-else>
      <view class="filter-bar">
        <view
          v-for="tab in STATUS_TABS"
          :key="tab.value"
          class="filter-tab"
          :class="{ active: activeStatus === tab.value }"
          @tap="onFilter(tab.value)"
        >
          <text>{{ tab.label }}</text>
        </view>
      </view>

      <ErrorState
        v-if="loadError && coupons.length === 0"
        message="优惠券加载失败，请稍后重试"
        @retry="load"
      />

      <view v-else class="coupon-list">
        <view
          v-for="c in coupons"
          :key="c.coupon_id"
          class="coupon-card"
          :class="{ disabled: c.status !== 'available' }"
        >
          <view class="coupon-left">
            <text class="coupon-value">
              {{ valueText(c) }}
            </text>
            <text class="coupon-unit">
              {{ unitText(c) }}
            </text>
          </view>
          <view class="coupon-mid">
            <text class="coupon-desc">
              {{ c.description || typeLabel(c.type) }}
            </text>
            <text v-if="conditionText(c)" class="coupon-cond">
              {{ conditionText(c) }}
            </text>
            <text class="coupon-expire">
              {{ expireText(c) }}
            </text>
          </view>
          <view class="coupon-right">
            <text class="coupon-status" :class="c.status">
              {{ statusText(c.status) }}
            </text>
            <text class="coupon-code">
              {{ c.code }}
            </text>
          </view>
        </view>

        <view v-if="coupons.length === 0 && !loading" class="empty-tip">
          <text>{{ emptyText }}</text>
        </view>
        <view v-if="loading" class="loading-tip">
          <text>加载中...</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { getMyCoupons, type MyCoupon } from '../../api/marketing'
import { fenToYuan } from '@scrm/h5-commerce'
import { isLoggedIn } from '../../api/auth'
import { redirectToLogin } from '../../utils/request'
import { useTenantTitle } from '../../composables/useTenantTitle'
import NavBar from '../../components/NavBar.vue'
import ErrorState from '../../components/ErrorState.vue'

const STATUS_TABS = [
  { label: '全部', value: '' },
  { label: '可用', value: 'available' },
  { label: '已使用', value: 'used' },
  { label: '已过期', value: 'expired' },
]

const STATUS_TEXT: Record<string, string> = {
  available: '可使用',
  used: '已使用',
  expired: '已过期',
  disabled: '已停用',
  not_started: '未开始',
}

const coupons = ref<MyCoupon[]>([])
const activeStatus = ref('')
const loading = ref(false)
const loadError = ref(false)
const loggedIn = computed(() => isLoggedIn())

const emptyText = computed(() =>
  activeStatus.value === 'available' ? '暂无可用优惠券' : '还没有优惠券，参与活动即可领取',
)

useTenantTitle()

function currencySymbol(c: MyCoupon) {
  return c.currency === 'USD' ? '$' : '￥'
}

/** 折扣率 bp（万分之一）→ 百分数值串（去尾零）：1000 → '10'、999 → '9.99' */
function bpToPercent(bp: number): string {
  return String(Number((bp / 100).toFixed(2)))
}

function valueText(c: MyCoupon) {
  const v = Number(c.value || 0)
  if (c.type === 'percentage') return bpToPercent(v)
  if (c.type === 'exchange') return '兑换'
  return `${currencySymbol(c)}${fenToYuan(v)}`
}

function unitText(c: MyCoupon) {
  if (c.type === 'percentage') return '% 折扣'
  if (c.type === 'exchange') return '券'
  return '立减'
}

function typeLabel(type: string) {
  const map: Record<string, string> = {
    fixed: '满减券',
    percentage: '折扣券',
    exchange: '兑换券',
    cash: '现金券',
  }
  return map[type] || '优惠券'
}

function conditionText(c: MyCoupon) {
  const parts: string[] = []
  const min = Number(c.min_amount || 0)
  if (min > 0) parts.push(`满 ${currencySymbol(c)}${fenToYuan(min)} 可用`)
  const max = Number(c.max_discount || 0)
  if (c.type === 'percentage' && max > 0) parts.push(`最高减 ${currencySymbol(c)}${fenToYuan(max)}`)
  return parts.join(' · ')
}

function statusText(status: string) {
  return STATUS_TEXT[status] || status
}

function expireText(c: MyCoupon) {
  if (!c.expires_at) return '长期有效'
  return `${formatDate(c.expires_at)} 到期`
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return ''
  const d = new Date(String(dateStr).replace(' ', 'T'))
  if (isNaN(d.getTime())) return String(dateStr).slice(0, 10)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function load() {
  if (!isLoggedIn()) return
  loading.value = true
  loadError.value = false
  try {
    const res: any = await getMyCoupons(activeStatus.value || undefined)
    coupons.value = Array.isArray(res) ? res : res?.data || []
  } catch {
    coupons.value = []
    loadError.value = true
  } finally {
    loading.value = false
  }
}

function onFilter(value: string) {
  if (activeStatus.value === value) return
  activeStatus.value = value
  coupons.value = []
  load()
}

function goLogin() {
  redirectToLogin()
}

onShow(load)

onPullDownRefresh(async () => {
  await load()
  uni.stopPullDownRefresh()
})
</script>

<style scoped>
.coupons-page {
  min-height: 100vh;
  background: #f5f6fa;
}
.filter-bar {
  display: flex;
  background: #fff;
  padding: 0 12rpx;
  position: sticky;
  top: 0;
  z-index: 5;
}
.filter-tab {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  font-size: 28rpx;
  color: #666;
  position: relative;
}
.filter-tab.active {
  color: var(--scrm-primary);
  font-weight: 600;
}
.filter-tab.active::after {
  content: '';
  position: absolute;
  bottom: 8rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 48rpx;
  height: 6rpx;
  border-radius: 3rpx;
  background: var(--scrm-primary);
}
.coupon-list {
  padding: 20rpx 24rpx;
}
.coupon-card {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 16rpx;
  padding: 28rpx 20rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}
.coupon-card.disabled {
  opacity: 0.55;
}
.coupon-left {
  width: 180rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-right: 2rpx dashed #eee;
  flex-shrink: 0;
}
.coupon-value {
  font-size: 44rpx;
  font-weight: 700;
  color: #ff5a3c;
}
.coupon-unit {
  font-size: 22rpx;
  color: #ff8b6b;
  margin-top: 6rpx;
}
.coupon-mid {
  flex: 1;
  padding: 0 20rpx;
  display: flex;
  flex-direction: column;
}
.coupon-desc {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}
.coupon-cond {
  font-size: 22rpx;
  color: #999;
  margin-top: 10rpx;
}
.coupon-expire {
  font-size: 22rpx;
  color: #bbb;
  margin-top: 8rpx;
}
.coupon-right {
  width: 140rpx;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
}
.coupon-status {
  font-size: 24rpx;
  color: var(--scrm-primary);
  font-weight: 600;
}
.coupon-status.used,
.coupon-status.expired,
.coupon-status.disabled {
  color: #bbb;
}
.coupon-code {
  font-size: 20rpx;
  color: #ccc;
  margin-top: 12rpx;
  word-break: break-all;
  text-align: right;
}
.empty-tip {
  text-align: center;
  padding: 120rpx 40rpx;
  color: #999;
  font-size: 28rpx;
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
