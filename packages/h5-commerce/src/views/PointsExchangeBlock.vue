<template>
  <view class="h5c-mall-section">
    <view class="mall-header">
      <text class="mall-title"> 积分商城 </text>
      <text class="mall-tip"> 兑换将生成统一订单并即时完成 </text>
    </view>
    <view v-if="loading" class="loading-tip">
      <text>加载中...</text>
    </view>
    <view v-else-if="products.length === 0" class="empty-tip">
      <text>暂无可兑换商品</text>
    </view>
    <view v-for="p in products" :key="p.id" class="mall-item">
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
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getPointsProducts, exchangePointsProduct, type PointsProduct } from '../api/exchange'

const emit = defineEmits<{
  /** 兑换成功后触发，宿主可刷新积分余额/流水 */
  (e: 'exchanged'): void
}>()

const products = ref<PointsProduct[]>([])
const loading = ref(false)
const exchanging = ref(false)

async function load() {
  loading.value = true
  try {
    products.value = await getPointsProducts()
  } catch {
    products.value = []
  } finally {
    loading.value = false
  }
}

function handleExchange(p: PointsProduct) {
  uni.showModal({
    title: '确认兑换',
    content: `确定使用 ${p.points_cost} 积分兑换「${p.name}」吗？`,
    success: async (res) => {
      if (!res.confirm) return
      exchanging.value = true
      try {
        await exchangePointsProduct(p.id, 1)
        uni.showToast({ title: '兑换成功', icon: 'success' })
        emit('exchanged')
      } catch (e: any) {
        uni.showToast({ title: e.message || '兑换失败', icon: 'none' })
      } finally {
        exchanging.value = false
      }
    },
  })
}

onMounted(load)
</script>

<style scoped>
.h5c-mall-section {
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
.loading-tip,
.empty-tip {
  text-align: center;
  padding: 60rpx 0;
  color: #999;
  font-size: 28rpx;
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
