<template>
  <view class="edit-page">
    <NavBar title="编辑资料" />
    <view class="page-body">
      <view class="form-section">
        <view class="form-item">
          <text class="label"> 昵称 </text>
          <input
            v-model="name"
            type="text"
            placeholder="请输入昵称"
            class="input"
            :disabled="saving"
          />
        </view>
        <view class="form-item">
          <text class="label"> 邮箱 </text>
          <input :value="email" type="text" class="input disabled" disabled />
          <text class="hint"> 邮箱不可修改 </text>
        </view>
      </view>

      <view v-if="errorMsg" class="error-msg">
        <text>{{ errorMsg }}</text>
      </view>

      <view class="btn-section">
        <button class="btn-save" :disabled="saving || !name.trim()" @tap="handleSave">
          {{ saving ? '保存中...' : '保存' }}
        </button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { updateProfile } from '../../api/auth'
import { useUserStore } from '../../store/user'
import { useTenantTitle } from '../../composables/useTenantTitle'
import NavBar from '../../components/NavBar.vue'

const name = ref('')

// 微信原生栏标题统一为租户名
useTenantTitle()
const email = ref('')
const saving = ref(false)
const errorMsg = ref('')

const { state, fetchUser, setUser } = useUserStore()

onMounted(async () => {
  // 确保有用户数据
  if (!state.user) {
    await fetchUser()
  }
  if (state.user) {
    name.value = state.user.name || ''
    email.value = state.user.email || ''
  }
})

async function handleSave() {
  if (!name.value.trim() || saving.value) return

  saving.value = true
  errorMsg.value = ''

  try {
    const updatedUser = await updateProfile({ name: name.value.trim() })
    setUser(updatedUser, state.tenantId ?? undefined)
    uni.showToast({ title: '保存成功', icon: 'success' })

    setTimeout(() => {
      uni.navigateBack()
    }, 1000)
  } catch (e: any) {
    errorMsg.value = e.message || '保存失败，请稍后再试'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.edit-page {
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
.input.disabled {
  background: #f9f9f9;
  color: #999;
}
.hint {
  font-size: 22rpx;
  color: #ccc;
  margin-top: 8rpx;
  display: block;
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
</style>
