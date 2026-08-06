<template>
  <view class="h5c-detail-page">
    <NavBar :title="title" />
    <view v-if="loading" class="loading-tip">
      <text>加载中...</text>
    </view>
    <template v-else-if="course">
      <image v-if="course.cover" class="cover" :src="course.cover" mode="aspectFill" />
      <view class="info-card">
        <text class="title">
          {{ course.title }}
        </text>
        <view class="price-row">
          <text v-if="Number(course.price) > 0" class="price">
            ¥{{ Number(course.price).toFixed(2) }}
          </text>
          <text v-else class="price free"> 免费 </text>
          <text v-if="Number(course.points_price) > 0" class="points-price">
            {{ course.points_price }}积分
          </text>
          <text v-if="Number(course.completion_reward_points) > 0" class="reward">
            学完奖励{{ course.completion_reward_points }}积分
          </text>
        </view>
        <text v-if="course.description" class="desc">
          {{ course.description }}
        </text>
      </view>

      <!-- 章节列表 -->
      <view class="section-card">
        <text class="section-title"> 课程章节（{{ chapters.length }}） </text>
        <view
          v-for="ch in chapters"
          :key="ch.chapter_id"
          class="chapter-item"
          @tap="handleChapterTap(ch)"
        >
          <view class="chapter-left">
            <text class="chapter-index">
              {{ ch.sort_order + 1 }}
            </text>
            <text class="chapter-title">
              {{ ch.title }}
            </text>
          </view>
          <text class="chapter-type">
            {{ chapterTypeLabel(ch.type) }}
          </text>
          <text v-if="!hasAccess" class="chapter-lock"> 🔒 </text>
        </view>
      </view>

      <!-- 底部购买栏 -->
      <view v-if="!hasAccess" class="bottom-bar">
        <view class="total">
          <text class="total-label"> 合计： </text>
          <text class="total-amount"> ¥{{ Number(course.price).toFixed(2) }} </text>
          <text v-if="Number(course.points_price) > 0 && payMethod !== 'cash'" class="total-points">
            {{ course.points_price }}积分
          </text>
        </view>
        <view v-if="needPayMethodChoice" class="pay-methods">
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
        <button class="buy-btn" :disabled="submitting" @tap="handlePurchase">
          {{ submitting ? '提交中...' : isFree ? '免费学习' : '立即购买' }}
        </button>
      </view>
      <view v-else class="bottom-bar">
        <button class="buy-btn learn" @tap="goLearn">开始学习</button>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { getCourseDetail, purchaseCourse, type CourseVO, type ChapterVO } from '../api/course'
import { payOrder, getMyOrders } from '../api/shop'
import { invokePayment, pollUntil } from '../utils/payment'
import { navCourseLearn } from '../config'
import NavBar from '../components/NavBar.vue'

const props = withDefaults(
  defineProps<{
    /** 课程 id（宿主页面 onLoad 解析后传入） */
    courseId?: number
    /** 宿主页面 onShow 时递增，驱动刷新（支付返回后） */
    refreshTick?: number
    title?: string
  }>(),
  {
    courseId: 0,
    refreshTick: 0,
    title: '课程详情',
  },
)

const course = ref<CourseVO | null>(null)
const chapters = ref<ChapterVO[]>([])
const hasAccess = ref(false)
const loading = ref(false)
const submitting = ref(false)
const payMethod = ref<'cash' | 'points' | 'mixed'>('cash')

const isFree = computed(
  () => Number(course.value?.price ?? 0) <= 0 && Number(course.value?.points_price ?? 0) <= 0,
)

const payMethods = computed(() => {
  const c = course.value
  if (!c) return []
  const list: { label: string; value: 'cash' | 'points' | 'mixed' }[] = []
  if (Number(c.price) > 0) list.push({ label: '现金', value: 'cash' })
  if (Number(c.points_price) > 0) list.push({ label: '积分', value: 'points' })
  if (c.sale_mode === 'mixed' && Number(c.price) > 0 && Number(c.points_price) > 0) {
    list.push({ label: '混合', value: 'mixed' })
  }
  return list
})

