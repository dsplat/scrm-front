<template>
  <view class="lottery-page">
    <NavBar title="幸运抽奖" />

    <view v-if="!loggedIn" class="login-prompt">
      <text class="login-tip-text"> 登录后参与抽奖 </text>
      <button class="go-login-btn" @tap="goLogin">去登录</button>
    </view>

    <template v-else>
      <ErrorState
        v-if="loadError && activities.length === 0"
        message="抽奖活动加载失败，请稍后重试"
        @retry="load"
      />

      <view v-else class="act-list">
        <view
          v-for="a in activities"
          :key="a.activity_id"
          class="act-card"
          @tap="goDraw(a.activity_id)"
        >
          <view class="act-head">
            <text class="act-title">
              {{ a.title }}
            </text>
            <text class="act-badge"> 抽奖 </text>
          </view>
          <text v-if="a.description" class="act-desc">
            {{ a.description }}
          </text>
          <view class="act-meta">
            <text class="act-time">
              {{ timeText(a) }}
            </text>
            <text v-if="prizeCount(a) > 0" class="act-prizes"> {{ prizeCount(a) }} 种奖品 </text>
          </view>
          <view class="act-cta">
            <text>立即参与 ›</text>
          </view>
        </view>

        <view v-if="activities.length === 0 && !loading" class="empty-tip">
          <text>暂无进行中的抽奖活动</text>
        </view>
        <view v-if="loading" class="loading-tip">
          <text>加载中...</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { getLotteryActivities, type LotteryActivityVO } from '../../api/marketing'
import { isLoggedIn } from '../../api/auth'
import { redirectToLogin } from '../../utils/request'
import { useTenantTitle } from '../../composables/useTenantTitle'
import NavBar from '../../components/NavBar.vue'
import ErrorState from '../../components/ErrorState.vue'

const activities = ref<LotteryActivityVO[]>([])
const loading = ref(false)
const loadError = ref(false)
const loggedIn = computed(() => isLoggedIn())

useTenantTitle()

function prizeCount(a: LotteryActivityVO) {
  if (Array.isArray(a.prizes)) return a.prizes.length
  return Number(a.prizes_count || 0)
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return ''
  const d = new Date(String(dateStr).replace(' ', 'T'))
  if (isNaN(d.getTime())) return String(dateStr).slice(0, 10)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function timeText(a: LotteryActivityVO) {
  if (!a.start_at && !a.end_at) return '长期有效'
  const s = a.start_at ? formatDate(a.start_at) : ''
  const e = a.end_at ? formatDate(a.end_at) : ''
  if (s && e) return `${s} 至 ${e}`
  return e ? `截止 ${e}` : `${s} 开始`
}

async function load() {
  if (!isLoggedIn()) return
  loading.value = true
  loadError.value = false
  try {
    const res: any = await getLotteryActivities()
    activities.value = Array.isArray(res) ? res : res?.data || []
  } catch {
    activities.value = []
    loadError.value = true
  } finally {
    loading.value = false
  }
}

function goDraw(activityId: number | string) {
  uni.navigateTo({ url: `/pages/lottery/draw?id=${activityId}` })
}

function goLogin() {
  redirectToLogin()
}

onShow(load)

onPullDownRefresh(async () => {
  await load()
  uni.stopPullDownRefresh()
})
</script>

<style scoped>
.lottery-page {
  min-height: 100vh;
  background: #f5f6fa;
}
.act-list {
  padding: 20rpx 24rpx;
}
.act-card {
  background: linear-gradient(135deg, #fff6f2 0%, #fff 55%);
  border: 1px solid #ffe0d3;
  border-radius: 16rpx;
  padding: 28rpx 24rpx;
  margin-bottom: 20rpx;
}
.act-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.act-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  flex: 1;
}
.act-badge {
  font-size: 22rpx;
  color: #fff;
  background: #ff7a45;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
  flex-shrink: 0;
  margin-left: 16rpx;
}
.act-desc {
  font-size: 26rpx;
  color: #888;
  margin-top: 14rpx;
  display: block;
}
.act-meta {
  display: flex;
  align-items: center;
  margin-top: 16rpx;
}
.act-time {
  font-size: 24rpx;
  color: #aaa;
}
.act-prizes {
  font-size: 24rpx;
  color: #ff7a45;
  margin-left: 24rpx;
}
.act-cta {
  margin-top: 20rpx;
  text-align: right;
}
.act-cta text {
  font-size: 26rpx;
  color: var(--scrm-primary);
  font-weight: 500;
}
.empty-tip {
  text-align: center;
  padding: 120rpx 40rpx;
  color: #999;
  font-size: 28rpx;
}
.loading-tip {
  text-align: center;
  padding: 40rpx 0;
  color: #999;
  font-size: 26rpx;
}
.login-prompt {
  margin: 24rpx;
  padding: 80rpx 36rpx;
  background: #fff;
  border-radius: 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32rpx;
}
.login-tip-text {
  font-size: 28rpx;
  color: #999;
}
.go-login-btn {
  width: 320rpx;
  height: 80rpx;
  line-height: 80rpx;
  background: var(--scrm-primary);
  color: #fff;
  border-radius: 40rpx;
  font-size: 28rpx;
}
</style>
