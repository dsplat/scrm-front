<template>
  <view class="draw-page">
    <NavBar :title="activity?.title || '幸运抽奖'" />

    <view v-if="!loggedIn" class="login-prompt">
      <text class="login-tip-text"> 登录后参与抽奖 </text>
      <button class="go-login-btn" @tap="goLogin">去登录</button>
    </view>

    <template v-else>
      <ErrorState v-if="loadError && !activity" message="活动加载失败，请稍后重试" @retry="load" />

      <template v-else-if="activity">
        <!-- 活动头部 -->
        <view class="hero">
          <text class="hero-title">
            {{ activity.title }}
          </text>
          <text v-if="activity.description" class="hero-desc">
            {{ activity.description }}
          </text>
          <text class="hero-time">
            {{ timeText }}
          </text>
        </view>

        <!-- 奖品九宫格 -->
        <view v-if="prizes.length" class="prize-section">
          <text class="section-label"> 奖品池 </text>
          <view class="prize-grid">
            <view v-for="p in prizes" :key="p.prize_id" class="prize-cell">
              <image v-if="p.image_url" class="prize-img" :src="p.image_url" mode="aspectFill" />
              <view v-else class="prize-img placeholder">
                <text>🎁</text>
              </view>
              <text class="prize-name">
                {{ p.name }}
              </text>
              <text class="prize-remain"> 剩 {{ p.remaining_count ?? 0 }} </text>
            </view>
          </view>
        </view>

        <!-- 抽奖按钮 -->
        <view class="draw-action">
          <button class="draw-btn" :disabled="drawing || !canDraw" @tap="onDraw">
            {{ drawing ? '抽奖中...' : drawBtnText }}
          </button>
          <text v-if="maxPerUser > 0" class="draw-hint">
            每人限抽 {{ maxPerUser }} 次，已抽 {{ myLogs.length }} 次
          </text>
        </view>

        <!-- 我的记录 -->
        <view v-if="myLogs.length" class="logs-section">
          <text class="section-label"> 我的抽奖记录 </text>
          <view v-for="(log, i) in myLogs" :key="i" class="log-item">
            <text class="log-result" :class="log.result">
              {{ logResultText(log.result) }}
            </text>
            <text class="log-prize">
              {{ log.prize?.name || log.prize_name || '—' }}
            </text>
            <text class="log-time">
              {{ formatDate(log.created_at) }}
            </text>
          </view>
        </view>
      </template>
    </template>

    <!-- 结果弹窗 -->
    <view v-if="showResult" class="modal-mask" @tap="closeResult">
      <view class="modal-box" @tap.stop>
        <text class="modal-emoji">
          {{ resultEmoji }}
        </text>
        <text class="modal-title">
          {{ resultTitle }}
        </text>
        <text class="modal-desc">
          {{ resultDesc }}
        </text>
        <button class="modal-btn" @tap="closeResult">知道了</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad, onPullDownRefresh } from '@dcloudio/uni-app'
import {
  getLotteryActivity,
  drawLottery,
  getMyLotteryLogs,
  type LotteryActivityVO,
  type LotteryPrize,
} from '../../api/marketing'
import { isLoggedIn } from '../../api/auth'
import { redirectToLogin } from '../../utils/request'
import { useTenantTitle } from '../../composables/useTenantTitle'
import NavBar from '../../components/NavBar.vue'
import ErrorState from '../../components/ErrorState.vue'

const activityId = ref<string>('')
const activity = ref<LotteryActivityVO | null>(null)
const myLogs = ref<any[]>([])
const loading = ref(false)
const drawing = ref(false)
const loadError = ref(false)
const loggedIn = computed(() => isLoggedIn())

const showResult = ref(false)
const resultType = ref<'win' | 'miss' | 'blacklist' | string>('miss')
const resultPrize = ref<LotteryPrize | null>(null)

useTenantTitle()

const prizes = computed(() => activity.value?.prizes || [])
const maxPerUser = computed(() => Number(activity.value?.rules?.max_per_user || 0))
const canDraw = computed(() => {
  const a = activity.value
  if (!a || a.status !== 'active') return false
  if (maxPerUser.value > 0 && myLogs.value.length >= maxPerUser.value) return false
  return true
})
const drawBtnText = computed(() => {
  const a = activity.value
  if (!a) return '立即抽奖'
  if (a.status !== 'active') return '活动未开放'
  if (maxPerUser.value > 0 && myLogs.value.length >= maxPerUser.value) return '抽奖次数已用完'
  return '立即抽奖'
})

const timeText = computed(() => {
  const a = activity.value
  if (!a) return ''
  if (!a.start_at && !a.end_at) return '长期有效'
  const s = a.start_at ? formatDate(a.start_at) : ''
  const e = a.end_at ? formatDate(a.end_at) : ''
  if (s && e) return `${s} 至 ${e}`
  return e ? `截止 ${e}` : `${s} 开始`
})

