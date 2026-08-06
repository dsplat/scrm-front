<template>
  <view class="h5c-detail-page">
    <NavBar :title="title" />
    <view v-if="loading" class="loading-tip">
      <text>加载中...</text>
    </view>
    <template v-else-if="product">
      <image v-if="cover" class="cover" :src="cover" mode="aspectFill" />
      <view class="info-card">
        <text class="title">
          {{ product.name }}
        </text>
        <view class="price-row">
          <text v-if="Number(currentPrice) > 0" class="price">
            ¥{{ Number(currentPrice).toFixed(2) }}
          </text>
          <text v-else class="price free"> 免费 </text>
          <text v-if="Number(currentPointsPrice) > 0" class="points-price">
            {{ currentPointsPrice }}积分
          </text>
        </view>
        <text v-if="product.description" class="desc">
          {{ product.description }}
        </text>
      </view>

      <!-- SKU 选择 -->
      <view v-if="skus.length > 0" class="section-card">
        <text class="section-title"> 选择规格 </text>
        <SkuSelector :skus="skus" :selected-id="selectedSku?.sku_id" @select="selectSku" />
      </view>

      <!-- 数量 -->
      <view class="section-card qty-row">
        <text class="section-title"> 数量 </text>
        <view class="qty-control">
          <view class="qty-btn" @tap="changeQty(-1)">
            <text>-</text>
          </view>
          <text class="qty-num">
            {{ quantity }}
          </text>
          <view class="qty-btn" @tap="changeQty(1)">
            <text>+</text>
          </view>
        </view>
      </view>

      <!-- 支付方式 -->
      <view v-if="payMethods.length > 1" class="section-card">
        <text class="section-title"> 支付方式 </text>
        <view class="pay-methods">
          <view
            v-for="m in payMethods"
            :key="m.value"
            class="pay-method-item"
            :class="{ active: payMethod === m.value }"
            @tap="payMethod = m.value"
          >
            <text>{{ m.label }}</text>
          </view>
        </view>
        <text v-if="payMethod === 'mixed'" class="pay-tip">
          混合支付：积分按配置比例折现抵扣，剩余部分现金支付
        </text>
      </view>

      <!-- 底部下单栏 -->
      <view class="bottom-bar">
        <view class="total">
          <text class="total-label"> 合计： </text>
          <text class="total-amount"> ¥{{ totalAmount }} </text>
          <text v-if="totalPoints > 0" class="total-points"> +{{ totalPoints }}积分 </text>
        </view>
        <button class="buy-btn" :disabled="submitting" @tap="handleBuy">
          {{ submitting ? '提交中...' : '立即购买' }}
        </button>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  getShopProductDetail,
  createOrder,
  payOrder,
  getMyOrders,
  type ShopProduct,
  type ShopSku,
} from '../api/shop'
import { invokePayment, pollUntil } from '../utils/payment'
import NavBar from '../components/NavBar.vue'
import SkuSelector from '../components/SkuSelector.vue'

const props = withDefaults(
  defineProps<{
    /** 商品 id（宿主页面 onLoad 解析后传入） */
    productId?: number
    title?: string
  }>(),
  {
    productId: 0,
    title: '商品详情',
  },
)

const product = ref<ShopProduct | null>(null)
const skus = ref<ShopSku[]>([])
const selectedSku = ref<ShopSku | null>(null)
const quantity = ref(1)
const loading = ref(false)
const submitting = ref(false)
const payMethod = ref<'cash' | 'points' | 'mixed'>('cash')

const cover = computed(() => product.value?.media_assets?.[0]?.url ?? '')

const currentPrice = computed(() => {
  if (selectedSku.value) return selectedSku.value.price
  return product.value?.price ?? 0
})

const currentPointsPrice = computed(() => {
  return selectedSku.value?.points_price ?? 0
})

const totalAmount = computed(() => {
  if (payMethod.value === 'points') return '0.00'
  return (Number(currentPrice.value) * quantity.value).toFixed(2)
})

const totalPoints = computed(() => {
  if (payMethod.value === 'cash') return 0
  return Number(currentPointsPrice.value) * quantity.value
})

const payMethods = computed(() => {
  const mode = product.value?.sale_mode ?? 'cash'
  const hasPointsSku = Number(currentPointsPrice.value) > 0
  if (mode === 'points' || (hasPointsSku && mode !== 'cash' && mode !== 'mixed')) {
    return [{ label: '积分支付', value: 'points' as const }]
  }
  if (mode === 'mixed' && hasPointsSku) {
    return [
      { label: '现金支付', value: 'cash' as const },
      { label: '积分支付', value: 'points' as const },
      { label: '混合支付', value: 'mixed' as const },
    ]
  }
  return [{ label: '现金支付', value: 'cash' as const }]
})

