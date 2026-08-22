<template>
  <view class="activity-page">
    <NavBar title="活动中心" :show-back="false" />
    <!-- 活动列表（统一 Activity 模块，type 区分营销/线下/混合/课程/训练营） -->
    <view v-if="activities.length > 0" class="activity-list">
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
          <text class="type-tag">
            {{ typeText(item.type) }}
          </text>
          <text v-if="item.starts_at" class="time">
            {{ formatTime(item.starts_at) }}
          </text>
          <text v-if="item.current_participants > 0" class="participants">
            已有 {{ item.current_participants }} 人参与
          </text>
        </view>
      </view>
    </view>
    <view v-else-if="!loading" class="empty">
      <text>暂无活动，敬请期待</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getActivityList } from '../../api/scrm'
import { useTenantTitle } from '../../composables/useTenantTitle'
import { useSeoMeta } from '../../composables/useSeoMeta'
import { useTenantStore } from '../../store/tenant'
import NavBar from '../../components/NavBar.vue'

interface ActivityItem {
  activity_id: string
  name: string
  type: string
  status: string
  cover_url?: string
  starts_at?: string
  current_participants?: number
}

const activities = ref<ActivityItem[]>([])
const loading = ref(true)

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
  loadActivities()
})

async function loadActivities() {
  loading.value = true
  try {
    const res: any = await getActivityList({ per_page: 50 })
    // C 端不展示草稿/策划中/已取消的活动
    const list: ActivityItem[] = (res?.list || []).filter(
      (a: ActivityItem) => !['draft', 'planning', 'cancelled'].includes(a.status),
    )
    activities.value = list
  } catch {
    activities.value = []
  } finally {
    loading.value = false
  }
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
}
.status-running {
  background: #e6f7ee;
  color: #07c160;
}
.status-scheduled {
  background: #fff7e6;
  color: #e6a23c;
}
.type-tag {
  display: inline-block;
  font-size: 22rpx;
  color: #576b95;
  background: #eef2fb;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  margin: 12rpx 0;
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
.empty {
  text-align: center;
  color: #999;
  padding-top: 200rpx;
  font-size: 28rpx;
}
</style>
