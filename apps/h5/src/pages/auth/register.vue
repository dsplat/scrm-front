<template>
  <view class="auth-page">
    <view class="auth-header">
      <text class="title"> 创建账号 </text>
      <text class="subtitle"> 注册成为会员，享受专属服务 </text>
    </view>

    <view class="auth-form">
      <view class="form-item">
        <input v-model="name" type="text" placeholder="昵称" class="input" :disabled="loading" />
      </view>
      <view class="form-item">
        <input v-model="email" type="text" placeholder="邮箱" class="input" :disabled="loading" />
      </view>
      <view class="form-item">
        <input
          v-model="password"
          type="password"
          placeholder="密码（至少8位）"
          class="input"
          :disabled="loading"
        />
      </view>
      <view class="form-item">
        <input
          v-model="passwordConfirmation"
          type="password"
          placeholder="确认密码"
          class="input"
          :disabled="loading"
          @confirm="handleRegister"
        />
      </view>

      <view v-if="errorMsg" class="error-msg">
        <text>{{ errorMsg }}</text>
      </view>

      <button class="btn-primary" :disabled="loading || !canSubmit" @tap="handleRegister">
        {{ loading ? '注册中...' : '注 册' }}
      </button>

      <view class="auth-footer">
        <text class="link" @tap="goLogin"> 已有账号？去登录 </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { emailRegister } from '../../api/auth'
import { useUserStore } from '../../store/user'

const name = ref('')
const email = ref('')
const password = ref('')
const passwordConfirmation = ref('')
const loading = ref(false)
const errorMsg = ref('')

const { setUser } = useUserStore()

const canSubmit = computed(() => {
  return (
    name.value.trim() !== '' &&
    email.value.trim() !== '' &&
    password.value.length >= 8 &&
    password.value === passwordConfirmation.value
  )
})

async function handleRegister() {
  if (!canSubmit.value || loading.value) return

  if (password.value !== passwordConfirmation.value) {
    errorMsg.value = '两次密码输入不一致'
    return
  }

  loading.value = true
  errorMsg.value = ''

  try {
    const result = await emailRegister({
      name: name.value.trim(),
      email: email.value.trim(),
      password: password.value,
      password_confirmation: passwordConfirmation.value,
    })

    setUser(result.user, result.tenant_id)
    uni.showToast({ title: '注册成功', icon: 'success' })

    setTimeout(() => {
      uni.switchTab({ url: '/pages/index/index' })
    }, 1000)
  } catch (e: any) {
    errorMsg.value = e.message || '注册失败，请稍后再试'
  } finally {
    loading.value = false
  }
}

function goLogin() {
  uni.navigateBack()
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
  margin-bottom: 60rpx;
}
.title {
  font-size: 44rpx;
  font-weight: bold;
  color: #333;
  display: block;
}
.subtitle {
  font-size: 28rpx;
  color: #999;
  margin-top: 12rpx;
  display: block;
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
</style>