function selectSku(sku: ShopSku) {
  if (sku.stock <= 0) return
  selectedSku.value = sku
  // SKU 切换后校正支付方式可用性
  if (!payMethods.value.some((m) => m.value === payMethod.value)) {
    payMethod.value = payMethods.value[0].value
  }
}

function changeQty(delta: number) {
  const max = selectedSku.value?.stock ?? 99
  const next = quantity.value + delta
  if (next < 1 || next > Math.max(1, max)) return
  quantity.value = next
}

async function load() {
  if (!props.productId) return
  loading.value = true
  try {
    const res = await getShopProductDetail(props.productId)
    product.value = res.product
    skus.value = res.skus || []
    selectedSku.value = skus.value.find((s) => s.stock > 0) ?? null
    payMethod.value = payMethods.value[0].value
  } catch (e: any) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function handleBuy() {
  if (!selectedSku.value) {
    uni.showToast({ title: '请选择规格', icon: 'none' })
    return
  }
  if (selectedSku.value.stock < quantity.value) {
    uni.showToast({ title: '库存不足', icon: 'none' })
    return
  }

  submitting.value = true
  try {
    const order = await createOrder({
      order_type: 'product',
      pay_method: payMethod.value,
      items: [
        {
          sku_id: selectedSku.value.sku_id,
          item_name: `${product.value?.name ?? ''} ${selectedSku.value.name}`.trim(),
          quantity: quantity.value,
        },
      ],
    })

    const payRes: any = await payOrder(order.order_no)

    if (payRes?.paid) {
      uni.showToast({ title: '支付成功', icon: 'success' })
      return
    }

    await invokePayment(payRes?.pay_data || {})
    // 现金支付：轮询订单状态
    pollUntil(async () => {
      const res = await getMyOrders({ status: 'paid', per_page: 5 })
      return (res.data || []).some((o) => o.order_no === order.order_no)
    })
  } catch (e: any) {
    uni.showToast({ title: e.message || '下单失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

watch(
  () => props.productId,
  () => load(),
  { immediate: true },
)
</script>

<style scoped>
.h5c-detail-page {
  min-height: 100vh;
  background: #f5f6fa;
  padding-bottom: 140rpx;
}
.loading-tip {
  text-align: center;
  padding: 120rpx 0;
  color: #999;
  font-size: 28rpx;
}
.cover {
  width: 100%;
  height: 560rpx;
  background: #f0f0f0;
}
.info-card {
  margin: 24rpx;
  padding: 28rpx;
  background: #fff;
  border-radius: 16rpx;
}
.title {
  font-size: 34rpx;
  font-weight: 600;
  color: #333;
}
.price-row {
  margin-top: 16rpx;
  display: flex;
  align-items: baseline;
  gap: 16rpx;
}
.price {
  font-size: 40rpx;
  font-weight: 700;
  color: #e64340;
}
.price.free {
  color: #07c160;
}
.points-price {
  font-size: 26rpx;
  color: #ff9500;
}
.desc {
  margin-top: 16rpx;
  font-size: 26rpx;
  color: #888;
  line-height: 1.6;
}
.section-card {
  margin: 24rpx;
  padding: 28rpx;
  background: #fff;
  border-radius: 16rpx;
}
.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}
.qty-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.qty-control {
  display: flex;
  align-items: center;
}
.qty-btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 12rpx;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  color: #333;
}
.qty-num {
  margin: 0 28rpx;
  font-size: 30rpx;
  color: #333;
}
.pay-methods {
  margin-top: 20rpx;
  display: flex;
  gap: 16rpx;
}
.pay-method-item {
  padding: 16rpx 32rpx;
  border: 1px solid #ddd;
  border-radius: 12rpx;
  font-size: 26rpx;
  color: #333;
}
.pay-method-item.active {
  border-color: #07c160;
  background: #e8f8ee;
  color: #07c160;
}
.pay-tip {
  margin-top: 16rpx;
  font-size: 22rpx;
  color: #999;
}
.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fff;
  padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.05);
}
.total {
  display: flex;
  align-items: baseline;
}
.total-label {
  font-size: 26rpx;
  color: #666;
}
.total-amount {
  font-size: 38rpx;
  font-weight: 700;
  color: #e64340;
}
.total-points {
  margin-left: 8rpx;
  font-size: 24rpx;
  color: #ff9500;
}
.buy-btn {
  margin: 0;
  padding: 0 64rpx;
  height: 80rpx;
  line-height: 80rpx;
  background: #07c160;
  color: #fff;
  font-size: 30rpx;
  border-radius: 40rpx;
}
.buy-btn[disabled] {
  opacity: 0.6;
}
</style>
