<template>
  <view class="shop-page">
    <NavBar title="商城" />
    <view v-if="loading" class="loading-tip">
      <text>加载中...</text>
    </view>
    <view v-else-if="products.length === 0" class="empty-tip">
      <text>暂无上架商品</text>
    </view>
    <view v-else class="product-grid">
      <view
        v-for="item in products"
        :key="item.product_id"
        class="product-card"
        @tap="goDetail(item.product_id)"
      >
        <image v-if="coverOf(item)" class="product-image" :src="coverOf(item)" mode="aspectFill" />
        <view v-else class="product-image placeholder">
          <text>{{ item.name.slice(0, 1) }}</text>
        </view>
        <view class="product-info">
          <text class="product-name">
            {{ item.name }}
          </text>
          <view class="product-price-row">
            <text v-if="Number(item.price) > 0" class="price">
              ¥{{ Number(item.price).toFixed(2) }}
            </text>
            <text v-else class="price free"> 免费 </text>
            <text v-if="item.sale_mode !== 'cash'" class="sale-mode">
              {{ saleModeLabel(item.sale_mode) }}
            </text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getShopProducts, type ShopProduct } from '../../api/shop'
import { useTenantTitle } from '../../composables/useTenantTitle'
import NavBar from '../../components/NavBar.vue'

useTenantTitle()

const products = ref<ShopProduct[]>([])
const loading = ref(false)

function coverOf(item: ShopProduct): string {
  return item.media_assets?.[0]?.url ?? ''
}

function saleModeLabel(mode?: string): string {
  const map: Record<string, string> = { points: '积分可兑', mixed: '支持混合付' }
  return map[mode || ''] ?? ''
}

function goDetail(id: number) {
  uni.navigateTo({ url: `/pages/shop/detail?id=${id}` })
}

async function load() {
  loading.value = true
  try {
    const res = await getShopProducts()
    products.value = res.data || []
  } catch {
    products.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.shop-page {
  min-height: 100vh;
  background: #f5f6fa;
}
.loading-tip,
.empty-tip {
  text-align: center;
  padding: 120rpx 0;
  color: #999;
  font-size: 28rpx;
}
.product-grid {
  display: flex;
  flex-wrap: wrap;
  padding: 24rpx 16rpx;
}
.product-card {
  width: calc(50% - 16rpx);
  margin: 8rpx;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}
.product-image {
  width: 100%;
  height: 340rpx;
  background: #f0f0f0;
}
.product-image.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 80rpx;
  color: #ccc;
  background: linear-gradient(135deg, #e8f5ee 0%, #d6ecdd 100%);
}
.product-info {
  padding: 16rpx 20rpx 24rpx;
}
.product-name {
  font-size: 28rpx;
  color: #333;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}
.product-price-row {
  margin-top: 12rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.price {
  font-size: 32rpx;
  font-weight: 700;
  color: #e64340;
}
.price.free {
  color: #07c160;
}
.sale-mode {
  font-size: 22rpx;
  color: #07c160;
  border: 1px solid #07c160;
  border-radius: 8rpx;
  padding: 2rpx 10rpx;
}
</style>
