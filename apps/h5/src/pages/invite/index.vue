<template>
  <view class="invite-page">
    <NavBar title="邀请好友" />

    <!-- 未登录引导（专属邀请码为个人数据，不自动跳转） -->
    <view v-if="!loggedIn" class="login-prompt">
      <text class="login-tip-text"> 登录后查看我的专属邀请码 </text>
      <button class="go-login-btn" @tap="goLogin">去登录</button>
    </view>

    <ErrorState v-else-if="loadError" message="邀请码加载失败，请稍后重试" @retry="load" />

    <template v-else-if="loaded">
      <!-- 专属邀请码卡片 -->
      <view class="code-card">
        <text class="code-label"> 我的专属邀请码 </text>
        <text class="code-value">
          {{ myCode || '—' }}
        </text>
        <text class="code-sub">
          已邀请 {{ usedCount }} 人<template v-if="maxUses > 0"> / 上限 {{ maxUses }} 人 </template>
        </text>
        <view class="code-actions">
          <view class="action-btn" @tap="copyCode">
            <text>复制邀请码</text>
          </view>
          <view class="action-btn ghost" @tap="copyLink">
            <text>复制邀请链接</text>
          </view>
        </view>
      </view>

      <!-- 邀请记录 -->
      <view class="panel">
        <text class="panel-title"> 邀请记录 </text>
        <view v-if="usages.length === 0" class="empty-tip">
          <text>还没有邀请到好友，快把邀请码分享出去吧</text>
        </view>
        <view v-for="u in usages" :key="u.invite_code_usage_id" class="record-item">
          <view class="record-avatar">
            <text>{{ (u.invitee_name || '友').charAt(0) }}</text>
          </view>
          <view class="record-info">
            <text class="record-name">
              {{ u.invitee_name || '好友' }}
            </text>
            <text class="record-time"> {{ formatTime(u.created_at) }} 通过邀请码加入 </text>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getMyInviteCode, getMyInviteUsages } from '../../api/invite'
import type { InviteUsage } from '../../api/invite'
import { isLoggedIn } from '../../api/auth'
import { useTenantTitle } from '../../composables/useTenantTitle'
import NavBar from '../../components/NavBar.vue'
import ErrorState from '../../components/ErrorState.vue'

const loggedIn = ref(isLoggedIn())
const loaded = ref(false)
const loadError = ref(false)
const myCode = ref('')
const usedCount = ref(0)
const maxUses = ref(0)
const usages = ref<InviteUsage[]>([])

useTenantTitle()

onMounted(() => {
  if (loggedIn.value) {
    load()
  } else {
    loaded.value = true
  }
})

async function load() {
  loadError.value = false
  try {
    const [code, page] = await Promise.all([getMyInviteCode(), getMyInviteUsages(1)])
    myCode.value = code.code
    usedCount.value = code.used_count
    maxUses.value = code.max_uses
    usages.value = page.data || []
    loaded.value = true
  } catch (e) {
    loadError.value = true
    loaded.value = true
  }
}

/** 邀请链接：H5 入口带 invite_code，落地注册页自动回填（见 utils/inviteCode.ts） */
function buildInviteLink(): string {
  // #ifdef H5
  return `${window.location.origin}${window.location.pathname}?invite_code=${myCode.value}#/pages/auth/register`
  // #endif
  // 非 H5 端返回码本身，由调用方决定分享形态
  return myCode.value
}

function copyCode() {
  if (!myCode.value) return
  uni.setClipboardData({
    data: myCode.value,
    success: () => uni.showToast({ title: '邀请码已复制', icon: 'success' }),
  })
}

function copyLink() {
  uni.setClipboardData({
    data: buildInviteLink(),
    success: () => uni.showToast({ title: '邀请链接已复制', icon: 'success' }),
  })
}

function formatTime(iso: string): string {
  if (!iso) return ''
  return iso.replace('T', ' ').slice(0, 16)
}

function goLogin() {
  uni.navigateTo({ url: '/pages/auth/login' })
}
</script>

<style scoped>
.invite-page {
  min-height: 100vh;
  background: #f5f6fa;
  padding-bottom: 40rpx;
}
.login-prompt {
  padding: 120rpx 48rpx;
  text-align: center;
}
.login-tip-text {
  display: block;
  color: #999;
  font-size: 28rpx;
  margin-bottom: 32rpx;
}
.go-login-btn {
  width: 320rpx;
  height: 88rpx;
  line-height: 88rpx;
  margin: 0 auto;
  background: var(--scrm-primary, #07c160);
  color: #fff;
  font-size: 30rpx;
  border-radius: 44rpx;
}
.code-card {
  margin: 24rpx;
  padding: 48rpx 32rpx;
  background: #fff;
  border-radius: 16rpx;
  text-align: center;
}
.code-label {
  display: block;
  color: #999;
  font-size: 26rpx;
}
.code-value {
  display: block;
  font-size: 64rpx;
  font-weight: bold;
  letter-spacing: 8rpx;
  color: #333;
  margin: 20rpx 0;
}
.code-sub {
  display: block;
  color: #999;
  font-size: 26rpx;
}
.code-actions {
  display: flex;
  justify-content: center;
  gap: 24rpx;
  margin-top: 40rpx;
}
.action-btn {
  flex: 1;
  height: 84rpx;
  line-height: 84rpx;
  border-radius: 42rpx;
  background: var(--scrm-primary, #07c160);
  color: #fff;
  font-size: 28rpx;
}
.action-btn.ghost {
  background: #fff;
  color: var(--scrm-primary, #07c160);
  border: 1px solid var(--scrm-primary, #07c160);
}
.panel {
  margin: 24rpx;
  padding: 32rpx;
  background: #fff;
  border-radius: 16rpx;
}
.panel-title {
  display: block;
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 24rpx;
}
.empty-tip {
  text-align: center;
  color: #bbb;
  font-size: 26rpx;
  padding: 40rpx 0;
}
.record-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1px solid #f0f0f0;
}
.record-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: var(--scrm-primary-soft, rgba(7, 193, 96, 0.08));
  color: var(--scrm-primary, #07c160);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
}
.record-info {
  flex: 1;
  margin-left: 20rpx;
}
.record-name {
  display: block;
  font-size: 28rpx;
  color: #333;
}
.record-time {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-top: 6rpx;
}
</style>
