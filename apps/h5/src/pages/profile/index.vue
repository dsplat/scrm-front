<template>
  <view class="profile-page">
    <NavBar title="我的" :show-back="false" />
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

      <!-- 我的资产 -->
      <view class="asset-bar">
        <view class="asset-item" @tap="goMember">
          <text class="asset-value">
            {{ pointsText }}
          </text>
          <text class="asset-label"> 积分 </text>
        </view>
        <view class="asset-item" @tap="goOrders">
          <text class="asset-value icon"> 📋 </text>
          <text class="asset-label"> 订单 </text>
        </view>
        <view class="asset-item" @tap="goCourses">
          <text class="asset-value icon"> 🎓 </text>
          <text class="asset-label"> 课程 </text>
        </view>
        <view class="asset-item" @tap="goCertificates">
          <text class="asset-value icon"> 🏅 </text>
          <text class="asset-label"> 证书 </text>
        </view>
      </view>

      <!-- 我的服务 -->
      <view class="menu-section">
        <view class="section-title">
          <text>我的服务</text>
        </view>
        <view class="menu-item" @tap="goOrders">
          <text class="menu-label"> 我的订单 </text>
          <text class="menu-arrow"> › </text>
        </view>
        <view class="menu-item" @tap="goMyActivities">
          <text class="menu-label"> 我的活动 </text>
          <text class="menu-arrow"> › </text>
        </view>
        <view class="menu-item" @tap="goCourses">
          <text class="menu-label"> 我的课程 </text>
          <text class="menu-arrow"> › </text>
        </view>
        <view class="menu-item" @tap="goCertificates">
          <text class="menu-label"> 我的证书 </text>
          <text class="menu-arrow"> › </text>
        </view>
      </view>

      <!-- 会员权益 -->
      <view class="menu-section">
        <view class="section-title">
          <text>会员权益</text>
        </view>
        <view class="menu-item" @tap="goMember">
          <text class="menu-label"> 我的积分 </text>
          <text class="menu-arrow"> › </text>
        </view>
        <view class="menu-item" @tap="goCoupons">
          <text class="menu-label"> 我的优惠券 </text>
          <text class="menu-arrow"> › </text>
        </view>
        <view class="menu-item" @tap="goCheckIn">
          <text class="menu-label"> 打卡中心 </text>
          <text class="menu-arrow"> › </text>
        </view>
        <view class="menu-item" @tap="goDistribution">
          <text class="menu-label"> 分销中心 </text>
          <text class="menu-arrow"> › </text>
        </view>
      </view>

      <!-- 互动活动 -->
      <view class="menu-section">
        <view class="section-title">
          <text>互动活动</text>
        </view>
        <view class="menu-item" @tap="goLottery">
          <text class="menu-label"> 幸运抽奖 </text>
          <text class="menu-arrow"> › </text>
        </view>
        <view class="menu-item" @tap="goVoting">
          <text class="menu-label"> 投票活动 </text>
          <text class="menu-arrow"> › </text>
        </view>
      </view>

      <!-- 账号设置 -->
      <view class="menu-section">
        <view class="section-title">
          <text>账号设置</text>
        </view>
        <view class="menu-item" @tap="goEdit">
          <text class="menu-label"> 编辑资料 </text>
          <text class="menu-arrow"> › </text>
        </view>
        <view class="menu-item" @tap="goChangePassword">
          <text class="menu-label"> 修改密码 </text>
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
import { onShow } from '@dcloudio/uni-app'
import { isLoggedIn } from '../../api/auth'
import { getMyPointsBalance } from '../../api/member'
import { useUserStore } from '../../store/user'
import { useTenantTitle } from '../../composables/useTenantTitle'
import NavBar from '../../components/NavBar.vue'

const { state, fetchUser, logout } = useUserStore()
const loggingOut = ref(false)
const points = ref<number | null>(null)

// 微信原生栏标题统一为租户名
useTenantTitle()

const loggedIn = computed(() => isLoggedIn())
const user = computed(() => state.user)
const pointsText = computed(() => (points.value === null ? '--' : String(points.value)))

async function loadPoints() {
  if (!isLoggedIn()) return
  try {
    const res = await getMyPointsBalance()
    points.value = Number(res?.balance || 0)
  } catch {
    points.value = null
  }
}

onMounted(async () => {
  if (loggedIn.value && !state.user) {
    await fetchUser()
  }
})

onShow(() => {
  if (loggedIn.value) loadPoints()
})

function goLogin() {
  uni.navigateTo({ url: '/pages/auth/login' })
}

function goEdit() {
  uni.navigateTo({ url: '/pages/profile/edit' })
}

function goChangePassword() {
  uni.navigateTo({ url: '/pages/profile/password' })
}

function goMember() {
  uni.navigateTo({ url: '/pages/member/index' })
}

function goOrders() {
  uni.navigateTo({ url: '/pages/my/orders' })
}

function goMyActivities() {
  uni.navigateTo({ url: '/pages/my/activities' })
}

function goCourses() {
  uni.navigateTo({ url: '/pages/my/courses' })
}

function goCertificates() {
  uni.navigateTo({ url: '/pages/my/certificates' })
}

function goCoupons() {
  uni.navigateTo({ url: '/pages/my/coupons' })
}

function goLottery() {
  uni.navigateTo({ url: '/pages/lottery/index' })
}

function goVoting() {
  uni.navigateTo({ url: '/pages/voting/index' })
}

function goCheckIn() {
  uni.navigateTo({ url: '/pages/checkin/index' })
}

function goDistribution() {
  uni.navigateTo({ url: '/pages/distribution/index' })
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
  background: var(--scrm-primary);
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
  border: 1px solid var(--scrm-primary);
  border-radius: 32rpx;
}
.edit-btn text {
  font-size: 26rpx;
  color: var(--scrm-primary);
}
.asset-bar {
  display: flex;
  background: #fff;
  margin: 0 24rpx 20rpx;
  border-radius: 16rpx;
  padding: 32rpx 0;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}
.asset-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.asset-value {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--scrm-primary);
}
.asset-value.icon {
  font-size: 40rpx;
  font-weight: normal;
}
.asset-label {
  font-size: 24rpx;
  color: #999;
  margin-top: 10rpx;
}
.menu-section {
  background: #fff;
  margin-bottom: 20rpx;
}
.section-title {
  padding: 24rpx 32rpx 8rpx;
}
.section-title text {
  font-size: 24rpx;
  color: #bbb;
}
.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx 32rpx;
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
