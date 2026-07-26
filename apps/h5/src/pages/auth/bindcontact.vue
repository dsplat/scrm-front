<template>
  <view class="bind-page">
    <view class="bind-header">
      <text class="bind-title"> 绑定联系方式 </text>
      <text class="bind-desc"> 为保障账号安全，请绑定手机号或邮箱 </text>
    </view>

    <view class="bind-card">
      <!-- Tab 切换 -->
      <view class="bind-tabs">
        <view
          class="tab-item"
          :class="{ 'tab-item--active': activeTab === 'phone' }"
          @tap="activeTab = 'phone'"
        >
          <text>手机号</text>
        </view>
        <view
          class="tab-item"
          :class="{ 'tab-item--active': activeTab === 'email' }"
          @tap="activeTab = 'email'"
        >
          <text>邮箱</text>
        </view>
      </view>

      <!-- 手机号绑定 -->
      <view v-if="activeTab === 'phone'" class="bind-form">
        <view class="form-item">
          <input
            v-model="phone"
            type="number"
            placeholder="请输入手机号"
            class="input"
            maxlength="11"
            :disabled="loading"
          />
        </view>
        <view class="form-item code-row">
          <input
            v-model="code"
            type="number"
            placeholder="验证码"
            class="input code-input"
            maxlength="6"
            :disabled="loading"
            @confirm="handleSubmit"
          />
          <button
            class="btn-send"
            :disabled="countdown > 0 || !/^1[3-9]\d{9}$/.test(phone)"
            @tap="handleSendCode"
          >
            {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
          </button>
        </view>
      </view>

      <!-- 邮箱绑定 -->
      <view v-else class="bind-form">
        <view class="form-item">
          <input
            v-model="email"
            type="text"
            placeholder="请输入邮箱"
            class="input"
            :disabled="loading"
          />
        </view>
        <view class="form-item code-row">
          <input
            v-model="code"
            type="number"
            placeholder="验证码"
            class="input code-input"
            maxlength="6"
            :disabled="loading"
            @confirm="handleSubmit"
          />
          <button
            class="btn-send"
            :disabled="countdown > 0 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)"
            @tap="handleSendEmailCode"
          >
            {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
          </button>
        </view>
      </view>

      <view v-if="errorMsg" class="error-msg">
        <text>{{ errorMsg }}</text>
      </view>

      <button
        class="btn-primary"
        hover-class="btn-primary--hover"
        :disabled="loading || !canSubmit"
        @tap="handleSubmit"
      >
        {{ loading ? '绑定中...' : '确认绑定' }}
      </button>

      <view class="bind-hint">
        <text class="hint-text"> 若该联系方式已注册，将自动合并账号 </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { request, setToken } from '../../utils/request'
import { sendSmsCode } from '../../api/auth'
import { useUserStore } from '../../store/user'

const { setUser } = useUserStore()

const activeTab = ref<'phone' | 'email'>('phone')
const phone = ref('')
const email = ref('')
const code = ref('')
const loading = ref(false)
const errorMsg = ref('')
const countdown = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

// pending token 从 URL 参数或 storage 获取
const pendingToken = ref('')
// #ifdef H5
const params = new URLSearchParams(window.location.hash.split('?')[1] || '')
pendingToken.value = params.get('token') || uni.getStorageSync('pending_token') || ''
// #endif

const canSubmit = computed(() => {
  if (activeTab.value === 'phone') {
    return /^1[3-9]\d{9}$/.test(phone.value) && code.value.length === 6
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value) && code.value.length === 6
})

function startCountdown() {
  countdown.value = 60
  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0 && timer) {
      clearInterval(timer)
      timer = null
    }
  }, 1000)
}

async function handleSendCode() {
  if (countdown.value > 0 || !/^1[3-9]\d{9}$/.test(phone.value)) return
  errorMsg.value = ''
  try {
    await sendSmsCode(phone.value)
    startCountdown()
  } catch (e: any) {
    errorMsg.value = e.message || '发送失败'
  }
}

async function handleSendEmailCode() {
  if (countdown.value > 0 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) return
  errorMsg.value = ''
  try {
    await request({
      url: '/auth/bind-contact/send-email-code',
      method: 'POST',
      data: { email: email.value },
      customToken: pendingToken.value,
    })
    startCountdown()
  } catch (e: any) {
    errorMsg.value = e.message || '发送失败'
  }
}

async function handleSubmit() {
  if (!canSubmit.value || loading.value) return

  loading.value = true
  errorMsg.value = ''

  try {
    const result = await request<{
      user: any
      tenant_id?: number
      auth_token: string
    }>({
      url: '/auth/bind-contact',
      method: 'POST',
      data: {
        type: activeTab.value,
        value: activeTab.value === 'phone' ? phone.value : email.value,
        code: code.value,
      },
      customToken: pendingToken.value,
    })

    // 绑定成功，存正式 token
    setToken(result.auth_token)
    setUser(result.user, result.tenant_id)
    uni.removeStorageSync('pending_token')

    // 跳转首页
    uni.switchTab({ url: '/pages/index/index' })
  } catch (e: any) {
    errorMsg.value = e.message || '绑定失败'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.bind-page {
  min-height: 100vh;
  background: #f5f6fa;
  padding: 48rpx 24rpx;
}
.bind-header {
  margin-bottom: 40rpx;
}
.bind-title {
  display: block;
  font-size: 44rpx;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 12rpx;
}
.bind-desc {
  display: block;
  font-size: 28rpx;
  color: #999;
}
.bind-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 40rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.06);
}
.bind-tabs {
  display: flex;
  margin-bottom: 32rpx;
  border-bottom: 1px solid #f0f0f0;
}
.tab-item {
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
  font-size: 28rpx;
  color: #999;
  position: relative;
}
.tab-item--active {
  color: var(--scrm-primary, #07c160);
  font-weight: 600;
}
.tab-item--active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 48rpx;
  height: 4rpx;
  border-radius: 4rpx;
  background: var(--scrm-primary, #07c160);
}
.bind-form {
  margin-bottom: 24rpx;
}
.form-item {
  margin-bottom: 24rpx;
}
.input {
  width: 100%;
  height: 96rpx;
  background: #f7f8fa;
  border-radius: 16rpx;
  padding: 0 28rpx;
  font-size: 30rpx;
  border: 2rpx solid transparent;
}
.input:focus {
  background: #fff;
  border-color: var(--scrm-primary, #07c160);
}
.code-row {
  display: flex;
  gap: 16rpx;
  align-items: center;
}
.code-input {
  flex: 1;
}
.btn-send {
  flex-shrink: 0;
  height: 96rpx;
  line-height: 96rpx;
  padding: 0 28rpx;
  font-size: 26rpx;
  color: var(--scrm-primary, #07c160);
  background: rgba(7, 193, 96, 0.08);
  border-radius: 16rpx;
  white-space: nowrap;
}
.btn-send[disabled] {
  color: #ccc;
  background: #f7f8fa;
}
.error-msg {
  color: #e64340;
  font-size: 26rpx;
  margin-bottom: 20rpx;
  padding: 0 8rpx;
}
.btn-primary {
  width: 100%;
  height: 96rpx;
  line-height: 96rpx;
  background: var(--scrm-primary, #07c160);
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 16rpx;
  margin-top: 16rpx;
}
.btn-primary--hover {
  opacity: 0.85;
}
.btn-primary[disabled] {
  opacity: 0.5;
}
.bind-hint {
  margin-top: 24rpx;
  text-align: center;
}
.hint-text {
  font-size: 24rpx;
  color: #bbb;
}
</style>
