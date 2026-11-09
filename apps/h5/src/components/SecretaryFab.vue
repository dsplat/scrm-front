<template>
  <!-- 悬浮小秘书入口：7 天关闭期内不渲染；tab 页抬高到原生 tabBar + 安全区之上 -->
  <view
    v-if="visible"
    class="secretary-fab"
    :class="{
      'secretary-fab--tab': tabPage,
      'secretary-fab--above-bar': !tabPage && aboveBottomBar,
    }"
    @tap="openSecretary"
  >
    <view class="secretary-fab__bubble">
      <text class="secretary-fab__label"> 秘 </text>
      <view class="secretary-fab__close" @tap.stop="dismiss">
        <text class="secretary-fab__close-icon"> × </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

withDefaults(
  defineProps<{
    /** tabBar 页需要避开底部原生 tabBar（120rpx）；其他页贴近安全区（32rpx） */
    tabPage?: boolean
    /**
     * 详情页存在固定底部操作栏（立即购买/报名）时抬高悬浮球，避免遮挡主操作按钮。
     * 仅非 tab 页生效。
     */
    aboveBottomBar?: boolean
  }>(),
  { tabPage: false, aboveBottomBar: false },
)

const DISMISS_KEY = 'secretary_fab_dismissed_until'
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000
const DISMISS_EVENT = 'secretary-fab-dismissed'

const visible = ref(false)

function isDismissed(): boolean {
  try {
    const until = Number(uni.getStorageSync(DISMISS_KEY))
    return Number.isFinite(until) && until > Date.now()
  } catch {
    return false
  }
}

/** 同页/跨页同时隐藏：关闭动作广播给所有已挂载实例 */
function hideForDismiss(): void {
  visible.value = false
}

function dismiss(): void {
  try {
    uni.setStorageSync(DISMISS_KEY, Date.now() + DISMISS_MS)
  } catch {
    // 写存储失败也要隐藏当前实例；下次进入页面会重新出现，属可接受的降级
  }
  hideForDismiss()
  uni.$emit(DISMISS_EVENT)
}

function openSecretary(): void {
  uni.navigateTo({ url: '/pages/secretary/index' })
}

onMounted(() => {
  visible.value = !isDismissed()
  uni.$on(DISMISS_EVENT, hideForDismiss)
})

onUnmounted(() => {
  uni.$off(DISMISS_EVENT, hideForDismiss)
})
</script>

<style scoped>
.secretary-fab {
  position: fixed;
  right: 28rpx;
  bottom: calc(32rpx + env(safe-area-inset-bottom));
  z-index: 500;
}
.secretary-fab--tab {
  bottom: calc(120rpx + env(safe-area-inset-bottom));
}
.secretary-fab--above-bar {
  /* 底部操作栏约 112-120rpx 高，留 40rpx 间距 */
  bottom: calc(160rpx + env(safe-area-inset-bottom));
}
.secretary-fab__bubble {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: var(--scrm-primary);
  color: #fff;
  box-shadow: 0 8rpx 24rpx rgba(17, 24, 39, 0.18);
}
.secretary-fab__label {
  color: #fff;
  font-size: 34rpx;
  font-weight: 600;
  line-height: 1;
}
.secretary-fab__close {
  position: absolute;
  top: -10rpx;
  right: -10rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36rpx;
  height: 36rpx;
  border: 1rpx solid var(--scrm-border, #ebedf0);
  border-radius: 50%;
  background: var(--scrm-card-bg, #fff);
}
.secretary-fab__close-icon {
  color: var(--scrm-text-tertiary, #8a9099);
  font-size: 24rpx;
  line-height: 1;
}
</style>
