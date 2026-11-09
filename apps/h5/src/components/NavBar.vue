<template>
  <!-- 微信内置浏览器：不渲染自绘导航栏，复用微信原生导航栏（其读取 document.title） -->
  <view v-if="!isWechat" class="scrm-navbar" :style="rootStyle">
    <view class="scrm-navbar__bar" :style="barStyle">
      <view v-if="showBack" class="scrm-navbar__back" @tap="handleBack">
        <text class="scrm-navbar__back-icon"> ‹ </text>
      </view>
      <view v-else class="scrm-navbar__side" />
      <view class="scrm-navbar__title">
        {{ title }}
      </view>
      <view class="scrm-navbar__side scrm-navbar__right">
        <slot name="right" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { isWechatBrowser } from '../utils/platform'

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

const isWechat = computed(() => isWechatBrowser())

/**
 * 小程序状态栏高度（px）。
 *
 * 小程序全局 navigationStyle=custom，页面从屏幕顶端起排，自绘栏会整条压在系统状态栏下方
 * （标题被时钟/刘海盖住，表现为「没有页头」）。H5 无状态栏，恒为 0，不受影响。
 */
const statusBarHeight = ref(0)
// #ifndef H5
try {
  statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 0
} catch {
  statusBarHeight.value = 0
}
// #endif

const rootStyle = computed(() => ({
  background: props.bgColor,
  paddingTop: `${statusBarHeight.value}px`,
}))

const barStyle = computed(() => ({
  background: props.bgColor,
  color: props.color,
}))

// 注意：document.title 统一由租户品牌（applyBranding / 页面 onShow）管理，
// 确保微信原生导航栏始终显示租户名；NavBar 的 title 仅渲染自绘栏文案，
// 不再同步到 document.title，避免页面名覆盖租户名。

function goHome() {
  uni.switchTab({ url: '/pages/index/index' })
}

function handleBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack({ fail: goHome })
  } else {
    goHome()
  }
}
</script>

<style scoped>
.scrm-navbar {
  position: sticky;
  top: 0;
  z-index: 100;
}
.scrm-navbar__bar {
  height: 88rpx;
  display: flex;
  align-items: center;
  padding: 0 16rpx;
  border-bottom: 1px solid #f0f0f0;
}
.scrm-navbar__back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.scrm-navbar__back-icon {
  font-size: 52rpx;
  line-height: 1;
}
.scrm-navbar__side {
  width: 64rpx;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
.scrm-navbar__title {
  flex: 1;
  text-align: center;
  font-size: 32rpx;
  font-weight: 600;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
