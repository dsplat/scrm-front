<template>
  <view class="pwd-page">
    <NavBar title="修改密码" />
    <view class="page-body">
      <view class="form-section">
        <view class="form-item">
          <text class="label"> 当前密码 </text>
          <input
            v-model="currentPassword"
            type="password"
            placeholder="请输入当前密码"
            class="input"
            :disabled="saving"
          />
        </view>
        <view class="form-item">
          <text class="label"> 新密码 </text>
          <input
            v-model="newPassword"
            type="password"
            placeholder="至少8位"
            class="input"
            :disabled="saving"
          />
        </view>
        <view class="form-item">
          <text class="label"> 确认新密码 </text>
          <input
            v-model="confirmPassword"
            type="password"
            placeholder="再次输入新密码"
            class="input"
            :disabled="saving"
            @confirm="handleSubmit"
          />
        </view>
      </view>

      <view v-if="errorMsg" class="error-msg">
        <text>{{ errorMsg }}</text>
      </view>

      <view class="btn-section">
        <button class="btn-save" :disabled="saving || !canSubmit" @tap="handleSubmit">
          {{ saving ? '提交中...' : '确认修改' }}
        </button>
      </view>

      <view class="tips">
        <text class="tips-title"> 密码要求 </text>
        <text class="tips-item"> · 长度至少 8 位 </text>
        <text class="tips-item"> · 修改后需使用新密码重新登录 </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { changePassword } from '../../api/auth'
import { useTenantTitle } from '../../composables/useTenantTitle'
import NavBar from '../../components/NavBar.vue'

const currentPassword = ref('')
const newPassword = ref('')

// 微信原生栏标题统一为租户名
useTenantTitle()
const confirmPassword = ref('')
const saving = ref(false)
const errorMsg = ref('')

const canSubmit = computed(() => {
  return (
    currentPassword.value.length > 0 &&
    newPassword.value.length >= 8 &&
    newPassword.value === confirmPassword.value
  )
})

async function handleSubmit() {
  if (!canSubmit.value || saving.value) return

  if (newPassword.value !== confirmPassword.value) {
    errorMsg.value = '两次输入的新密码不一致'
    return
  }

  saving.value = true
  errorMsg.value = ''

  try {
    await changePassword({
      current_password: currentPassword.value,
      password: newPassword.value,
      password_confirmation: confirmPassword.value,
    })

    uni.showToast({ title: '密码修改成功', icon: 'success' })

    setTimeout(() => {
      uni.navigateBack()
    }, 1200)
  } catch (e: any) {
    errorMsg.value = e.message || '修改失败，请检查当前密码是否正确'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.pwd-page {
  min-height: 100vh;
  background: #f5f6fa;
}
.page-body {
  padding: 24rpx;
}
.form-section {
  background: #fff;
  border-radius: 16rpx;
  padding: 8rpx 32rpx;
}
.form-item {
  padding: 28rpx 0;
  border-bottom: 1px solid #f5f5f5;
}
.form-item:last-child {
  border-bottom: none;
}
.label {
  font-size: 26rpx;
  color: #999;
  display: block;
  margin-bottom: 16rpx;
}
.input {
  width: 100%;
  height: 80rpx;
  font-size: 30rpx;
  color: #333;
  border: 1px solid #e8e8e8;
  border-radius: 8rpx;
  padding: 0 20rpx;
}
.error-msg {
  color: #e64340;
  font-size: 26rpx;
  padding: 20rpx 8rpx;
}
.btn-section {
  margin-top: 48rpx;
}
.btn-save {
  width: 100%;
  height: 96rpx;
  line-height: 96rpx;
  background: #07c160;
  color: #fff;
  font-size: 32rpx;
  border-radius: 12rpx;
}
.btn-save[disabled] {
  background: #a0d8b8;
}
.tips {
  margin-top: 48rpx;
  padding: 0 8rpx;
  display: flex;
  flex-direction: column;
}
.tips-title {
  font-size: 26rpx;
  color: #999;
  margin-bottom: 12rpx;
}
.tips-item {
  font-size: 24rpx;
  color: #bbb;
  line-height: 1.8;
}
</style>
