<template>
  <view class="member-center">
    <NavBar title="会员中心" />

    <view v-if="!loggedIn" class="login-prompt">
      <text class="login-tip-text"> 登录后查看会员等级与成就 </text>
      <button class="go-login-btn" @tap="goLogin">去登录</button>
    </view>

    <template v-else>
      <ErrorState
        v-if="loadError && !profile"
        message="会员信息加载失败，请稍后重试"
        @retry="load"
      />

      <template v-else>
        <view class="profile-card">
          <view class="level-row">
            <view class="level-badge">
              <image
                v-if="profile?.level?.icon"
                class="level-icon"
                :src="profile.level.icon"
                mode="aspectFit"
              />
              <text v-else class="level-icon-text">
                {{ levelInitial }}
              </text>
            </view>
            <view class="level-info">
              <text class="level-name">
                {{ levelName }}
              </text>
              <text class="growth-value"> 成长值 {{ profile?.growth_value ?? 0 }} </text>
              <text class="validity-text">
                {{ validityText }}
              </text>
            </view>
          </view>
          <view class="benefit-row">
            <view class="benefit-item">
              <text class="benefit-value">
                {{ discountText }}
              </text>
              <text class="benefit-label"> 会员折扣 </text>
            </view>
            <view class="benefit-item">
              <text class="benefit-value">
                {{ multiplierText }}
              </text>
              <text class="benefit-label"> 积分倍率 </text>
            </view>
            <view class="benefit-item">
              <text class="benefit-value">
                {{ completedCount }}
              </text>
              <text class="benefit-label"> 已获成就 </text>
            </view>
          </view>
        </view>

        <view class="section-title">
          <text>我的成就</text>
          <text class="section-sub"> {{ completedCount }}/{{ achievements.length }} </text>
        </view>

        <view class="achievement-list">
          <view
            v-for="item in achievements"
            :key="item.achievement_id"
            class="achievement-card"
            :class="{ completed: item.status === 'completed' }"
          >
            <view class="achievement-icon">
              <image
                v-if="item.icon"
                class="achievement-icon-img"
                :src="item.icon"
                mode="aspectFit"
              />
              <text v-else class="achievement-icon-text">
                {{ item.name.slice(0, 1) }}
              </text>
            </view>
            <view class="achievement-body">
              <view class="achievement-head">
                <text class="achievement-name">
                  {{ item.name }}
                </text>
                <text v-if="item.status === 'completed'" class="achievement-done"> 已完成 </text>
              </view>
              <text v-if="item.description" class="achievement-desc">
                {{ item.description }}
              </text>
              <view class="progress-track">
                <view class="progress-bar" :style="{ width: progressPercent(item) + '%' }" />
              </view>
              <view class="achievement-foot">
                <text class="progress-text">
                  {{ item.progress_value }}/{{ item.target_value }}
                </text>
                <text class="reward-text">
                  {{ rewardText(item) }}
                </text>
              </view>
            </view>
          </view>
        </view>

        <view v-if="achievements.length === 0 && !loading" class="empty-tip">
          <text>还没有可解锁的成就，继续学习与消费即可点亮</text>
        </view>
        <view v-if="loading" class="loading-tip">
          <text>加载中...</text>
        </view>
      </template>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { isLoggedIn } from '../../api/auth'
import {
  getMyAchievements,
  getMyMembershipProfile,
  type MemberAchievement,
  type MemberProfile,
} from '../../api/member'
import { redirectToLogin } from '../../utils/request'
import { useTenantTitle } from '../../composables/useTenantTitle'
import NavBar from '../../components/NavBar.vue'
import ErrorState from '../../components/ErrorState.vue'

const profile = ref<MemberProfile | null>(null)
const achievements = ref<MemberAchievement[]>([])
const loading = ref(false)
const loadError = ref(false)
const loggedIn = computed(() => isLoggedIn())

useTenantTitle()

const completedCount = computed(
  () => achievements.value.filter((item) => item.status === 'completed').length,
)

const levelInitial = computed(() =>
  (profile.value?.level?.name || profile.value?.expired_level?.name || '会').slice(0, 1),
)

const levelName = computed(() => {
  if (profile.value?.level?.name) return profile.value.level.name
  if (profile.value?.level_status === 'expired' && profile.value.expired_level?.name) {
    return `${profile.value.expired_level.name}（已过期）`
  }
  return '普通会员'
})

const validityText = computed(() => {
  if (!profile.value) return ''
  if (profile.value.level_status === 'expired') return '有效期已结束'
  if (profile.value.level_status === 'none') return '未开通会员'
  if (!profile.value.level_expires_at) return '永久有效'
  return `有效期至 ${formatDate(profile.value.level_expires_at)}`
})

