<template>
  <view class="home-page">
    <NavBar :title="homeTitle" :show-back="false" />
    <!-- Banner -->
    <view class="banner">
      <view class="banner-content">
        <text class="banner-title">
          {{ bannerTitle }}
        </text>
        <text class="banner-desc"> 课程 · 商城 · 活动 · 智能客服 一站式服务 </text>
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

    <!-- 系统公告（真实数据：broadcast_events 的 system_announcement；无公告时整段隐藏，不展示假内容） -->
    <view v-if="announcements.length > 0" class="notice-bar">
      <text class="notice-icon"> 🔊 </text>
      <swiper
        v-if="announcements.length > 1"
        class="notice-swiper"
        vertical
        :autoplay="true"
        :interval="4000"
        :duration="500"
        circular
      >
        <swiper-item v-for="n in announcements" :key="n.id" class="notice-item">
          <text class="notice-text">
            {{ noticeText(n) }}
          </text>
        </swiper-item>
      </swiper>
      <text v-else class="notice-text">
        {{ noticeText(announcements[0]) }}
      </text>
    </view>

    <!-- 推荐课程（真实数据：Course 框架模块 published 列表；无课程时整段隐藏，不展示占位假内容） -->
    <view v-if="courses.length > 0" class="section">
      <view class="section-header">
        <text class="section-title"> 推荐课程 </text>
        <text class="section-more" @tap="goCourse"> 全部 › </text>
      </view>
      <scroll-view class="course-scroll" scroll-x :show-scrollbar="false">
        <view
          v-for="c in courses"
          :key="c.course_id"
          class="course-card"
          @tap="navCourseDetail(c.course_id)"
        >
          <image v-if="c.cover" class="course-cover" :src="c.cover" mode="aspectFill" />
          <view v-else class="course-cover course-cover-ph">
            <text class="course-ph-text"> 课程 </text>
          </view>
          <text class="course-title">
            {{ c.title }}
          </text>
          <text class="course-price">
            {{ coursePrice(c) }}
          </text>
        </view>
      </scroll-view>
    </view>

    <!-- 热门活动（统一 Activity 模块，卡片富化：封面 + 类型/状态标签 + 时间 + 价格） -->
    <view class="section">
      <view class="section-header">
        <text class="section-title"> 热门活动 </text>
        <text class="section-more" @tap="goCampaign"> 全部 › </text>
      </view>
      <view v-if="campaigns.length > 0" class="campaign-list">
        <view
          v-for="item in campaigns"
          :key="item.id"
          class="campaign-card"
          @tap="goCampaignDetail(item.id)"
        >
          <image v-if="item.cover" class="campaign-cover" :src="item.cover" mode="aspectFill" />
          <view v-else class="campaign-cover campaign-cover-ph">
            <text class="cover-ph-text"> 活动 </text>
          </view>
          <view class="campaign-info">
            <text class="campaign-name">
              {{ item.name }}
            </text>
            <view class="campaign-tags">
              <text class="campaign-type">
                {{ typeText(item.type) }}
              </text>
              <text class="campaign-status" :class="`st-${item.status}`">
                {{ statusText(item.status) }}
              </text>
            </view>
            <view class="campaign-meta">
              <text v-if="item.starts_at" class="campaign-time">
                {{ formatTime(item.starts_at) }}
              </text>
              <text v-if="priceText(item)" class="campaign-price">
                {{ priceText(item) }}
              </text>
            </view>
          </view>
        </view>
      </view>
      <view v-else class="empty-state">
        <text>暂无活动，敬请期待</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { isLoggedIn } from '../../api/auth'
import { getActivityList } from '../../api/scrm'
import { getAnnouncements, type AnnouncementVO } from '../../api/marketing'
import { getPublishedCourses, navCourseDetail, fenToYuan, type CourseVO } from '@scrm/h5-commerce'
import { useUserStore } from '../../store/user'
import { useTenantStore } from '../../store/tenant'
import { useTenantTitle } from '../../composables/useTenantTitle'
import { useSeoMeta } from '../../composables/useSeoMeta'
import NavBar from '../../components/NavBar.vue'

interface CampaignItem {
  id: string
  name: string
  cover?: string
  type: string
  status: string
  starts_at?: string
  min_price?: number | null
  is_free?: boolean
}

const campaigns = ref<CampaignItem[]>([])
const courses = ref<CourseVO[]>([])
const announcements = ref<AnnouncementVO[]>([])
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
const bannerTitle = computed(() =>
  tenantState.tenant?.name ? `欢迎来到 ${tenantState.tenant.name}` : '欢迎使用社群会员服务',
)

onShow(() => {
  load()
})

onPullDownRefresh(async () => {
  await load()
  uni.stopPullDownRefresh()
})

async function load() {
  // 已登录则拉取用户信息；活动/课程接口均为 optional 认证，未登录也正常展示
  if (isLoggedIn()) {
    await fetchUser()
  }
  // 活动 + 课程 + 公告并行拉取，任一失败不影响其余
  const [actRes, courseRes, noticeRes] = await Promise.allSettled([
    getActivityList({ per_page: 6 }),
    getPublishedCourses(),
    getAnnouncements(5),
  ])

  if (actRes.status === 'fulfilled') {
    const res: any = actRes.value
    // C 端不展示草稿/策划中/已取消的活动（服务端已过滤，此处兼容旧数据）
    campaigns.value = (res?.list || [])
      .filter((a: any) => !['draft', 'planning', 'cancelled'].includes(a.status))
      .slice(0, 6)
      .map((a: any) => ({
        id: a.activity_id,
        name: a.name,
        cover: a.cover_url || '',
        type: a.type,
        status: a.status,
        starts_at: a.starts_at,
        min_price: a.min_price,
        is_free: a.is_free,
      }))
  } else {
    campaigns.value = []
  }

  if (courseRes.status === 'fulfilled') {
    courses.value = ((courseRes.value as any)?.data || []).slice(0, 8)
  } else {
    courses.value = []
  }

  if (noticeRes.status === 'fulfilled') {
    const n: any = noticeRes.value
    announcements.value = (Array.isArray(n) ? n : n?.data || []).slice(0, 5)
  } else {
    announcements.value = []
  }
}

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

