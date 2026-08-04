<template>
  <view class="checkin-detail-page">
    <NavBar title="打卡" />

    <!-- 活动信息 -->
    <view v-if="activity" class="activity-card">
      <text class="activity-title">
        {{ activity.title }}
      </text>
      <text v-if="activity.description" class="activity-desc">
        {{ activity.description }}
      </text>
      <view class="activity-meta">
        <text>{{ activity.start_date }} ~ {{ activity.end_date || '长期' }}</text>
        <text>{{ activity.total_participants }} 人参与</text>
      </view>
    </view>

    <!-- 打卡状态卡片 -->
    <view class="status-card">
      <view class="streak-info">
        <text class="streak-num">
          {{ streakCount }}
        </text>
        <text class="streak-label"> 连续打卡（天） </text>
      </view>
      <view v-if="checkedToday" class="checked-badge">
        <text>今日已打卡 ✓</text>
      </view>
      <view v-else class="checkin-form">
        <textarea
          v-model="note"
          class="note-input"
          placeholder="记录一下今天的打卡心得（选填）"
          maxlength="500"
        />
        <button class="checkin-btn" :disabled="submitting" @tap="handleCheckIn">
          {{ submitting ? '打卡中...' : '立即打卡' }}
        </button>
      </view>
    </view>

    <!-- 标签页 -->
    <view class="tabs">
      <view
        class="tab-item"
        :class="{ active: activeTab === 'records' }"
        @tap="activeTab = 'records'"
      >
        <text>我的记录</text>
      </view>
      <view
        class="tab-item"
        :class="{ active: activeTab === 'leaderboard' }"
        @tap="switchToLeaderboard"
      >
        <text>排行榜</text>
      </view>
    </view>

    <!-- 我的记录 -->
    <view v-if="activeTab === 'records'" class="records-section">
      <view v-if="records.length === 0" class="empty">
        <text>还没有打卡记录，快去打卡吧</text>
      </view>
      <view v-for="item in records" :key="item.check_in_record_id" class="record-item">
        <view class="record-date">
          <text class="date">
            {{ item.check_in_date }}
          </text>
          <text class="streak"> 连续 {{ item.streak_count }} 天 </text>
        </view>
        <text v-if="item.metadata?.note" class="record-note">
          {{ item.metadata.note }}
        </text>
      </view>
    </view>

    <!-- 排行榜 -->
    <view v-if="activeTab === 'leaderboard'" class="leaderboard-section">
      <view v-if="leaderboard.length === 0" class="empty">
        <text>暂无排行数据</text>
      </view>
      <view v-for="(item, idx) in leaderboard" :key="item.user_id" class="rank-item">
        <text class="rank-no">
          {{ idx + 1 }}
        </text>
        <text class="rank-user">
          {{ maskUserId(item.user_id) }}
        </text>
        <text class="rank-count"> 打卡 {{ item.total_check_ins }} 天 </text>
        <text class="rank-streak"> 最长连续 {{ item.max_streak }} 天 </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  getCheckInActivity,
  checkIn,
  getCheckInRecords,
  getCheckInLeaderboard,
  type CheckInActivity,
  type CheckInRecord,
  type CheckInLeaderboardItem,
} from '../../api/checkin'
import { useTenantTitle } from '../../composables/useTenantTitle'
import NavBar from '../../components/NavBar.vue'

const activity = ref<CheckInActivity | null>(null)
const checkedToday = ref(false)
const streakCount = ref(0)
const note = ref('')
const submitting = ref(false)
const activeTab = ref<'records' | 'leaderboard'>('records')
const records = ref<CheckInRecord[]>([])
const leaderboard = ref<CheckInLeaderboardItem[]>([])
const leaderboardLoaded = ref(false)

let activityId = ''

useTenantTitle()

function getPageParams(): Record<string, string> {
  // @ts-ignore - getCurrentPages is provided by uni-app runtime
  const pages = getCurrentPages()
  // @ts-ignore
  const page = pages[pages.length - 1]
  // @ts-ignore - options 由 uni-app 运行时注入
  return page?.options || {}
}

