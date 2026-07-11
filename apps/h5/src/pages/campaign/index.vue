<template>
  <view class="campaign-page">
    <image class="banner" src="/static/campaign-banner.png" mode="widthFix" />
    <view class="campaign-info">
      <text class="title">
        {{ title }}
      </text>
      <text class="desc">
        {{ description }}
      </text>
      <view v-if="!expired && endDate" class="countdown">
        <text>距结束: {{ countdown }}</text>
      </view>
      <button class="join-btn" :disabled="expired || joining" @tap="handleJoinCampaign">
        {{ joining ? '参与中...' : expired ? '活动已结束' : '立即参与' }}
      </button>
      <button class="share-btn" open-type="share">分享给好友</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { getCampaignDetail, joinCampaign } from '../../api/scrm'

const title = ref('限时优惠活动')
const description = ref('参与活动即可获得专属优惠和积分奖励')
const expired = ref(false)
const joining = ref(false)
const countdown = ref('')
const endDate = ref<number | null>(null)
let timer: number | null = null

onMounted(async () => {
  // 从页面参数获取活动 ID
  // @ts-ignore - uni is provided by uni-app runtime
  const pages = getCurrentPages()
  // @ts-ignore
  const page = pages[pages.length - 1]
  const campaignId = page?.options?.id || page?.options?.campaign_id

  if (campaignId) {
    try {
      const data: any = await getCampaignDetail(campaignId)
      title.value = data.name || title.value
      description.value = data.goal || data.description || description.value
      if (data.end_date) {
        endDate.value = new Date(data.end_date).getTime()
        startCountdown()
      }
    } catch {
      // Use default values if API unavailable
    }
  } else {
    // Default countdown for demo
    endDate.value = Date.now() + 86400000
    startCountdown()
  }
})

function startCountdown() {
  if (!endDate.value) return
  timer = setInterval(() => {
    const diff = endDate.value! - Date.now()
    if (diff <= 0) {
      expired.value = true
      return
    }
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    const s = Math.floor((diff % 60000) / 1000)
    countdown.value = `${h}h ${m}m ${s}s`
  }, 1000) as unknown as number
}

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

async function handleJoinCampaign() {
  // @ts-ignore - uni is provided by uni-app runtime
  const pages = getCurrentPages()
  // @ts-ignore
  const page = pages[pages.length - 1]
  const campaignId = page?.options?.id || page?.options?.campaign_id

  if (!campaignId) {
    // @ts-ignore
    uni.showToast({ title: '参与成功！', icon: 'success' })
    return
  }

  joining.value = true
  try {
    await joinCampaign(campaignId)
    // @ts-ignore
    uni.showToast({ title: '参与成功！', icon: 'success' })
  } catch {
    // @ts-ignore
    uni.showToast({ title: '参与失败，请稍后再试', icon: 'none' })
  } finally {
    joining.value = false
  }
}
</script>

<style scoped>
.campaign-page {
  background: #fff;
  min-height: 100vh;
}
.banner {
  width: 100%;
}
.campaign-info {
  padding: 32rpx;
}
.title {
  font-size: 36rpx;
  font-weight: bold;
  display: block;
}
.desc {
  font-size: 28rpx;
  color: #666;
  display: block;
  margin: 16rpx 0;
}
.countdown {
  text-align: center;
  color: #e6a23c;
  font-size: 30rpx;
  margin: 20rpx 0;
}
.join-btn {
  background: #ff6b6b;
  color: #fff;
  border-radius: 40rpx;
  margin: 20rpx 0;
}
.share-btn {
  border-radius: 40rpx;
}
</style>
