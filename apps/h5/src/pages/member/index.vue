<template>
  <view class="member-page">
    <NavBar title="我的积分" />
    <!-- 积分卡片 -->
    <view class="points-card">
      <view class="points-header">
        <text class="points-label"> 我的积分 </text>
        <text v-if="balanceData.linked" class="points-name">
          {{ balanceData.customer_name }}
        </text>
      </view>
      <view class="points-value">
        <text class="points-num">
          {{ balanceData.balance }}
        </text>
        <text class="points-unit"> 分 </text>
      </view>
      <view v-if="!balanceData.linked" class="points-unlinked">
        <text>尚未关联会员档案，到店消费后自动关联</text>
      </view>
    </view>

    <!-- 积分商城 -->
    <view class="mall-section">
      <view class="mall-header">
        <text class="mall-title"> 积分商城 </text>
        <text class="mall-tip"> 兑换将生成统一订单并即时完成 </text>
      </view>
      <view v-if="mallLoading" class="loading-tip">
        <text>加载中...</text>
      </view>
      <view v-else-if="mallProducts.length === 0" class="empty-tip">
        <text>暂无可兑换商品</text>
      </view>
      <view v-for="p in mallProducts" :key="p.id" class="mall-item">
        <image v-if="p.image" class="mall-image" :src="p.image" mode="aspectFill" />
        <view v-else class="mall-image placeholder">
          <text>{{ p.name.slice(0, 1) }}</text>
        </view>
        <view class="mall-info">
          <text class="mall-name">
            {{ p.name }}
          </text>
          <text class="mall-cost"> {{ p.points_cost }} 积分 </text>
        </view>
        <button class="exchange-btn" :disabled="exchanging" @tap="handleExchange(p)">兑换</button>
      </view>
    </view>

    <!-- 筛选 Tab -->
    <view class="filter-tabs">
      <view
        v-for="tab in tabs"
        :key="tab.value"
        class="tab-item"
        :class="{ active: activeTab === tab.value }"
        @tap="switchTab(tab.value)"
      >
        <text>{{ tab.label }}</text>
      </view>
    </view>

    <!-- 流水列表 -->
    <view class="flow-list">
      <view v-if="loading" class="loading-tip">
        <text>加载中...</text>
      </view>
      <view v-else-if="flowItems.length === 0" class="empty-tip">
        <text>暂无积分记录</text>
      </view>
      <view v-for="item in flowItems" :key="item.id" class="flow-item">
        <view class="flow-left">
          <text class="flow-desc">
            {{ item.description || typeLabel(item.type) }}
          </text>
          <text class="flow-time">
            {{ formatTime(item.created_at) }}
          </text>
        </view>
        <text class="flow-points" :class="item.points > 0 ? 'earn' : 'spend'">
          {{ item.points > 0 ? '+' : '' }}{{ item.points }}
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  getMyPointsBalance,
  getMyPointsFlow,
  getPointsProducts,
  exchangePointsProduct,
} from '../../api/member'
import type { PointsBalance, PointsFlowItem, PointsProduct } from '../../api/member'
import { useTenantTitle } from '../../composables/useTenantTitle'
import NavBar from '../../components/NavBar.vue'

const balanceData = ref<PointsBalance>({ balance: 0, linked: false })

// 微信原生栏标题统一为租户名
useTenantTitle()
const flowItems = ref<PointsFlowItem[]>([])
const loading = ref(false)
const activeTab = ref('')

// 积分商城
const mallProducts = ref<PointsProduct[]>([])
const mallLoading = ref(false)
const exchanging = ref(false)

async function loadMall() {
  mallLoading.value = true
  try {
    mallProducts.value = await getPointsProducts()
  } catch {
    mallProducts.value = []
  } finally {
    mallLoading.value = false
  }
}

async function handleExchange(p: PointsProduct) {
  uni.showModal({
    title: '确认兑换',
    content: `确定使用 ${p.points_cost} 积分兑换「${p.name}」吗？`,
    success: async (res) => {
      if (!res.confirm) return
      exchanging.value = true
      try {
        await exchangePointsProduct(p.id, 1)
        uni.showToast({ title: '兑换成功', icon: 'success' })
        await loadBalance()
        await loadFlow()
      } catch (e: any) {
        uni.showToast({ title: e.message || '兑换失败', icon: 'none' })
      } finally {
        exchanging.value = false
      }
    },
  })
}

