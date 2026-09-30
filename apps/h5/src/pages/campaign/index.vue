<template>
  <view class="activity-page">
    <NavBar title="活动中心" :show-back="false" />

    <!-- 搜索 + 类型筛选 -->
    <view class="filter-bar">
      <view class="search-box">
        <text class="search-icon"> 🔍 </text>
        <input
          v-model="keyword"
          class="search-input"
          type="text"
          placeholder="搜索活动名称"
          confirm-type="search"
          @confirm="onSearch"
        />
        <text v-if="keyword" class="search-clear" @tap="clearKeyword"> ✕ </text>
      </view>
      <scroll-view class="type-tabs" scroll-x :show-scrollbar="false">
        <view
          v-for="tab in TYPE_TABS"
          :key="tab.value"
          class="type-tab"
          :class="{ active: activeType === tab.value }"
          @tap="switchType(tab.value)"
        >
          {{ tab.label }}
        </view>
      </scroll-view>
    </view>

    <!-- 活动列表（统一 Activity 模块，type 区分营销/线下/混合/课程/训练营） -->
    <ErrorState
      v-if="loadError && activities.length === 0"
      message="活动加载失败，请稍后重试"
      @retry="reload"
    />
    <view v-else-if="activities.length > 0" class="activity-list">
      <view
        v-for="item in activities"
        :key="item.activity_id"
        class="activity-card"
        @tap="goDetail(item)"
      >
        <image v-if="item.cover_url" class="cover" :src="item.cover_url" mode="aspectFill" />
        <view class="info">
          <view class="name-row">
            <text class="name">
              {{ item.name }}
            </text>
            <text class="status-tag" :class="`status-${item.status}`">
              {{ statusText(item.status) }}
            </text>
          </view>
          <view class="tag-row">
            <text class="type-tag">
              {{ typeText(item.type) }}
            </text>
            <text v-if="priceText(item)" class="price-tag">
              {{ priceText(item) }}
            </text>
          </view>
          <text v-if="item.starts_at" class="time">
            {{ formatTime(item.starts_at) }}
          </text>
          <text v-if="(item.current_participants || 0) > 0" class="participants">
            已有 {{ item.current_participants }} 人参与
          </text>
        </view>
      </view>

      <view class="load-more">
        <text v-if="loading"> 加载中... </text>
        <text v-else-if="!hasMore"> 没有更多了 </text>
      </view>
    </view>
    <view v-else-if="!loading" class="empty">
      <text>{{ keyword || activeType ? '没有匹配的活动' : '暂无活动，敬请期待' }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad, onShow, onReachBottom, onPullDownRefresh } from '@dcloudio/uni-app'
import { getActivityList } from '../../api/scrm'
import { fenToYuan } from '@scrm/h5-commerce'
import { useTenantTitle } from '../../composables/useTenantTitle'
import { useSeoMeta } from '../../composables/useSeoMeta'
import { useTenantStore } from '../../store/tenant'
import NavBar from '../../components/NavBar.vue'
import ErrorState from '../../components/ErrorState.vue'

interface ActivityItem {
  activity_id: string
  name: string
  type: string
  status: string
  cover_url?: string
  starts_at?: string
  current_participants?: number
  min_price?: number | null
  is_free?: boolean
}

const TYPE_TABS: Array<{ label: string; value: string }> = [
  { label: '全部', value: '' },
  { label: '营销活动', value: 'marketing' },
  { label: '线下活动', value: 'offline_event' },
  { label: '混合活动', value: 'hybrid' },
  { label: '课程', value: 'course' },
  { label: '训练营', value: 'training_camp' },
]

const PER_PAGE = 20

const activities = ref<ActivityItem[]>([])
const keyword = ref('')
const activeType = ref('')
const page = ref(1)
const total = ref(0)
const loading = ref(true)
// 加载失败与空数据区分展示：失败给 ErrorState（重试/返回出口），避免被误认为“暂无活动”
const loadError = ref(false)
// 首次进入 onShow 已触发加载，避免 onLoad 与 onShow 双拉；用标记控制触底/下拉
let initialized = false

const hasMore = computed(() => page.value * PER_PAGE < total.value)

// 微信原生栏标题统一为租户名
useTenantTitle()

// 页面级 SEO：活动中心列表页
const { state: tenantState } = useTenantStore()
useSeoMeta(() => ({
  title: tenantState.tenant?.name ? `活动中心 - ${tenantState.tenant.name}` : '活动中心',
  description: '活动中心：营销优惠、线下活动、课程与训练营，一键报名参与。',
  canonicalPath: '/h5/pages/campaign/index',
}))

// 旧分享链接兼容：campaign/index?id=X → 统一活动详情页（event 目录 API 已迁 Activity 模块）
onLoad((options) => {
  const legacyId = options?.id || options?.campaign_id || options?.campaignId
  if (legacyId) {
    uni.redirectTo({ url: `/pages/event/detail?eventId=${legacyId}` })
  }
})

onShow(() => {
  if (initialized) return
  initialized = true
  reload()
})

onReachBottom(() => {
  if (loading.value || !hasMore.value) return
  page.value += 1
  loadActivities(false)
})

