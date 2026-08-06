<template>
  <view class="h5c-product-card" @tap="emit('click', product)">
    <image v-if="cover" class="h5c-product-image" :src="cover" mode="aspectFill" />
    <view v-else class="h5c-product-image placeholder">
      <text>{{ product.name.slice(0, 1) }}</text>
    </view>
    <view class="h5c-product-info">
      <text class="h5c-product-name">
        {{ product.name }}
      </text>
      <view class="h5c-product-price-row">
        <text v-if="Number(product.price) > 0" class="h5c-price">
          ¥{{ Number(product.price).toFixed(2) }}
        </text>
        <text v-else class="h5c-price free"> 免费 </text>
        <text v-if="product.sale_mode !== 'cash'" class="h5c-sale-mode">
          {{ saleModeLabel(product.sale_mode) }}
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ShopProduct } from '../api/shop'

const props = defineProps<{
  product: ShopProduct
}>()

const emit = defineEmits<{
  (e: 'click', product: ShopProduct): void
}>()

const cover = computed(() => props.product.media_assets?.[0]?.url ?? '')

function saleModeLabel(mode?: string): string {
  const map: Record<string, string> = { points: '积分可兑', mixed: '支持混合付' }
  return map[mode || ''] ?? ''
}
</script>

<style scoped>
.h5c-product-card {
  width: calc(50% - 16rpx);
  margin: 8rpx;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}
.h5c-product-image {
  width: 100%;
  height: 340rpx;
  background: #f0f0f0;
}
.h5c-product-image.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 80rpx;
  color: #ccc;
  background: linear-gradient(135deg, #e8f5ee 0%, #d6ecdd 100%);
}
.h5c-product-info {
  padding: 16rpx 20rpx 24rpx;
}
.h5c-product-name {
  font-size: 28rpx;
  color: #333;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}
.h5c-product-price-row {
  margin-top: 12rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.h5c-price {
  font-size: 32rpx;
  font-weight: 700;
  color: #e64340;
}
.h5c-price.free {
  color: #07c160;
}
.h5c-sale-mode {
  font-size: 22rpx;
  color: #07c160;
  border: 1px solid #07c160;
  border-radius: 8rpx;
  padding: 2rpx 10rpx;
}
</style>
