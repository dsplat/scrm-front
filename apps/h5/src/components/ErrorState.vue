<template>
  <!-- 加载失败态：图标 + 文案 + 重试/返回出口（孤儿页治理核心组件，保证任何失败页可恢复） -->
  <view class="error-state">
    <view class="error-state__icon">
      <text class="error-state__icon-text"> ! </text>
    </view>
    <text class="error-state__message">
      {{ message }}
    </text>
    <view class="error-state__actions">
      <button
        v-if="showRetry"
        class="error-state__btn error-state__btn--primary"
        @tap="emit('retry')"
      >
        重试
      </button>
      <button v-if="showBack" class="error-state__btn" @tap="goBack">返回上一页</button>
    </view>
  </view>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    /** 失败提示文案 */
    message?: string
    /** 显示"重试"按钮（触发 retry 事件） */
    showRetry?: boolean
    /** 显示"返回上一页"按钮 */
    showBack?: boolean
  }>(),
  {
    message: '加载失败，请稍后重试',
    showRetry: true,
    showBack: true,
  },
)

const emit = defineEmits<{ retry: [] }>()

function goBack() {
  // @ts-ignore - getCurrentPages is provided by uni-app runtime
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    // 直链进入无上级页：回首页，保证不落孤儿页
    uni.switchTab({ url: '/pages/index/index' })
  }
}
</script>

<style scoped>
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 48rpx;
}
.error-state__icon {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: #f0f1f5;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
}
.error-state__icon-text {
  font-size: 56rpx;
  color: #bbb;
  line-height: 1;
}
.error-state__message {
  font-size: 28rpx;
  color: #999;
  text-align: center;
  margin-bottom: 48rpx;
}
.error-state__actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
}
.error-state__btn {
  width: 320rpx;
  height: 80rpx;
  line-height: 80rpx;
  background: #fff;
  color: #666;
  font-size: 28rpx;
  border-radius: 40rpx;
  border: 1px solid #ddd;
}
.error-state__btn--primary {
  background: var(--scrm-primary);
  color: #fff;
  border: none;
}
</style>
