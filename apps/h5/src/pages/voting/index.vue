<template>
  <view class="voting-page">
    <NavBar title="投票活动" />

    <view v-if="!loggedIn" class="login-prompt">
      <text class="login-tip-text"> 登录后参与投票 </text>
      <button class="go-login-btn" @tap="goLogin">去登录</button>
    </view>

    <template v-else>
      <ErrorState
        v-if="loadError && votes.length === 0"
        message="投票加载失败，请稍后重试"
        @retry="load"
      />

      <view v-else class="vote-list">
        <view v-for="v in votes" :key="v.vote_id" class="vote-card" @tap="goDetail(v.vote_id)">
          <view class="vote-head">
            <text class="vote-title">
              {{ v.title }}
            </text>
            <text class="vote-type">
              {{ v.vote_type === 'multiple' ? '多选' : '单选' }}
            </text>
          </view>
          <text v-if="v.description" class="vote-desc">
            {{ v.description }}
          </text>
          <view class="vote-meta">
            <text class="vote-time">
              {{ timeText(v) }}
            </text>
            <text class="vote-count"> {{ v.total_votes || 0 }} 人已投 </text>
          </view>
          <view class="vote-cta">
            <text>参与投票 ›</text>
          </view>
        </view>

        <view v-if="votes.length === 0 && !loading" class="empty-tip">
          <text>暂无进行中的投票</text>
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
import { getVotes, type VoteVO } from '../../api/marketing'
import { isLoggedIn } from '../../api/auth'
import { redirectToLogin } from '../../utils/request'
import { useTenantTitle } from '../../composables/useTenantTitle'
import NavBar from '../../components/NavBar.vue'
import ErrorState from '../../components/ErrorState.vue'

const votes = ref<VoteVO[]>([])
const loading = ref(false)
const loadError = ref(false)
const loggedIn = computed(() => isLoggedIn())

useTenantTitle()

function formatDate(dateStr?: string | null) {
  if (!dateStr) return ''
  const d = new Date(String(dateStr).replace(' ', 'T'))
  if (isNaN(d.getTime())) return String(dateStr).slice(0, 10)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function timeText(v: VoteVO) {
  if (!v.start_at && !v.end_at) return '长期有效'
  const s = v.start_at ? formatDate(v.start_at) : ''
  const e = v.end_at ? formatDate(v.end_at) : ''
  if (s && e) return `${s} 至 ${e}`
  return e ? `截止 ${e}` : `${s} 开始`
}

async function load() {
  if (!isLoggedIn()) return
  loading.value = true
  loadError.value = false
  try {
    const res: any = await getVotes()
    votes.value = Array.isArray(res) ? res : res?.data || []
  } catch {
    votes.value = []
    loadError.value = true
  } finally {
    loading.value = false
  }
}

function goDetail(voteId: number | string) {
  uni.navigateTo({ url: `/pages/voting/detail?id=${voteId}` })
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
.voting-page {
  min-height: 100vh;
  background: #f5f6fa;
}
.vote-list {
  padding: 20rpx 24rpx;
}
.vote-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 28rpx 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}
.vote-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.vote-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  flex: 1;
}
.vote-type {
  font-size: 22rpx;
  color: var(--scrm-primary);
  background: rgba(7, 193, 96, 0.1);
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
  flex-shrink: 0;
  margin-left: 16rpx;
}
.vote-desc {
  font-size: 26rpx;
  color: #888;
  margin-top: 14rpx;
  display: block;
}
.vote-meta {
  display: flex;
  align-items: center;
  margin-top: 16rpx;
}
.vote-time {
  font-size: 24rpx;
  color: #aaa;
}
.vote-count {
  font-size: 24rpx;
  color: #ff7a45;
  margin-left: 24rpx;
}
.vote-cta {
  margin-top: 20rpx;
  text-align: right;
}
.vote-cta text {
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