function todayString(): string {
  const d = new Date()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

onMounted(async () => {
  activityId = getPageParams().id || ''
  if (!activityId) {
    uni.showToast({ title: '参数错误', icon: 'none' })
    return
  }
  await Promise.all([loadActivity(), loadMyStatus(), loadRecords()])
})

async function loadActivity() {
  try {
    activity.value = (await getCheckInActivity(activityId)) as any
  } catch {
    // 活动不存在时提示并保持空态
  }
}

async function loadMyStatus() {
  try {
    const today = todayString()
    const res: any = await getCheckInRecords(activityId, {
      start_date: today,
      end_date: today,
      per_page: 1,
    })
    const todayRecord = (res?.data || [])[0]
    if (todayRecord) {
      checkedToday.value = true
      streakCount.value = todayRecord.streak_count
    } else {
      // 未打卡：用最近一条记录推算当前连续天数（昨日有记录则延续）
      const recent: any = await getCheckInRecords(activityId, { per_page: 1 })
      const last = (recent?.data || [])[0]
      if (last) {
        const yesterday = new Date(Date.now() - 86400000)
        streakCount.value = last.check_in_date === todayStringOf(yesterday) ? last.streak_count : 0
      }
    }
  } catch {
    // 静默失败，不影响打卡操作
  }
}

function todayStringOf(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

async function loadRecords() {
  try {
    const res: any = await getCheckInRecords(activityId, { per_page: 50 })
    records.value = res?.data ?? []
  } catch {
    records.value = []
  }
}

async function switchToLeaderboard() {
  activeTab.value = 'leaderboard'
  if (leaderboardLoaded.value) return
  try {
    const res: any = await getCheckInLeaderboard(activityId)
    leaderboard.value = Array.isArray(res) ? res : (res?.data ?? [])
    leaderboardLoaded.value = true
  } catch {
    leaderboard.value = []
  }
}

async function handleCheckIn() {
  if (submitting.value) return
  submitting.value = true
  try {
    const record: any = await checkIn(activityId, note.value ? { note: note.value } : undefined)
    checkedToday.value = true
    streakCount.value = record?.streak_count ?? streakCount.value + 1
    note.value = ''
    uni.showToast({ title: '打卡成功', icon: 'success' })
    await loadRecords()
  } catch (e: any) {
    uni.showToast({ title: e?.message || '打卡失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function maskUserId(userId: number): string {
  const str = String(userId)
  if (str.length <= 4) return `用户${str}`
  return `用户${str.slice(-4)}`
}
</script>

<style scoped>
.checkin-detail-page {
  min-height: 100vh;
  background: #f5f6fa;
  padding-bottom: 40rpx;
}
.activity-card {
  background: #fff;
  margin: 24rpx;
  padding: 28rpx;
  border-radius: 16rpx;
}
.activity-title {
  font-size: 34rpx;
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
.status-card {
  background: #fff;
  margin: 0 24rpx 24rpx;
  padding: 32rpx 28rpx;
  border-radius: 16rpx;
}
.streak-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 24rpx;
}
.streak-num {
  font-size: 72rpx;
  font-weight: bold;
  color: #07c160;
}
.streak-label {
  font-size: 26rpx;
  color: #999;
}
.checked-badge {
  text-align: center;
  background: #f0faf4;
  border-radius: 40rpx;
  padding: 20rpx;
  color: #07c160;
  font-size: 30rpx;
}
.note-input {
  width: 100%;
  height: 140rpx;
  background: #f7f8fa;
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 26rpx;
  box-sizing: border-box;
}
.checkin-btn {
  background: #07c160;
  color: #fff;
  border-radius: 40rpx;
  margin-top: 24rpx;
  font-size: 30rpx;
}
.tabs {
  display: flex;
  background: #fff;
  margin: 0 24rpx;
  border-radius: 16rpx 16rpx 0 0;
}
.tab-item {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  font-size: 28rpx;
  color: #666;
}
.tab-item.active {
  color: #07c160;
  font-weight: bold;
  border-bottom: 4rpx solid #07c160;
}
.records-section,
.leaderboard-section {
  background: #fff;
  margin: 0 24rpx;
  padding: 12rpx 28rpx 28rpx;
  border-radius: 0 0 16rpx 16rpx;
}
.empty {
  text-align: center;
  padding: 60rpx 0;
  color: #999;
  font-size: 26rpx;
}
.record-item {
  padding: 24rpx 0;
  border-bottom: 1px solid #f5f5f5;
}
.record-item:last-child {
  border-bottom: none;
}
.record-date {
  display: flex;
  justify-content: space-between;
}
.record-date .date {
  font-size: 28rpx;
  color: #333;
}
.record-date .streak {
  font-size: 24rpx;
  color: #07c160;
}
.record-note {
  font-size: 26rpx;
  color: #999;
  display: block;
  margin-top: 8rpx;
}
.rank-item {
  display: flex;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1px solid #f5f5f5;
  font-size: 26rpx;
}
.rank-item:last-child {
  border-bottom: none;
}
.rank-no {
  width: 60rpx;
  font-weight: bold;
  color: #333;
}
.rank-user {
  flex: 1;
  color: #333;
}
.rank-count {
  color: #666;
  margin-right: 20rpx;
}
.rank-streak {
  color: #999;
  font-size: 24rpx;
}
</style>
