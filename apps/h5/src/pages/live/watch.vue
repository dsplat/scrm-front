<template>
  <view class="watch-page">
    <NavBar :title="room?.title || '直播'" />

    <view v-if="loading" class="loading-tip">
      <text>加载中...</text>
    </view>

    <template v-else>
      <!-- polyv：web-view 嵌保利威观看页（含弹幕） -->
      <web-view v-if="polyvPlayUrl" :src="polyvPlayUrl" class="player-webview" />

      <!-- 其余：video 播放 m3u8/mp4 -->
      <video
        v-else-if="playUrl"
        :src="playUrl"
        class="player-video"
        controls
        autoplay
        :show-fullscreen-btn="true"
      />

      <view v-else class="no-player">
        <text>{{ placeholderText }}</text>
      </view>

      <!-- 弹幕区提示：仅 polyv 有 chatConfig，且 web-view 内已含弹幕时不再重复渲染 -->
      <view v-if="chat && !polyvPlayUrl" class="chat-tip">
        <text>聊天室已启用（{{ chat.type }}），请在播放页内互动</text>
      </view>

      <view v-if="room" class="watch-info">
        <text class="watch-status">
          {{ statusLabel(room.status) }}
        </text>
        <text v-if="watchSeconds > 0" class="watch-duration"> 已观看 {{ watchSeconds }} 秒 </text>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import NavBar from '../../components/NavBar.vue'
import { watchLiveRoom, reportLiveView, type LiveWatchResult } from '../../api/live'

const room = ref<LiveWatchResult | null>(null)
const loading = ref(true)
const watchSeconds = ref(0)
let heartbeat: ReturnType<typeof setInterval> | null = null
let pendingSeconds = 0

const playUrl = computed(() => room.value?.play_url || room.value?.replay_url || '')
const polyvPlayUrl = computed(() =>
  room.value?.provider === 'polyv' && playUrl.value ? playUrl.value : '',
)
const chat = computed(() => room.value?.chat ?? null)
const placeholderText = computed(() => {
  const status = room.value?.status
  if (status === 'scheduled') return '直播尚未开始，请稍候'
  if (status === 'ended') return '直播已结束，暂无回放'
  return '暂无可播放地址'
})

function statusLabel(s: string) {
  return (
    ({ scheduled: '待开播', living: '直播中', ended: '已结束' } as Record<string, string>)[s] ?? s
  )
}

// 30s 心跳上报观看时长；离开页面前上报尾段
function startHeartbeat(roomId: string) {
  heartbeat = setInterval(() => {
    pendingSeconds += 30
    watchSeconds.value += 30
    reportLiveView(roomId, pendingSeconds)
      .then(() => {
        pendingSeconds = 0
      })
      .catch(() => {
        // 上报失败保留累计，下轮合并上报
      })
  }, 30000)
}

async function stopHeartbeat(roomId: string) {
  if (heartbeat) {
    clearInterval(heartbeat)
    heartbeat = null
  }
  if (pendingSeconds > 0) {
    try {
      await reportLiveView(roomId, pendingSeconds)
    } catch {
      // 忽略离场上报失败
    }
    pendingSeconds = 0
  }
}

onMounted(async () => {
  const pages = getCurrentPages()
  const current: any = pages[pages.length - 1]
  const roomId = current?.options?.room_id ?? current?.$page?.options?.room_id ?? ''

  try {
    room.value = await watchLiveRoom(roomId)
    startHeartbeat(String(roomId))
    // #ifdef H5
    uni.setNavigationBarTitle({ title: room.value.title || '直播' })
    // #endif
  } catch (e: any) {
    uni.showToast({ title: e.message || '进入观看失败', icon: 'none' })
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  const pages = getCurrentPages()
  const current: any = pages[pages.length - 1]
  const roomId = current?.options?.room_id ?? current?.$page?.options?.room_id ?? ''
  if (roomId) stopHeartbeat(String(roomId))
})
</script>

<style scoped>
.watch-page {
  min-height: 100vh;
  background: #111;
}

.player-webview {
  width: 100%;
  height: 56vw;
}

.player-video {
  width: 100%;
  height: 56vw;
}

.no-player {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 56vw;
  background: #222;
  color: #999;
  font-size: 28rpx;
}

.chat-tip {
  padding: 20rpx 30rpx;
  font-size: 26rpx;
  color: #07c160;
  background: #1c1c1c;
}

.watch-info {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx 30rpx;
}

.watch-status {
  font-size: 24rpx;
  color: #fff;
  border-radius: 6rpx;
  padding: 4rpx 14rpx;
  background: #333;
}

.watch-duration {
  font-size: 24rpx;
  color: #999;
}

.loading-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40vh;
  color: #999;
}
</style>
