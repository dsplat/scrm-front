<template>
  <!-- 微信内置浏览器：不渲染自绘导航栏，复用微信原生导航栏（其读取 document.title） -->
  <view v-if="!isWechat" class="h5c-navbar">
    <view class="h5c-navbar__bar" :style="barStyle">
      <view v-if="showBack" class="h5c-navbar__back" @tap="handleBack">
        <text class="h5c-navbar__back-icon"> ‹ </text>
      </view>
      <view v-else class="h5c-navbar__side" />
      <view class="h5c-navbar__title">
        {{ title }}
      </view>
      <view class="h5c-navbar__side h5c-navbar__right">
        <slot name="right" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getCommerceConfig } from '../config'

const props = withDefaults(
  defineProps<{
    /** 导航栏标题（仅用于自绘栏视觉文案，不写入 document.title） */
    title?: string
    /** 是否显示返回按钮（tabbar 页传 false） */
    showBack?: boolean
    /** 背景色（默认白） */
    bgColor?: string
    /** 标题与图标颜色 */
    color?: string
  }>(),
  {
    title: '',
    showBack: true,
    bgColor: '#ffffff',
    color: '#333333',
  },
)

function detectWechat(): boolean {
  // #ifdef H5
  return /MicroMessenger/i.test(window.navigator.userAgent)
  // #endif
  // #ifndef H5
  return false
  // #endif
}

const isWechat = computed(() => detectWechat())

const barStyle = computed(() => ({
  background: props.bgColor,
  color: props.color,
}))

// 注意：document.title 统一由宿主应用的租户品牌逻辑管理，
// NavBar 的 title 仅渲染自绘栏文案，不同步到 document.title。

function handleBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    // 无上级页面（如直链进入）回首页（tabbar 页，路径可配置）
    uni.switchTab({ url: getCommerceConfig().homePage })
  }
}
</script>

<style scoped>
.h5c-navbar {
  position: sticky;
  top: 0;
  z-index: 100;
}
.h5c-navbar__bar {
  height: 88rpx;
  display: flex;
  align-items: center;
  padding: 0 16rpx;
  border-bottom: 1px solid #f0f0f0;
}
.h5c-navbar__back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.h5c-navbar__back-icon {
  font-size: 52rpx;
  line-height: 1;
}
.h5c-navbar__side {
  width: 64rpx;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
.h5c-navbar__title {
  flex: 1;
  text-align: center;
  font-size: 32rpx;
  font-weight: 600;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
