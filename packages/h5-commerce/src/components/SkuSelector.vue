<template>
  <view class="h5c-sku-list">
    <view
      v-for="sku in skus"
      :key="sku.sku_id"
      class="h5c-sku-item"
      :class="{ active: selectedId === sku.sku_id, disabled: sku.stock <= 0 }"
      @tap="handleSelect(sku)"
    >
      <text class="h5c-sku-name">
        {{ sku.name }}
      </text>
      <text class="h5c-sku-meta">
        ¥{{ Number(sku.price).toFixed(2) }}
        <template v-if="Number(sku.points_price) > 0"> / {{ sku.points_price }}积分 </template>
      </text>
      <text v-if="sku.stock <= 0" class="h5c-sku-soldout"> 已售罄 </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { ShopSku } from '../api/shop'

defineProps<{
  skus: ShopSku[]
  /** 当前选中 SKU id */
  selectedId?: number | null
}>()

const emit = defineEmits<{
  (e: 'select', sku: ShopSku): void
}>()

function handleSelect(sku: ShopSku) {
  if (sku.stock <= 0) return
  emit('select', sku)
}
</script>

<style scoped>
.h5c-sku-list {
  margin-top: 20rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.h5c-sku-item {
  position: relative;
  padding: 16rpx 28rpx;
  border: 1px solid #ddd;
  border-radius: 12rpx;
  display: flex;
  flex-direction: column;
}
.h5c-sku-item.active {
  border-color: #07c160;
  background: #e8f8ee;
}
.h5c-sku-item.disabled {
  opacity: 0.5;
}
.h5c-sku-name {
  font-size: 26rpx;
  color: #333;
}
.h5c-sku-meta {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #e64340;
}
.h5c-sku-soldout {
  position: absolute;
  right: 8rpx;
  top: 4rpx;
  font-size: 20rpx;
  color: #999;
}
</style>