const needPayMethodChoice = computed(() => !isFree.value && payMethods.value.length > 1)

function chapterTypeLabel(type: string): string {
  const map: Record<string, string> = { text: '图文', video: '视频', file: '文件' }
  return map[type] ?? type
}

function handleChapterTap(_ch: ChapterVO) {
  if (!hasAccess.value) {
    uni.showToast({ title: '购买后可学习', icon: 'none' })
    return
  }
  goLearn()
}

function goLearn() {
  navCourseLearn(props.courseId)
}

async function load() {
  if (!props.courseId) return
  loading.value = true
  try {
    const res = await getCourseDetail(props.courseId)
    course.value = res.course
    chapters.value = res.chapters || []
    hasAccess.value = !!res.has_access
    if (payMethods.value.length && !payMethods.value.some((m) => m.value === payMethod.value)) {
      payMethod.value = payMethods.value[0].value
    }
  } catch (e: any) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function handlePurchase() {
  if (!course.value) return
  submitting.value = true
  try {
    const order = await purchaseCourse(props.courseId, {
      pay_method: payMethod.value,
    })

    // 免费/积分课程后端即时完成
    if (Number(order.total_amount) <= 0 || order.status === 'paid') {
      uni.showToast({ title: '开通成功', icon: 'success' })
      hasAccess.value = true
      return
    }

    const payRes: any = await payOrder(order.order_no)
    if (payRes?.paid) {
      uni.showToast({ title: '支付成功', icon: 'success' })
      hasAccess.value = true
      return
    }
    await invokePayment(payRes?.pay_data || {})
    pollUntil(async () => {
      const res = await getMyOrders({ status: 'paid', per_page: 5 })
      const paid = (res.data || []).some((o) => o.order_no === order.order_no)
      if (paid) hasAccess.value = true
      return paid
    })
  } catch (e: any) {
    uni.showToast({ title: e.message || '购买失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

// 由宿主页面 onShow 递增 refreshTick 驱动加载（onLoad 先于 onShow，届时 courseId 已就绪）
watch(
  () => props.refreshTick,
  () => load(),
)
</script>

<style scoped>
.h5c-detail-page {
  min-height: 100vh;
  background: #f5f6fa;
  padding-bottom: 160rpx;
}
.loading-tip {
  text-align: center;
  padding: 120rpx 0;
  color: #999;
  font-size: 28rpx;
}
.cover {
  width: 100%;
  height: 420rpx;
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
  flex-wrap: wrap;
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
.reward {
  font-size: 24rpx;
  color: #07c160;
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
.chapter-item {
  display: flex;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1px solid #f5f5f5;
}
.chapter-item:last-child {
  border-bottom: none;
}
.chapter-left {
  flex: 1;
  display: flex;
  align-items: center;
}
.chapter-index {
  width: 48rpx;
  font-size: 26rpx;
  color: #999;
}
.chapter-title {
  font-size: 28rpx;
  color: #333;
}
.chapter-type {
  font-size: 22rpx;
  color: #999;
  margin-right: 16rpx;
}
.chapter-lock {
  font-size: 24rpx;
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
  gap: 16rpx;
  flex-wrap: wrap;
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
  font-size: 36rpx;
  font-weight: 700;
  color: #e64340;
}
.total-points {
  margin-left: 8rpx;
  font-size: 24rpx;
  color: #ff9500;
}
.pay-methods {
  display: flex;
  gap: 12rpx;
}
.pay-method-item {
  padding: 10rpx 24rpx;
  border: 1px solid #ddd;
  border-radius: 10rpx;
  font-size: 24rpx;
  color: #333;
}
.pay-method-item.active {
  border-color: #07c160;
  background: #e8f8ee;
  color: #07c160;
}
.buy-btn {
  margin: 0;
  padding: 0 56rpx;
  height: 80rpx;
  line-height: 80rpx;
  background: #07c160;
  color: #fff;
  font-size: 30rpx;
  border-radius: 40rpx;
}
.buy-btn.learn {
  width: 100%;
}
.buy-btn[disabled] {
  opacity: 0.6;
}
</style>
