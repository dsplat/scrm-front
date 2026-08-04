<template>
  <view class="checkin-list-page">
    <NavBar title="打卡中心" />
    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>
    <view v-else-if="activities.length === 0" class="empty">
      <text>暂无进行中的打卡活动</text>
    </view>
    <view v-else class="activity-list">
      <view
        v-for="item in activities"
        :key="item.check_in_activity_id"
        class="activity-card"
        @tap="goDetail(item.check_in_activity_id)"
      >
        <image v-if="item.cover_url" class="cover" :src="item.cover_url" mode="aspectFill" />
        <view class="activity-body">
          <text class="activity-title">
            {{ item.title }}
          </text>
          <text v-if="item.description" class="activity-desc">
            {{ item.description }}
          </text>
          <view class="activity-meta">
            <text class="period"> {{ item.start_date }} ~ {{ item.end_date || '长期' }} </text>
            <text class="participants"> {{ item.total_participants }} 人参与 </text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getCheckInActivities, type CheckInActivity } from '../../api/checkin'
import { useTenantTitle } from '../../composables/useTenantTitle'
import NavBar from '../../components/NavBar.vue'

const activities = ref<CheckInActivity[]>([])
const loading = ref(true)

useTenantTitle()

onMounted(async () => {
  try {
    const res: any = await getCheckInActivities({ status: 'active', per_page: 50 })
    activities.value = res?.data ?? []
  } catch {
    uni.showToast({ title: '加载失败，请稍后再试', icon: 'none' })
  } finally {
    loading.value = false
  }
})

function goDetail(id: number) {
  uni.navigateTo({ url: `/pages/checkin/detail?id=${id}` })
}
</script>

<style scoped>
.checkin-list-page {
  min-height: 100vh;
  background: #f5f6fa;
}
.loading,
.empty {
  text-align: center;
  padding-top: 200rpx;
  color: #999;
  font-size: 28rpx;
}
.activity-list {
  padding: 24rpx;
}
.activity-card {
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  margin-bottom: 24rpx;
}
.cover {
  width: 100%;
  height: 280rpx;
}
.activity-body {
  padding: 28rpx;
}
.activity-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  display: block;
}
.activity-desc {
  font-size: 26rpx;
  color: #666;
  display: block;
  margin-top: 12rpx;
}
.activity-meta {
  display: flex;
  justify-content: space-between;
  margin-top: 20rpx;
  font-size: 24rpx;
  color: #999;
}
</style>
