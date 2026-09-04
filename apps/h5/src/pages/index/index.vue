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
      <view class="entry-item" @tap="goShop">
        <view class="entry-icon shop-icon">
          <text class="icon-text"> 商 </text>
        </view>
        <text class="entry-label"> 商城 </text>
      </view>
      <view class="entry-item" @tap="goCourse">
        <view class="entry-icon course-icon">
          <text class="icon-text"> 课 </text>
        </view>
        <text class="entry-label"> 课程 </text>
      </view>
      <!-- 线下班培训入口：我的班级（50_01 学员端首页对标；未登录进页后引导登录） -->
      <view class="entry-item" @tap="goTraining">
        <view class="entry-icon class-icon">
          <text class="icon-text"> 班 </text>
        </view>
        <text class="entry-label"> 班级 </text>
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
import { getActivityList } from '../../api/scrm'
import { useUserStore } from '../../store/user'
import { useTenantStore } from '../../store/tenant'
import { useTenantTitle } from '../../composables/useTenantTitle'
import { useSeoMeta } from '../../composables/useSeoMeta'
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

// 页面级 SEO：租户名 + 品牌词，canonical 自指首页路径（不带 query）
useSeoMeta(() => ({
  title: tenantState.tenant?.name
    ? `${tenantState.tenant.name} - 课程・商城・活动`
    : '内行商城 - 课程・商城・活动一站式服务平台',
  description: tenantState.tenant?.name
    ? `${tenantState.tenant.name}提供在线课程、商品购买与活动报名服务，一站式私域运营与消费体验。`
    : '内行商城提供在线课程、商品购买与活动报名服务，支持多租户品牌定制。',
  canonicalPath: '/h5/pages/index/index',
}))

const homeTitle = computed(() => tenantState.tenant?.name || '首页')

onMounted(async () => {
  // 已登录则拉取用户信息 + 推荐活动（活动列表接口需登录，匿名时展示空态）
  if (isLoggedIn()) {
    await fetchUser()
    try {
      const res: any = await getActivityList({ per_page: 3 })
      campaigns.value = (res?.list || [])
        .filter((a: any) => !['draft', 'planning', 'cancelled'].includes(a.status))
        .slice(0, 3)
        .map((a: any) => ({
          id: a.activity_id,
          name: a.name,
          description: String(a.description || '')
            .replace(/<[^>]+>/g, '')
            .slice(0, 40),
        }))
    } catch {
      campaigns.value = []
    }
  }
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

function goShop() {
  uni.navigateTo({ url: '/pages/shop/index' })
}

function goCourse() {
  uni.navigateTo({ url: '/pages/course/index' })
}

function goTraining() {
  uni.navigateTo({ url: '/pages/training/index' })
}

function goService() {
  uni.switchTab({ url: '/pages/self-service/index' })
}

function goProfile() {
  uni.switchTab({ url: '/pages/profile/index' })
}

function goCampaignDetail(id: string) {
  // 活动域已统一：详情页为 event 目录（API 已迁 Activity 模块）
  uni.navigateTo({ url: `/pages/event/detail?eventId=${id}` })
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
  flex-wrap: wrap;
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
  width: 25%;
  margin-bottom: 20rpx;
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
.shop-icon {
  background: #e64340;
}
.course-icon {
  background: #6366f1;
}
.class-icon {
  background: #14b8a6;
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
