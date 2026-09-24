<template>
  <view class="vdetail-page">
    <NavBar :title="vote?.title || '投票详情'" />

    <view v-if="!loggedIn" class="login-prompt">
      <text class="login-tip-text"> 登录后参与投票 </text>
      <button class="go-login-btn" @tap="goLogin">去登录</button>
    </view>

    <template v-else>
      <ErrorState v-if="loadError && !vote" message="投票加载失败，请稍后重试" @retry="load" />

      <template v-else-if="vote">
        <view class="vhead">
          <text class="vtitle">
            {{ vote.title }}
          </text>
          <text v-if="vote.description" class="vdesc">
            {{ vote.description }}
          </text>
          <view class="vmeta">
            <text class="vtype">
              {{ vote.vote_type === 'multiple' ? '多选' : '单选' }}
            </text>
            <text class="vtime">
              {{ timeText }}
            </text>
            <text class="vtotal"> {{ vote.total_votes || 0 }} 人已投 </text>
          </view>
        </view>

        <!-- 选项 -->
        <view class="options">
          <view
            v-for="opt in options"
            :key="opt.vote_option_id"
            class="option"
            :class="{ selected: isSelected(opt.vote_option_id), voted: showResults }"
            @tap="toggleOption(opt.vote_option_id)"
          >
            <view class="opt-check">
              <text v-if="isSelected(opt.vote_option_id)"> ✓ </text>
            </view>
            <image v-if="opt.image" class="opt-img" :src="opt.image" mode="aspectFill" />
            <view class="opt-body">
              <text class="opt-title">
                {{ opt.title }}
              </text>
              <text v-if="opt.description" class="opt-desc">
                {{ opt.description }}
              </text>
              <view v-if="showResults" class="opt-bar">
                <view class="opt-bar-fill" :style="{ width: (opt.percentage || 0) + '%' }" />
              </view>
              <text v-if="showResults" class="opt-stat">
                {{ opt.vote_count || 0 }} 票 · {{ opt.percentage || 0 }}%
              </text>
            </view>
          </view>
        </view>

        <!-- 投票按钮 -->
        <view v-if="!showResults" class="cast-action">
          <button class="cast-btn" :disabled="casting || selected.length === 0" @tap="onCast">
            {{
              casting ? '提交中...' : `提交投票${selected.length ? `（${selected.length}）` : ''}`
            }}
          </button>
          <text v-if="vote.vote_type === 'multiple'" class="cast-hint">
            可多选，点击选项进行选择
          </text>
          <text v-else class="cast-hint"> 单选，点击选项进行选择 </text>
        </view>

        <!-- 排行榜 -->
        <view v-if="showResults && ranking.length" class="rank-section">
          <text class="section-label"> 排行榜 </text>
          <view v-for="r in ranking" :key="r.option_id" class="rank-item">
            <text class="rank-no" :class="'r' + r.rank">
              {{ r.rank }}
            </text>
            <text class="rank-title">
              {{ r.title }}
            </text>
            <text class="rank-count"> {{ r.vote_count }} 票 </text>
            <text class="rank-pct"> {{ r.percentage || 0 }}% </text>
          </view>
        </view>
      </template>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad, onPullDownRefresh } from '@dcloudio/uni-app'
import { getVoteDetail, castVote, getVoteRanking, type VoteVO } from '../../api/marketing'
import { isLoggedIn } from '../../api/auth'
import { redirectToLogin } from '../../utils/request'
import { useTenantTitle } from '../../composables/useTenantTitle'
import NavBar from '../../components/NavBar.vue'
import ErrorState from '../../components/ErrorState.vue'

const voteId = ref<string>('')
const vote = ref<VoteVO | null>(null)
const ranking = ref<any[]>([])
const selected = ref<Array<number | string>>([])
const casting = ref(false)
const voted = ref(false)
const loadError = ref(false)
const loggedIn = computed(() => isLoggedIn())

useTenantTitle()

const options = computed(() => vote.value?.options || [])
// 投票后或活动开启结果展示时显示票数/占比
const showResults = computed(() => voted.value || !!vote.value?.show_result)

const timeText = computed(() => {
  const v = vote.value
  if (!v) return ''
  if (!v.start_at && !v.end_at) return '长期有效'
  const s = v.start_at ? formatDate(v.start_at) : ''
  const e = v.end_at ? formatDate(v.end_at) : ''
  if (s && e) return `${s} 至 ${e}`
  return e ? `截止 ${e}` : `${s} 开始`
})

