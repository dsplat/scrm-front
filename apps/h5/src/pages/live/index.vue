<template>
  <view class="live-page">
    <NavBar title="直播" />

    <view class="filter-bar">
      <view
        v-for="item in filters"
        :key="item.value"
        class="filter-item"
        :class="{ active: status === item.value }"
        @tap="switchStatus(item.value)"
      >
        <text>{{ item.label }}</text>
      </view>
    </view>

    <view v-if="loading" class="loading-tip">
      <text>加载中...</text>
    </view>
    <ErrorState v-else-if="loadError" message="直播列表加载失败，请稍后重试" @retry="load" />
    <view v-else-if="rooms.length === 0" class="empty-tip">
      <text>暂无直播</text>
    </view>

    <view v-for="room in rooms" :key="room.room_id" class="room-card" @tap="goWatch(room)">
      <image v-if="room.cover" class="room-cover" :src="room.cover" mode="aspectFill" />
      <view v-else class="room-cover placeholder">
        <text>直播</text>
      </view>
      <view class="room-info">
        <view class="room-title">
          <text>{{ room.title }}</text>
        </view>
        <view class="room-meta">
          <text class="room-status" :class="room.status">
            {{ statusLabel(room.status) }}
          </text>
          <text v-if="room.scheduled_at" class="room-time">
            {{ room.scheduled_at }}
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import NavBar from '../../components/NavBar.vue'
import ErrorState from '../../components/ErrorState.vue'
import { ensureLogin } from '../../utils/auth-guard'
import { getLiveRooms, type LiveRoomSummary } from '../../api/live'

const filters = [
  { value: '', label: '全部' },
  { value: 'living', label: '直播中' },
  { value: 'scheduled', label: '待开播' },
  { value: 'ended', label: '已结束' },
]

const status = ref('')
const rooms = ref<LiveRoomSummary[]>([])
const loading = ref(true)
// 加载失败与空数据区分展示：失败给 ErrorState（重试/返回出口），避免被误认为"暂无直播"
const loadError = ref(false)

function statusLabel(s: string) {
  return (
    ({ scheduled: '待开播', living: '直播中', ended: '已结束' } as Record<string, string>)[s] ?? s
  )
}

async function load() {
  loading.value = true
  loadError.value = false
  try {
    rooms.value = (await getLiveRooms(status.value || undefined)) ?? []
  } catch {
    rooms.value = []
    loadError.value = true
  } finally {
    loading.value = false
  }
}

function switchStatus(value: string) {
  status.value = value
  load()
}

async function goWatch(room: LiveRoomSummary) {
  // 观看为登录态操作（权益校验依赖用户身份）：未登录先引导（登录后回跳本页）
  if (!(await ensureLogin('观看直播需登录后进行'))) return
  uni.navigateTo({ url: `/pages/live/watch?room_id=${room.room_id}` })
}

onMounted(load)
</script>

<style scoped>
.live-page {
  min-height: 100vh;
  background: #f6f7f9;
  padding-bottom: 40rpx;
}

.filter-bar {
  display: flex;
  gap: 16rpx;
  padding: 20rpx;
}

.filter-item {
  font-size: 26rpx;
  color: #666;
  background: #fff;
  border-radius: 28rpx;
  padding: 8rpx 28rpx;
}

.filter-item.active {
  color: var(--scrm-primary);
  background: #e8f8ef;
}

.room-card {
  display: flex;
  gap: 20rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx;
  margin: 0 20rpx 20rpx;
}

.room-cover {
  width: 220rpx;
  height: 140rpx;
  border-radius: 12rpx;
  flex-shrink: 0;
}

.room-cover.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eef0f3;
  color: #999;
  font-size: 26rpx;
}

.room-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
}

.room-title {
  font-size: 30rpx;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.room-meta {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.room-status {
  font-size: 22rpx;
  border-radius: 6rpx;
  padding: 2rpx 12rpx;
}

.room-status.living {
  color: #fa5151;
  background: #fff1f0;
}

.room-status.scheduled {
  color: #fa8c16;
  background: #fff7e6;
}

.room-status.ended {
  color: #999;
  background: #f2f3f5;
}

.room-time {
  font-size: 22rpx;
  color: #999;
}

.loading-tip,
.empty-tip {
  text-align: center;
  color: #999;
  padding: 60rpx 0;
}
</style>