const tabs = [
  { label: '全部', value: '' },
  { label: '获取', value: 'earn' },
  { label: '消耗', value: 'consume' },
]

function typeLabel(type: string): string {
  const map: Record<string, string> = {
    earn: '积分获取',
    consume: '积分消耗',
    adjust: '积分调整',
    exchange: '积分兑换',
    expire: '积分过期',
  }
  return map[type] || type
}

function formatTime(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function loadBalance() {
  try {
    balanceData.value = await getMyPointsBalance()
  } catch {
    // 静默失败
  }
}

async function loadFlow() {
  loading.value = true
  try {
    const res = await getMyPointsFlow(activeTab.value || undefined)
    flowItems.value = res.items || []
  } catch {
    flowItems.value = []
  } finally {
    loading.value = false
  }
}

function switchTab(value: string) {
  activeTab.value = value
  loadFlow()
}

onMounted(() => {
  loadBalance()
  loadFlow()
  loadMall()
})
</script>

<style scoped>
.member-page {
  min-height: 100vh;
  background: #f5f6fa;
}
.points-card {
  margin: 24rpx;
  padding: 40rpx 36rpx;
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
  border-radius: 20rpx;
  color: #fff;
}
.points-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.points-label {
  font-size: 28rpx;
  opacity: 0.9;
}
.points-name {
  font-size: 24rpx;
  opacity: 0.7;
}
.points-value {
  margin-top: 20rpx;
  display: flex;
  align-items: baseline;
}
.points-num {
  font-size: 72rpx;
  font-weight: 700;
}
.points-unit {
  font-size: 28rpx;
  margin-left: 8rpx;
  opacity: 0.8;
}
.points-unlinked {
  margin-top: 16rpx;
  font-size: 24rpx;
  opacity: 0.7;
}
.filter-tabs {
  display: flex;
  padding: 0 24rpx;
  margin-top: 8rpx;
}
.tab-item {
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
  font-size: 28rpx;
  color: #666;
  border-bottom: 4rpx solid transparent;
}
.tab-item.active {
  color: #07c160;
  font-weight: 600;
  border-bottom-color: #07c160;
}
.flow-list {
  margin: 16rpx 24rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 0 28rpx;
}
.loading-tip,
.empty-tip {
  text-align: center;
  padding: 60rpx 0;
  color: #999;
  font-size: 28rpx;
}
.flow-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 0;
  border-bottom: 1px solid #f8f8f8;
}
.flow-item:last-child {
  border-bottom: none;
}
.flow-left {
  display: flex;
  flex-direction: column;
}
.flow-desc {
  font-size: 28rpx;
  color: #333;
}
.flow-time {
  font-size: 22rpx;
  color: #bbb;
  margin-top: 8rpx;
}
.flow-points {
  font-size: 32rpx;
  font-weight: 600;
}
.flow-points.earn {
  color: #07c160;
}
.flow-points.spend {
  color: #e64340;
}
.mall-section {
  margin: 24rpx;
  padding: 0 28rpx 16rpx;
  background: #fff;
  border-radius: 16rpx;
}
.mall-header {
  padding: 24rpx 0 8rpx;
}
.mall-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}
.mall-tip {
  margin-left: 16rpx;
  font-size: 22rpx;
  color: #bbb;
}
.mall-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1px solid #f8f8f8;
}
.mall-item:last-child {
  border-bottom: none;
}
.mall-image {
  width: 100rpx;
  height: 100rpx;
  border-radius: 12rpx;
  background: #f0f0f0;
  flex-shrink: 0;
}
.mall-image.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  color: #ccc;
  background: #e8f5ee;
}
.mall-info {
  flex: 1;
  margin-left: 20rpx;
  display: flex;
  flex-direction: column;
}
.mall-name {
  font-size: 28rpx;
  color: #333;
}
.mall-cost {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #ff9500;
}
.exchange-btn {
  margin: 0;
  padding: 0 32rpx;
  height: 60rpx;
  line-height: 60rpx;
  font-size: 26rpx;
  background: #07c160;
  color: #fff;
  border-radius: 30rpx;
}
.exchange-btn[disabled] {
  opacity: 0.6;
}
</style>