function formatDate(dateStr?: string | null) {
  if (!dateStr) return ''
  const d = new Date(String(dateStr).replace(' ', 'T'))
  if (isNaN(d.getTime())) return String(dateStr).slice(0, 10)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isSelected(id: number | string) {
  return selected.value.some((s) => String(s) === String(id))
}

function toggleOption(id: number | string) {
  if (showResults.value) return
  if (vote.value?.vote_type === 'multiple') {
    if (isSelected(id)) {
      selected.value = selected.value.filter((s) => String(s) !== String(id))
    } else {
      selected.value = [...selected.value, id]
    }
  } else {
    selected.value = [id]
  }
}

async function load() {
  if (!isLoggedIn() || !voteId.value) return
  loadError.value = false
  try {
    const res: any = await getVoteDetail(voteId.value)
    vote.value = res?.data ? res.data : res
    if (vote.value?.show_rank) {
      await loadRanking()
    }
  } catch {
    loadError.value = true
  }
}

async function loadRanking() {
  try {
    const res: any = await getVoteRanking(voteId.value)
    const data = res?.data ? res.data : res
    ranking.value = data?.ranking || []
  } catch {
    ranking.value = []
  }
}

async function onCast() {
  if (casting.value || selected.value.length === 0) return
  casting.value = true
  try {
    await castVote(voteId.value, selected.value)
    voted.value = true
    uni.showToast({ title: '投票成功', icon: 'success' })
    selected.value = []
    await load()
  } catch (e: any) {
    uni.showToast({ title: e?.message || '投票失败，请稍后重试', icon: 'none' })
  } finally {
    casting.value = false
  }
}

function goLogin() {
  redirectToLogin()
}

onLoad((opts: any) => {
  voteId.value = String(opts?.id || opts?.vote_id || '')
  load()
})

onPullDownRefresh(async () => {
  await load()
  uni.stopPullDownRefresh()
})
</script>

<style scoped>
.vdetail-page {
  min-height: 100vh;
  background: #f5f6fa;
  padding-bottom: 40rpx;
}
.vhead {
  background: #fff;
  padding: 36rpx 32rpx;
  margin-bottom: 20rpx;
}
.vtitle {
  font-size: 36rpx;
  font-weight: 700;
  color: #333;
}
.vdesc {
  font-size: 26rpx;
  color: #888;
  margin-top: 14rpx;
  display: block;
}
.vmeta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 20rpx;
}
.vtype {
  font-size: 22rpx;
  color: var(--scrm-primary);
  background: rgba(7, 193, 96, 0.1);
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
}
.vtime {
  font-size: 24rpx;
  color: #aaa;
  margin-left: 20rpx;
}
.vtotal {
  font-size: 24rpx;
  color: #ff7a45;
  margin-left: 20rpx;
}
.options {
  padding: 0 24rpx;
}
.option {
  display: flex;
  align-items: center;
  background: #fff;
  border: 2rpx solid transparent;
  border-radius: 14rpx;
  padding: 24rpx 20rpx;
  margin-bottom: 16rpx;
}
.option.selected {
  border-color: var(--scrm-primary);
  background: rgba(7, 193, 96, 0.04);
}
.option.voted {
  align-items: flex-start;
}
.opt-check {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 2rpx solid #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: 18rpx;
  color: #fff;
  font-size: 24rpx;
}
.option.selected .opt-check {
  background: var(--scrm-primary);
  border-color: var(--scrm-primary);
}
.opt-img {
  width: 96rpx;
  height: 96rpx;
  border-radius: 12rpx;
  margin-right: 18rpx;
  flex-shrink: 0;
  background: #f2f3f5;
}
.opt-body {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.opt-title {
  font-size: 30rpx;
  color: #333;
  font-weight: 500;
}
.opt-desc {
  font-size: 24rpx;
  color: #999;
  margin-top: 8rpx;
}
.opt-bar {
  height: 12rpx;
  background: #f0f1f3;
  border-radius: 6rpx;
  margin-top: 16rpx;
  overflow: hidden;
}
.opt-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #7ee0a3, var(--scrm-primary));
  border-radius: 6rpx;
}
.opt-stat {
  font-size: 22rpx;
  color: #aaa;
  margin-top: 10rpx;
}
.cast-action {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.cast-btn {
  width: 100%;
  height: 92rpx;
  line-height: 92rpx;
  border-radius: 46rpx;
  background: var(--scrm-primary);
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
}
.cast-btn[disabled] {
  background: #ccc;
  color: #fff;
}
.cast-hint {
  font-size: 24rpx;
  color: #999;
  margin-top: 18rpx;
}
.section-label {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 16rpx;
}
.rank-section {
  padding: 24rpx;
}
.rank-item {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 12rpx;
  padding: 22rpx 24rpx;
  margin-bottom: 14rpx;
}
.rank-no {
  width: 44rpx;
  height: 44rpx;
  line-height: 44rpx;
  text-align: center;
  border-radius: 50%;
  background: #f0f1f3;
  color: #999;
  font-size: 24rpx;
  font-weight: 700;
  flex-shrink: 0;
}
.rank-no.r1 {
  background: #ffd700;
  color: #fff;
}
.rank-no.r2 {
  background: #c0c0c0;
  color: #fff;
}
.rank-no.r3 {
  background: #cd7f32;
  color: #fff;
}
.rank-title {
  flex: 1;
  font-size: 28rpx;
  color: #333;
  margin-left: 20rpx;
}
.rank-count {
  font-size: 24rpx;
  color: #888;
  margin-right: 20rpx;
}
.rank-pct {
  font-size: 24rpx;
  color: var(--scrm-primary);
  font-weight: 600;
  width: 90rpx;
  text-align: right;
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