onPullDownRefresh(async () => {
  await reload()
  uni.stopPullDownRefresh()
})

/** 重置到第一页并加载（切 tab / 搜索 / 下拉刷新） */
async function reload() {
  page.value = 1
  activities.value = []
  await loadActivities(true)
}

/**
 * 拉取活动列表
 * @param replace true=替换（首页/刷新），false=追加（触底加载更多）
 */
async function loadActivities(replace: boolean) {
  loading.value = true
  loadError.value = false
  try {
    const params: Record<string, unknown> = {
      per_page: PER_PAGE,
      page: page.value,
    }
    if (keyword.value.trim()) params.keyword = keyword.value.trim()
    if (activeType.value) params.type = activeType.value

    const res: any = await getActivityList(params)
    // C 端不展示草稿/策划中/已取消的活动（服务端已过滤，此处兼容旧数据）
    const list: ActivityItem[] = (res?.list || []).filter(
      (a: ActivityItem) => !['draft', 'planning', 'cancelled'].includes(a.status),
    )
    total.value = Number(res?.total || 0)
    activities.value = replace ? list : [...activities.value, ...list]
  } catch {
    if (replace) activities.value = []
    loadError.value = true
  } finally {
    loading.value = false
  }
}

function onSearch() {
  reload()
}

function clearKeyword() {
  keyword.value = ''
  reload()
}

function switchType(type: string) {
  if (activeType.value === type) return
  activeType.value = type
  reload()
}

function goDetail(item: ActivityItem) {
  uni.navigateTo({ url: `/pages/event/detail?eventId=${item.activity_id}` })
}

const TYPE_TEXT: Record<string, string> = {
  marketing: '营销活动',
  offline_event: '线下活动',
  hybrid: '混合活动',
  course: '课程',
  training_camp: '训练营',
}

const STATUS_TEXT: Record<string, string> = {
  scheduled: '即将开始',
  running: '进行中',
  completed: '已结束',
}

function typeText(type: string) {
  return TYPE_TEXT[type] || '活动'
}

function statusText(status: string) {
  return STATUS_TEXT[status] || status
}

/** 价格文案：免费/￥金额起（后端 list 返回 min_price=最低在售价、is_free） */
function priceText(item: ActivityItem) {
  if (item.is_free) return '免费'
  const raw = item.min_price
  if (raw === null || raw === undefined) return ''
  const num = Number(raw)
  if (isNaN(num) || num <= 0) return '免费'
  return `￥${fenToYuan(num)} 起`
}

function formatTime(dateStr: string) {
  if (!dateStr) return ''
  return new Date(dateStr.replace(' ', 'T')).toLocaleString('zh-CN', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<style scoped>
.activity-page {
  background: #f5f6fa;
  min-height: 100vh;
}
.filter-bar {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #fff;
  padding: 16rpx 20rpx 0;
}
.search-box {
  display: flex;
  align-items: center;
  height: 72rpx;
  background: #f2f3f5;
  border-radius: 36rpx;
  padding: 0 24rpx;
}
.search-icon {
  font-size: 26rpx;
  margin-right: 12rpx;
  opacity: 0.5;
}
.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #333;
}
.search-clear {
  font-size: 28rpx;
  color: #bbb;
  padding: 0 8rpx;
}
.type-tabs {
  white-space: nowrap;
  margin-top: 16rpx;
}
.type-tab {
  display: inline-block;
  font-size: 28rpx;
  color: #666;
  padding: 12rpx 28rpx;
  margin-right: 12rpx;
  border-radius: 28rpx;
  background: #f2f3f5;
}
.type-tab.active {
  color: #fff;
  background: var(--scrm-primary);
  font-weight: 500;
}
.activity-list {
  padding: 20rpx;
}
.activity-card {
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  margin-bottom: 20rpx;
}
.cover {
  width: 100%;
  height: 280rpx;
}
.info {
  padding: 24rpx;
}
.name-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.name {
  font-size: 32rpx;
  font-weight: bold;
  flex: 1;
}
.status-tag {
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
  background: #f0f0f0;
  color: #999;
  flex-shrink: 0;
  margin-left: 12rpx;
}
.status-running {
  background: #e6f7ee;
  color: var(--scrm-primary);
}
.status-scheduled {
  background: #fff7e6;
  color: #e6a23c;
}
.tag-row {
  display: flex;
  align-items: center;
  margin: 12rpx 0;
}
.type-tag {
  display: inline-block;
  font-size: 22rpx;
  color: #576b95;
  background: #eef2fb;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
}
.price-tag {
  display: inline-block;
  font-size: 24rpx;
  color: #fa5151;
  font-weight: 600;
  margin-left: 16rpx;
}
.time {
  display: block;
  font-size: 26rpx;
  color: #666;
}
.participants {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-top: 8rpx;
}
.load-more {
  text-align: center;
  padding: 32rpx 0;
  color: #999;
  font-size: 26rpx;
}
.empty {
  text-align: center;
  color: #999;
  padding-top: 200rpx;
  font-size: 28rpx;
}
</style>
