<template>
  <view class="profile-page">
    <!-- 未登录状态 -->
    <view v-if="!loggedIn" class="login-prompt">
      <image class="default-avatar" src="/static/logo.png" mode="aspectFit" />
      <text class="prompt-text"> 登录后查看个人信息 </text>
      <button class="btn-login" @tap="goLogin">去登录</button>
    </view>

    <!-- 已登录状态 -->
    <template v-else>
      <!-- 用户信息卡片 -->
      <view class="user-card">
        <view class="avatar-wrap">
          <image class="avatar" :src="user?.avatar || '/static/logo.png'" mode="aspectFill" />
        </view>
        <view class="user-info">
          <text class="user-name">
            {{ user?.name || '未设置昵称' }}
          </text>
          <text class="user-email">
            {{ user?.email || '' }}
          </text>
        </view>
        <view class="edit-btn" @tap="goEdit">
          <text>编辑</text>
        </view>
      </view>

      <!-- 功能菜单 -->
      <view class="menu-section">
        <view class="menu-item" @tap="goEdit">
          <text class="menu-label"> 编辑资料 </text>
          <text class="menu-arrow"> › </text>
        </view>
        <view class="menu-item" @tap="goChangePassword">
          <text class="menu-label"> 修改密码 </text>
          <text class="menu-arrow"> › </text>
        </view>
        <view class="menu-item" @tap="goMyActivities">
          <text class="menu-label"> 我的活动 </text>
          <text class="menu-arrow"> › </text>
        </view>
      </view>

      <!-- 退出登录 -->
      <view class="logout-section">
        <button class="btn-logout" :disabled="loggingOut" @tap="handleLogout">
          {{ loggingOut ? '退出中...' : '退出登录' }}
        </button>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { isLoggedIn } from '../../api/auth'
import { useUserStore } from '../../store/user'

const { state, fetchUser, logout } = useUserStore()
const loggingOut = ref(false)

const loggedIn = computed(() => isLoggedIn())
const user = computed(() => state.user)

onMounted(async () => {
  if (loggedIn.value && !state.user) {
    await fetchUser()
  }
})

function goLogin() {
  uni.navigateTo({ url: '/pages/auth/login' })
}

function goEdit() {
  uni.navigateTo({ url: '/pages/profile/edit' })
}

function goChangePassword() {
  uni.showToast({ title: '功能开发中', icon: 'none' })
}

function goMyActivities() {
  uni.showToast({ title: '功能开发中', icon: 'none' })
}

async function handleLogout() {
  loggingOut.value = true
  try {
    await logout()
    uni.reLaunch({ url: '/pages/auth/login' })
  } catch {
    uni.showToast({ title: '退出失败', icon: 'none' })
  } finally {
    loggingOut.value = false
  }
}
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: #f5f6fa;
}
.login-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 200rpx;
}
.default-avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  margin-bottom: 24rpx;
}
.prompt-text {
  font-size: 28rpx;
  color: #999;
  margin-bottom: 40rpx;
}
.btn-login {
  width: 300rpx;
  height: 80rpx;
  line-height: 80rpx;
  background: #07c160;
  color: #fff;
  font-size: 30rpx;
  border-radius: 40rpx;
}
.user-card {
  display: flex;
  align-items: center;
  background: #fff;
  padding: 40rpx 32rpx;
  margin-bottom: 20rpx;
}
.avatar-wrap {
  margin-right: 24rpx;
}
.avatar {
  width: 112rpx;
  height: 112rpx;
  border-radius: 50%;
  background: #eee;
}
.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.user-name {
  font-size: 34rpx;
  font-weight: bold;
  color: #333;
}
.user-email {
  font-size: 26rpx;
  color: #999;
  margin-top: 8rpx;
}
.edit-btn {
  padding: 12rpx 28rpx;
  border: 1px solid #07c160;
  border-radius: 32rpx;
}
.edit-btn text {
  font-size: 26rpx;
  color: #07c160;
}
.menu-section {
  background: #fff;
  margin-bottom: 20rpx;
}
.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  border-bottom: 1px solid #f5f5f5;
}
.menu-item:last-child {
  border-bottom: none;
}
.menu-label {
  font-size: 30rpx;
  color: #333;
}
.menu-arrow {
  font-size: 36rpx;
  color: #ccc;
}
.logout-section {
  padding: 40rpx 32rpx;
}
.btn-logout {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background: #fff;
  color: #e64340;
  font-size: 30rpx;
  border-radius: 12rpx;
  border: 1px solid #e64340;
}
</style>