const TYPE_TEXT: Record<string, string> = {
  marketing: '营销活动',
  offline_event: '线下活动',
  hybrid: '混合活动',
  course: '课程',
  training_camp: '训练营',
}

const STATUS_TEXT: Record<string, string> = {
  scheduled: '即将开始',
  running: '进行中',
  completed: '已结束',
}

function typeText(type: string) {
  return TYPE_TEXT[type] || '活动'
}

function statusText(status: string) {
  return STATUS_TEXT[status] || status
}

/** 活动价格文案：免费/￥金额起（后端 list 返回 min_price/is_free） */
function priceText(item: CampaignItem) {
  if (item.is_free) return '免费'
  const raw = item.min_price
  if (raw === null || raw === undefined) return ''
  const num = Number(raw)
  if (isNaN(num) || num <= 0) return '免费'
  return `￥${fenToYuan(num)} 起`
}

/** 课程价格文案：现金/积分/混合（sale_mode 驱动） */
function coursePrice(c: CourseVO) {
  if (c.sale_mode === 'points') return `${c.points_price || 0} 积分`
  const num = Number(c.price)
  if (c.sale_mode === 'mixed') return `￥${fenToYuan(num || 0)} + 积分`
  if (!num || num <= 0) return '免费'
  return `￥${fenToYuan(num)}`
}

function formatTime(dateStr: string) {
  if (!dateStr) return ''
  return new Date(dateStr.replace(' ', 'T')).toLocaleString('zh-CN', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** 公告文案：有标题则「标题：正文」，否则直接正文 */
function noticeText(n: AnnouncementVO) {
  const msg = n.message || ''
  return n.title ? `${n.title}：${msg}` : msg
}
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  background: #f5f6fa;
  padding-bottom: 20rpx;
}
.banner {
  background: linear-gradient(135deg, var(--scrm-primary), var(--scrm-primary-deep));
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
  background: var(--scrm-primary);
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}
.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}
.section-more {
  font-size: 24rpx;
  color: #999;
}
.course-scroll {
  white-space: nowrap;
}
.course-card {
  display: inline-block;
  width: 240rpx;
  margin-right: 20rpx;
  vertical-align: top;
}
.course-cover {
  width: 240rpx;
  height: 150rpx;
  border-radius: 12rpx;
  background: #f0f0f0;
}
.course-cover-ph {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e0e7ff, #eef2fb);
}
.course-ph-text {
  font-size: 26rpx;
  color: #6366f1;
}
.course-title {
  display: block;
  font-size: 26rpx;
  color: #333;
  margin-top: 12rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.course-price {
  display: block;
  font-size: 26rpx;
  color: #fa5151;
  font-weight: 600;
  margin-top: 8rpx;
}
.campaign-list {
  display: flex;
  flex-direction: column;
}
.campaign-card {
  display: flex;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1px solid #f5f5f5;
}
.campaign-card:last-child {
  border-bottom: none;
}
.campaign-cover {
  width: 160rpx;
  height: 120rpx;
  border-radius: 12rpx;
  background: #f0f0f0;
  flex-shrink: 0;
}
.campaign-cover-ph {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #ffe0e0, #fff0f0);
}
.cover-ph-text {
  font-size: 24rpx;
  color: #ff6b6b;
}
.campaign-info {
  flex: 1;
  margin-left: 20rpx;
  overflow: hidden;
}
.campaign-name {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.campaign-tags {
  display: flex;
  align-items: center;
  margin-top: 10rpx;
}
.campaign-type {
  font-size: 20rpx;
  color: #576b95;
  background: #eef2fb;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
}
.campaign-status {
  font-size: 20rpx;
  color: #999;
  background: #f0f0f0;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  margin-left: 12rpx;
}
.st-running {
  color: var(--scrm-primary);
  background: #e6f7ee;
}
.st-scheduled {
  color: #e6a23c;
  background: #fff7e6;
}
.campaign-meta {
  display: flex;
  align-items: center;
  margin-top: 12rpx;
}
.campaign-time {
  font-size: 22rpx;
  color: #999;
}
.campaign-price {
  font-size: 26rpx;
  color: #fa5151;
  font-weight: 600;
  margin-left: auto;
}
.empty-state {
  text-align: center;
  padding: 40rpx;
  color: #999;
  font-size: 26rpx;
}
.notice-bar {
  display: flex;
  align-items: center;
  margin: 0 24rpx 24rpx;
  background: #fff8e6;
  border-radius: 12rpx;
  padding: 18rpx 24rpx;
}
.notice-icon {
  font-size: 28rpx;
  margin-right: 14rpx;
  flex-shrink: 0;
}
.notice-swiper {
  flex: 1;
  height: 40rpx;
}
.notice-item {
  display: flex;
  align-items: center;
}
.notice-text {
  flex: 1;
  font-size: 26rpx;
  color: #a06a00;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
