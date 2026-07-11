<template>
  <view class="live-code-page">
    <view class="brand-header">
      <image class="logo" src="/static/logo.png" mode="aspectFit" />
      <text class="brand-name">{{ brandName }}</text>
    </view>
    <view class="welcome-card">
      <text class="welcome-title">{{ welcomeTitle }}</text>
      <text class="welcome-desc">{{ welcomeDesc }}</text>
      <button class="action-btn primary" @tap="addContact">添加客服</button>
      <button class="action-btn" @tap="joinGroup">加入社群</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getLiveCodeInfo, recordLiveCodeScan } from '../../api/scrm'

const brandName = ref('SCRM')
const welcomeTitle = ref('欢迎扫码！')
const welcomeDesc = ref('您已通过扫码进入，请添加客服或加入社群')

onMounted(async () => {
  // @ts-ignore - uni is provided by uni-app runtime
  const pages = getCurrentPages()
  // @ts-ignore
  const page = pages[pages.length - 1]
  const liveCodeId = page?.options?.id || page?.options?.code

  if (liveCodeId) {
    // 记录扫码
    try {
      await recordLiveCodeScan(liveCodeId)
    } catch {}

    // 获取活码信息
    try {
      const data: any = await getLiveCodeInfo(liveCodeId)
      if (data.name) brandName.value = data.name
      if (data.welcome_message) welcomeTitle.value = data.welcome_message
      if (data.description) welcomeDesc.value = data.description
    } catch {}
  }
})

function addContact() {
  // @ts-ignore - uni is provided by uni-app runtime
  uni.navigateTo({ url: '/pages/self-service/index' })
}

function joinGroup() {
  // @ts-ignore - uni is provided by uni-app runtime
  uni.showToast({ title: '加入社群中...', icon: 'loading' })
}
</script>

<style scoped>
.live-code-page {
  padding: 20rpx;
  min-height: 100vh;
  background: #f5f6fa;
}
.brand-header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
}
.logo {
  width: 80rpx;
  height: 80rpx;
}
.brand-name {
  font-size: 36rpx;
  font-weight: bold;
  margin-left: 16rpx;
}
.welcome-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 40rpx;
  text-align: center;
}
.welcome-title {
  font-size: 32rpx;
  font-weight: bold;
  display: block;
  margin-bottom: 16rpx;
}
.welcome-desc {
  font-size: 26rpx;
  color: #999;
  display: block;
  margin-bottom: 32rpx;
}
.action-btn {
  width: 80%;
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 40rpx;
  font-size: 28rpx;
  margin: 12rpx auto;
}
.action-btn.primary {
  background: #07c160;
  color: #fff;
}
</style>
<template>
  <view class="live-code-page">
    <view class="brand-header">
      <image class="logo" src="/static/logo.png" mode="aspectFit" />
      <text class="brand-name">SCRM</text>
    </view>
    <view class="welcome-card">
      <text class="welcome-title">欢迎扫码！</text>
      <text class="welcome-desc">您已通过扫码进入，请添加客服或加入社群</text>
      <button class="action-btn primary" @tap="addContact">添加客服</button>
      <button class="action-btn" @tap="joinGroup">加入社群</button>
    </view>
  </view>
</template>

<script setup lang="ts">
function addContact() {
  uni.navigateTo({ url: '/pages/self-service/index' })
}
function joinGroup() {
  uni.showToast({ title: '加入社群中...', icon: 'loading' })
}
</script>

<style scoped>
.live-code-page {
  padding: 20rpx;
  min-height: 100vh;
  background: #f5f6fa;
}
.brand-header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
}
.logo {
  width: 80rpx;
  height: 80rpx;
}
.brand-name {
  font-size: 36rpx;
  font-weight: bold;
  margin-left: 16rpx;
}
.welcome-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 40rpx;
  text-align: center;
}
.welcome-title {
  font-size: 32rpx;
  font-weight: bold;
  display: block;
  margin-bottom: 16rpx;
}
.welcome-desc {
  font-size: 26rpx;
  color: #999;
  display: block;
  margin-bottom: 32rpx;
}
.action-btn {
  width: 80%;
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 40rpx;
  font-size: 28rpx;
  margin: 12rpx auto;
}
.action-btn.primary {
  background: #07c160;
  color: #fff;
}
</style>
