<template>
  <view class="h5c-shop-page">
    <NavBar :title="title" :show-back="showBack" />
    <view v-if="loading" class="loading-tip">
      <text>加载中...</text>
    </view>
    <view v-else-if="products.length === 0" class="empty-tip">
      <text>暂无上架商品</text>
    </view>
    <view v-else class="product-grid">
      <ProductCard
        v-for="item in products"
        :key="item.product_id"
        :product="item"
        @click="goDetail"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getShopProducts, type ShopProduct } from '../api/shop'
import { navShopDetail } from '../config'
import NavBar from '../components/NavBar.vue'
import ProductCard from '../components/ProductCard.vue'

withDefaults(
  defineProps<{
    /** 导航栏标题 */
    title?: string
    /** 是否显示返回按钮（tabbar 页传 false） */
    showBack?: boolean
  }>(),
  {
    title: '商城',
    showBack: true,
  },
)

const products = ref<ShopProduct[]>([])
const loading = ref(false)

function goDetail(item: ShopProduct) {
  navShopDetail(item.product_id)
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
.h5c-shop-page {
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
</style>
