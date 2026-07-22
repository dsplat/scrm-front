<template>
  <view class="register-page">
    <NavBar title="注册" />

    <view class="auth-body">
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

        <button
          class="btn-primary"
          hover-class="btn-primary--hover"
          :disabled="loading || !canSubmit"
          @tap="handleRegister"
        >
          {{ loading ? '注册中...' : '注 册' }}
        </button>

        <view class="auth-footer">
          <text class="link" @tap="goLogin"> 已有账号？去登录 </text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { emailRegister } from '../../api/auth'
import { useUserStore } from '../../store/user'
import { useTenantStore } from '../../store/tenant'
import { useTenantTitle } from '../../composables/useTenantTitle'
import NavBar from '../../components/NavBar.vue'

const name = ref('')
const email = ref('')
const password = ref('')
const passwordConfirmation = ref('')
const loading = ref(false)
const errorMsg = ref('')

const { setUser } = useUserStore()
const { state: tenantState, waitReady } = useTenantStore()

// 微信原生栏标题统一为租户名
useTenantTitle()

const canSubmit = computed(() => {
  return (
    name.value.trim() !== '' &&
    email.value.trim() !== '' &&
    password.value.length >= 8 &&
    password.value === passwordConfirmation.value
  )
})

// allow_register 守卫：租户未开放注册时拦截直链进入
onMounted(async () => {
  await waitReady()
  // bootstrap 失败（loaded=false）时不拦截，后端仍有最终校验
  if (tenantState.loaded && tenantState.loginConfig && !tenantState.loginConfig.allow_register) {
    uni.showToast({ title: '该租户未开放注册', icon: 'none' })
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/auth/login' })
    }, 800)
  }
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
.register-page {
  min-height: 100vh;
  background: #f5f6fa;
  display: flex;
  flex-direction: column;
}
.auth-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 48rpx;
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
  transition: border-color 0.2s;
}
.input:focus {
  border-color: var(--scrm-primary, #07c160);
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
  border-radius: 12rpx;
  margin-top: 16rpx;
}
.btn-primary--hover {
  opacity: 0.85;
  transform: scale(0.99);
}
.btn-primary[disabled] {
  opacity: 0.5;
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