function formatDate(value?: string | null): string {
  if (!value) return ''
  const date = new Date(String(value).replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

const discountText = computed(() => {
  const bp = profile.value?.benefits?.discount_basis_points ?? 10000
  if (bp >= 10000) return '无折扣'
  return `${(bp / 1000).toFixed(1)} 折`
})

const multiplierText = computed(() => {
  const bp = profile.value?.benefits?.points_multiplier_basis_points ?? 10000
  return `${Math.max(1, bp / 10000)} 倍`
})

function progressPercent(item: MemberAchievement): number {
  if (item.status === 'completed') return 100
  if (!item.target_value || item.target_value <= 0) return 0
  return Math.max(0, Math.min(99, Math.round((item.progress_value / item.target_value) * 100)))
}

function rewardText(item: MemberAchievement): string {
  if (item.reward_type === 'points') return `${item.points_reward} 积分`
  if (item.reward_type === 'certificate') return '荣誉证书'
  if (item.reward_type === 'points_and_certificate') return `${item.points_reward} 积分 + 证书`
  return '荣誉徽章'
}

async function load() {
  if (!isLoggedIn()) return
  loading.value = true
  loadError.value = false
  try {
    const [profileData, achievementData] = await Promise.all([
      getMyMembershipProfile(),
      getMyAchievements(),
    ])
    profile.value = profileData
    achievements.value = Array.isArray(achievementData) ? achievementData : []
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

function goLogin() {
  redirectToLogin()
}

onShow(load)

onPullDownRefresh(async () => {
  await load()
  uni.stopPullDownRefresh()
})
</script>

<style scoped>
.member-center {
  min-height: 100vh;
  background: #f5f6fa;
  padding-bottom: 40rpx;
}
.login-prompt {
  margin: 24rpx;
  padding: 80rpx 36rpx;
  background: #fff;
  border-radius: 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32rpx;
}
.login-tip-text {
  font-size: 28rpx;
  color: #999;
}
.go-login-btn {
  width: 320rpx;
  height: 80rpx;
  line-height: 80rpx;
  background: var(--scrm-primary);
  color: #fff;
  border-radius: 40rpx;
  font-size: 28rpx;
}
.profile-card {
  margin: 24rpx;
  padding: 32rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #3b2b16 0%, #6b4d23 55%, #c9a15a 100%);
  color: #fff;
}
.level-row {
  display: flex;
  align-items: center;
}
.level-badge {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.level-icon {
  width: 64rpx;
  height: 64rpx;
}
.level-icon-text {
  font-size: 40rpx;
  font-weight: 600;
  color: #ffe6ae;
}
.level-info {
  margin-left: 24rpx;
  display: flex;
  flex-direction: column;
}
.level-name {
  font-size: 36rpx;
  font-weight: 600;
}
.growth-value {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #f4dfb6;
}
.validity-text {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #e8d6b2;
}
.benefit-row {
  display: flex;
  margin-top: 36rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid rgba(255, 255, 255, 0.16);
}
.benefit-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.benefit-value {
  font-size: 30rpx;
  font-weight: 600;
}
.benefit-label {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #e8d6b2;
}
.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12rpx 32rpx 20rpx;
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}
.section-sub {
  font-size: 24rpx;
  font-weight: 400;
  color: #999;
}
.achievement-list {
  padding: 0 24rpx;
}
.achievement-card {
  display: flex;
  padding: 24rpx;
  margin-bottom: 20rpx;
  border-radius: 20rpx;
  background: #fff;
  border: 1rpx solid #eef0f4;
}
.achievement-card.completed {
  border-color: #f0e0b2;
  background: linear-gradient(135deg, #fffdf7 0%, #fff 70%);
}
.achievement-icon {
  width: 86rpx;
  height: 86rpx;
  border-radius: 20rpx;
  background: #f6f7fb;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.completed .achievement-icon {
  background: #fff4d6;
}
.achievement-icon-img {
  width: 60rpx;
  height: 60rpx;
}
.achievement-icon-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #b8860b;
}
.achievement-body {
  flex: 1;
  margin-left: 20rpx;
}
.achievement-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.achievement-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}
.achievement-done {
  font-size: 22rpx;
  color: #b8860b;
  background: #fff4d6;
  padding: 4rpx 14rpx;
  border-radius: 18rpx;
}
.achievement-desc {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #999;
}
.progress-track {
  height: 10rpx;
  margin-top: 18rpx;
  border-radius: 8rpx;
  background: #f0f1f5;
  overflow: hidden;
}
.progress-bar {
  height: 100%;
  border-radius: 8rpx;
  background: linear-gradient(90deg, #d9b56a, #b8860b);
}
.achievement-foot {
  display: flex;
  justify-content: space-between;
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #999;
}
.reward-text {
  color: #b8860b;
}
.empty-tip {
  text-align: center;
  padding: 100rpx 40rpx;
  color: #999;
  font-size: 28rpx;
}
.loading-tip {
  text-align: center;
  padding: 40rpx 0;
  color: #999;
  font-size: 26rpx;
}
</style>
