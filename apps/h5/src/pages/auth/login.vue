<template>
  <view class="auth-page">
    <view class="auth-header">
      <image class="logo" src="/static/logo.png" mode="aspectFit" />
      <text class="app-name"> SCRM 会员 </text>
    </view>

    <!-- 登录表单 -->
    <view v-if="!mfaRequired" class="auth-form">
      <view class="form-item">
        <input v-model="email" type="text" placeholder="邮箱" class="input" :disabled="loading" />
      </view>
      <view class="form-item">
        <input
          v-model="password"
          type="password"
          placeholder="密码"
          class="input"
          :disabled="loading"
          @confirm="handleLogin"
        />
      </view>

      <view v-if="errorMsg" class="error-msg">
        <text>{{ errorMsg }}</text>
      </view>

      <button class="btn-primary" :disabled="loading || !canSubmit" @tap="handleLogin">
        {{ loading ? '登录中...' : '登 录' }}
      </button>

      <view class="auth-footer">
        <text class="link" @tap="goRegister"> 没有账号？立即注册 </text>
      </view>
    </view>

    <!-- MFA 验证 -->
    <view v-else class="auth-form">
      <view class="mfa-hint">
        <text>请输入验证码完成二次验证</text>
      </view>
      <view class="form-item">
        <input
          v-model="mfaCode"
          type="number"
          placeholder="验证码"
          class="input"
          maxlength="6"
          :disabled="loading"
          @confirm="handleMfaVerify"
        />
      </view>

      <view v-if="errorMsg" class="error-msg">
        <text>{{ errorMsg }}</text>
      </view>

      <button class="btn-primary" :disabled="loading || mfaCode.length < 6" @tap="handleMfaVerify">
        {{ loading ? '验证中...' : '验 证' }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { emailLogin, mfaVerify } from '../../api/auth'
import type { LoginResult } from '../../api/auth'
import { useUserStore } from '../../store/user'

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

// MFA 状态
const mfaRequired = ref(false)
const mfaUserId = ref(0)
const mfaTypes = ref<string[]>([])
const mfaCode = ref('')

const { setUser } = useUserStore()

const canSubmit = computed(() => {
  return email.value.trim() !== '' && password.value.length >= 8
})

async function handleLogin() {
  if (!canSubmit.value || loading.value) return

  loading.value = true
  errorMsg.value = ''

  try {
    const result = await emailLogin(email.value.trim(), password.value)

    if ('mfa_required' in result) {
      // 需要 MFA 二次验证
      mfaRequired.value = true
      mfaUserId.value = result.user_id
      mfaTypes.value = result.available_types
      return
    }

    // 登录成功
    onLoginSuccess(result)
  } catch (e: any) {
    errorMsg.value = e.message || '登录失败，请检查邮箱和密码'
  } finally {
    loading.value = false
  }
}

async function handleMfaVerify() {
  if (mfaCode.value.length < 6 || loading.value) return

  loading.value = true
  errorMsg.value = ''

  try {
    const type = mfaTypes.value[0] || 'totp'
    const result = await mfaVerify(mfaUserId.value, type, mfaCode.value)
    onLoginSuccess(result)
  } catch (e: any) {
    errorMsg.value = e.message || '验证码错误'
  } finally {
    loading.value = false
  }
}

function onLoginSuccess(result: LoginResult) {
  setUser(result.user, result.tenant_id)
  uni.switchTab({ url: '/pages/index/index' })
}

function goRegister() {
  uni.navigateTo({ url: '/pages/auth/register' })
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  background: #f5f6fa;
  padding: 0 48rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.auth-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 80rpx;
}
.logo {
  width: 120rpx;
  height: 120rpx;
  margin-bottom: 20rpx;
}
.app-name {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}
.auth-form {
  width: 100%;
}
.form-item {
  margin-bottom: 28rpx;
}
.input {
  width: 100%;
  height: 96rpx;
  background: #fff;
  border-radius: 12rpx;
  padding: 0 28rpx;
  font-size: 30rpx;
  border: 1px solid #e8e8e8;
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
  background: #07c160;
  color: #fff;
  font-size: 32rpx;
  border-radius: 12rpx;
  margin-top: 16rpx;
}
.btn-primary[disabled] {
  background: #a0d8b8;
}
.auth-footer {
  text-align: center;
  margin-top: 40rpx;
}
.link {
  color: #576b95;
  font-size: 28rpx;
}
.mfa-hint {
  text-align: center;
  font-size: 28rpx;
  color: #666;
  margin-bottom: 32rpx;
}
</style>
