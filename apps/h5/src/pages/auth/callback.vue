<template>
  <view class="callback-page">
    <view class="callback-spinner" />
    <text class="callback-text">
      {{ msg }}
    </text>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { setToken } from '../../utils/request'
import { getMe } from '../../api/auth'
import { useUserStore } from '../../store/user'

const { setUser } = useUserStore()
const msg = ref('正在登录...')

onMounted(async () => {
  // #ifdef H5
  const params = new URLSearchParams(window.location.hash.split('?')[1] || '')
  const token = params.get('token')
  const error = params.get('error')
  const pendingToken = params.get('pending_token')

  if (error) {
    msg.value = error
    setTimeout(() => uni.reLaunch({ url: '/pages/auth/login' }), 2000)
    return
  }

  // pending token → 跳转绑定页
  if (pendingToken) {
    uni.setStorageSync('pending_token', pendingToken)
    uni.redirectTo({ url: `/pages/auth/bindcontact?token=${pendingToken}` })
    return
  }

  if (!token) {
    msg.value = '登录参数缺失'
    setTimeout(() => uni.reLaunch({ url: '/pages/auth/login' }), 2000)
    return
  }

  // 存 token
  setToken(token)

  try {
    const { user, tenant_id } = await getMe()
    setUser(user, tenant_id)
    uni.switchTab({ url: '/pages/index/index' })
  } catch (e) {
    msg.value = '登录失败，请重试'
    setTimeout(() => uni.reLaunch({ url: '/pages/auth/login' }), 2000)
  }
  // #endif
})
</script>

<style scoped>
.callback-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f5f6fa;
}
.callback-spinner {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  border: 6rpx solid #eee;
  border-top-color: var(--scrm-primary, #07c160);
  animation: spin 0.8s linear infinite;
  margin-bottom: 24rpx;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.callback-text {
  font-size: 28rpx;
  color: #666;
}
</style>
