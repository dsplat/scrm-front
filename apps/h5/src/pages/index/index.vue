<template>
  <view class="home-page">
    <NavBar :title="homeTitle" :show-back="false" />
    <!-- Banner -->
    <view class="banner">
      <view class="banner-content">
        <text class="banner-title"> 欢迎使用 SCRM 会员服务 </text>
        <text class="banner-desc"> 社群营销 · 智能客服 · 专属活动 </text>
      </view>
    </view>

    <!-- 快捷入口 -->
    <view class="quick-entry">
      <view class="entry-item" @tap="goScan">
        <view class="entry-icon scan-icon">
          <text class="icon-text"> 扫 </text>
        </view>
        <text class="entry-label"> 扫码 </text>
      </view>
      <view class="entry-item" @tap="goCampaign">
        <view class="entry-icon campaign-icon">
          <text class="icon-text"> 活 </text>
        </view>
        <text class="entry-label"> 活动 </text>
      </view>
      <view class="entry-item" @tap="goService">
        <view class="entry-icon service-icon">
          <text class="icon-text"> 服 </text>
        </view>
        <text class="entry-label"> 客服 </text>
      </view>
      <view class="entry-item" @tap="goProfile">
        <view class="entry-icon profile-icon">
          <text class="icon-text"> 我 </text>
        </view>
        <text class="entry-label"> 我的 </text>
      </view>
    </view>

    <!-- 推荐活动 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title"> 热门活动 </text>
      </view>
      <view v-if="campaigns.length > 0" class="campaign-list">
        <view
          v-for="item in campaigns"
          :key="item.id"
          class="campaign-card"
          @tap="goCampaignDetail(item.id)"
        >
          <view class="campaign-info">
            <text class="campaign-name">
              {{ item.name }}
            </text>
            <text class="campaign-desc">
              {{ item.description }}
            </text>
          </view>
          <view class="campaign-arrow">
            <text>›</text>
          </view>
        </view>
      </view>
      <view v-else class="empty-state">
        <text>暂无活动，敬请期待</text>
      </view>
    </view>

    <!-- 公告 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title"> 公告通知 </text>
      </view>
      <view class="notice-list">
        <view class="notice-item">
          <text class="notice-dot"> ● </text>
          <text class="notice-text"> 欢迎加入 SCRM 会员体系，享受专属权益 </text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { isLoggedIn } from '../../api/auth'
import { useUserStore } from '../../store/user'
import { useTenantStore } from '../../store/tenant'
import { useTenantTitle } from '../../composables/useTenantTitle'
import NavBar from '../../components/NavBar.vue'

interface CampaignItem {
  id: string
  name: string
  description: string
}

const campaigns = ref<CampaignItem[]>([])
const { fetchUser } = useUserStore()
const { state: tenantState } = useTenantStore()

// 微信原生栏标题统一为租户名
useTenantTitle()

const homeTitle = computed(() => tenantState.tenant?.name || '首页')

onMounted(async () => {
  // 已登录则拉取用户信息
  if (isLoggedIn()) {
    await fetchUser()
  }

  // 加载推荐活动（预留接口，暂用静态数据）
  campaigns.value = [
    { id: '1', name: '新人专享礼', description: '注册即送积分大礼包' },
    { id: '2', name: '邀请好友', description: '邀请好友注册，双方获得奖励' },
  ]
})

function goScan() {
  // #ifdef H5
  uni.showToast({ title: '请使用微信扫码', icon: 'none' })
  // #endif
  // #ifndef H5
  uni.scanCode({
    success: (res) => {
      const url = res.result || ''
      const match = url.match(/live-code[/?].*?(?:id|code)=(\w+)/)
      if (match) {
        uni.navigateTo({ url: `/pages/live-code/index?id=${match[1]}` })
      } else {
        uni.showToast({ title: '无法识别的二维码', icon: 'none' })
      }
    },
  })
  // #endif
}

function goCampaign() {
  uni.switchTab({ url: '/pages/campaign/index' })
}

function goService() {
  uni.switchTab({ url: '/pages/self-service/index' })
}

function goProfile() {
  uni.switchTab({ url: '/pages/profile/index' })
}

function goCampaignDetail(id: string) {
  uni.navigateTo({ url: `/pages/campaign/index?id=${id}` })
}
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  background: #f5f6fa;
  padding-bottom: 20rpx;
}
.banner {
  background: linear-gradient(135deg, #07c160, #06ad56);
  padding: 60rpx 40rpx;
}
.banner-content {
  display: flex;
  flex-direction: column;
}
.banner-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #fff;
}
.banner-desc {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 12rpx;
}
.quick-entry {
  display: flex;
  justify-content: space-around;
  background: #fff;
  margin: -30rpx 24rpx 24rpx;
  border-radius: 16rpx;
  padding: 32rpx 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}
.entry-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.entry-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12rpx;
}
.icon-text {
  font-size: 32rpx;
  color: #fff;
  font-weight: bold;
}
.scan-icon {
  background: #07c160;
}
.campaign-icon {
  background: #ff6b6b;
}
.service-icon {
  background: #576b95;
}
.profile-icon {
  background: #e6a23c;
}
.entry-label {
  font-size: 24rpx;
  color: #666;
}
.section {
  margin: 0 24rpx 24rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 28rpx;
}
.section-header {
  margin-bottom: 20rpx;
}
.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}
.campaign-list {
  display: flex;
  flex-direction: column;
}
.campaign-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 0;
  border-bottom: 1px solid #f5f5f5;
}
.campaign-card:last-child {
  border-bottom: none;
}
.campaign-info {
  flex: 1;
}
.campaign-name {
  font-size: 28rpx;
  color: #333;
  display: block;
}
.campaign-desc {
  font-size: 24rpx;
  color: #999;
  margin-top: 8rpx;
  display: block;
}
.campaign-arrow {
  font-size: 36rpx;
  color: #ccc;
}
.empty-state {
  text-align: center;
  padding: 40rpx;
  color: #999;
  font-size: 26rpx;
}
.notice-list {
  display: flex;
  flex-direction: column;
}
.notice-item {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
}
.notice-dot {
  color: #07c160;
  font-size: 16rpx;
  margin-right: 16rpx;
}
.notice-text {
  font-size: 26rpx;
  color: #666;
}
</style>