const resultEmoji = computed(() =>
  resultType.value === 'win' ? '🎉' : resultType.value === 'blacklist' ? '⚠️' : '🍀',
)
const resultTitle = computed(() => {
  if (resultType.value === 'win') return '恭喜中奖！'
  if (resultType.value === 'blacklist') return '暂无抽奖资格'
  return '很遗憾，未中奖'
})
const resultDesc = computed(() => {
  if (resultType.value === 'win') return resultPrize.value?.name || '奖品已发放'
  if (resultType.value === 'blacklist') return '如有疑问请联系客服'
  return '再接再厉，下次一定中'
})

function logResultText(result?: string) {
  const map: Record<string, string> = { win: '中奖', miss: '未中奖', blacklist: '无资格' }
  return (result && map[result]) || result || '—'
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return ''
  const d = new Date(String(dateStr).replace(' ', 'T'))
  if (isNaN(d.getTime())) return String(dateStr).slice(0, 16)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

async function load() {
  if (!isLoggedIn() || !activityId.value) return
  loading.value = true
  loadError.value = false
  try {
    const [act, logs]: any = await Promise.all([
      getLotteryActivity(activityId.value),
      getMyLotteryLogs(activityId.value).catch(() => []),
    ])
    activity.value = act?.data ? act.data : act
    myLogs.value = Array.isArray(logs) ? logs : logs?.data || []
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

async function onDraw() {
  if (drawing.value || !canDraw.value) return
  drawing.value = true
  try {
    const res: any = await drawLottery(activityId.value)
    const data = res?.data ? res.data : res
    resultType.value = data?.result || 'miss'
    resultPrize.value = data?.prize || null
    showResult.value = true
    // 抽奖后刷新记录与奖品余量
    await load()
  } catch (e: any) {
    uni.showToast({ title: e?.message || '抽奖失败，请稍后重试', icon: 'none' })
  } finally {
    drawing.value = false
  }
}

function closeResult() {
  showResult.value = false
}

function goLogin() {
  redirectToLogin()
}

onLoad((options: any) => {
  activityId.value = String(options?.id || options?.activity_id || '')
  load()
})

onPullDownRefresh(async () => {
  await load()
  uni.stopPullDownRefresh()
})
</script>

<style scoped>
.draw-page {
  min-height: 100vh;
  background: #f5f6fa;
  padding-bottom: 40rpx;
}
.hero {
  background: linear-gradient(135deg, #ff7a45 0%, #ff5a3c 100%);
  padding: 48rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.hero-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #fff;
}
.hero-desc {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 16rpx;
  text-align: center;
}
.hero-time {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 12rpx;
}
.section-label {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 20rpx;
}
.prize-section {
  padding: 32rpx 24rpx 0;
}
.prize-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}
.prize-cell {
  width: 32%;
  background: #fff;
  border-radius: 14rpx;
  padding: 20rpx 12rpx;
  margin-bottom: 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.prize-img {
  width: 120rpx;
  height: 120rpx;
  border-radius: 12rpx;
  background: #f2f3f5;
}
.prize-img.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 56rpx;
}
.prize-name {
  font-size: 24rpx;
  color: #333;
  margin-top: 14rpx;
  text-align: center;
}
.prize-remain {
  font-size: 20rpx;
  color: #bbb;
  margin-top: 6rpx;
}
.draw-action {
  padding: 40rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.draw-btn {
  width: 400rpx;
  height: 96rpx;
  line-height: 96rpx;
  border-radius: 48rpx;
  background: linear-gradient(135deg, #ff9a5a 0%, #ff5a3c 100%);
  color: #fff;
  font-size: 34rpx;
  font-weight: 700;
  box-shadow: 0 8rpx 24rpx rgba(255, 90, 60, 0.35);
}
.draw-btn[disabled] {
  background: #ccc;
  box-shadow: none;
  color: #fff;
}
.draw-hint {
  font-size: 24rpx;
  color: #999;
  margin-top: 20rpx;
}
.logs-section {
  padding: 0 24rpx;
}
.log-item {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 12rpx;
  padding: 22rpx 24rpx;
  margin-bottom: 14rpx;
}
.log-result {
  font-size: 26rpx;
  font-weight: 600;
  color: #999;
  width: 120rpx;
}
.log-result.win {
  color: #ff5a3c;
}
.log-prize {
  flex: 1;
  font-size: 26rpx;
  color: #333;
}
.log-time {
  font-size: 22rpx;
  color: #bbb;
}
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.modal-box {
  width: 560rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 56rpx 40rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.modal-emoji {
  font-size: 96rpx;
}
.modal-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #333;
  margin-top: 24rpx;
}
.modal-desc {
  font-size: 28rpx;
  color: #888;
  margin-top: 16rpx;
  text-align: center;
}
.modal-btn {
  margin-top: 40rpx;
  width: 320rpx;
  height: 84rpx;
  line-height: 84rpx;
  border-radius: 42rpx;
  background: var(--scrm-primary);
  color: #fff;
  font-size: 30rpx;
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
