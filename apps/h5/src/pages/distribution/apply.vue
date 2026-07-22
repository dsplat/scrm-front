<template>
  <view class="apply-page">
    <NavBar title="申请分销员" />

    <view class="hero">
      <text class="hero-title"> 创业变现 · 分享赚钱 </text>
      <text class="hero-desc"> 成为分销员，邀请好友下单，最高享两级佣金分成 </text>
    </view>

    <view class="form-card">
      <view class="form-item">
        <text class="form-label"> 姓名 </text>
        <input v-model="form.name" class="form-input" placeholder="请输入您的姓名" />
      </view>
      <view class="form-item">
        <text class="form-label"> 手机号 </text>
        <input v-model="form.phone" class="form-input" type="number" placeholder="请输入手机号" />
      </view>
      <view class="form-item">
        <text class="form-label"> 邀请码（选填） </text>
        <input v-model="form.parentInviteCode" class="form-input" placeholder="有邀请码请填写" />
      </view>

      <view class="submit-btn" @tap="submit">
        <text>{{ submitting ? '提交中...' : '提交申请' }}</text>
      </view>
    </view>

    <view class="rules-card">
      <text class="rules-title"> 分销规则 </text>
      <text class="rules-line"> · 分享专属邀请码或链接给好友 </text>
      <text class="rules-line"> · 好友注册并下单后，您可获得佣金 </text>
      <text class="rules-line"> · 佣金结算期满后可申请提现 </text>
      <text class="rules-line"> · 合规两级分佣，杜绝多级传销 </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { applyDistributor } from '../../api/distribution'
import { useTenantTitle } from '../../composables/useTenantTitle'
import NavBar from '../../components/NavBar.vue'

useTenantTitle()

const form = ref({ name: '', phone: '', parentInviteCode: '' })
const submitting = ref(false)

// 从邀请链接读取邀请码
onLoad((options) => {
  if (options && options.invite) {
    form.value.parentInviteCode = decodeURIComponent(options.invite)
  }
})

async function submit() {
  if (submitting.value) return
  submitting.value = true
  try {
    await applyDistributor({
      name: form.value.name || undefined,
      phone: form.value.phone || undefined,
      parentInviteCode: form.value.parentInviteCode || undefined,
    })
    uni.showToast({ title: '申请已提交', icon: 'success' })
    setTimeout(() => {
      uni.redirectTo({ url: '/pages/distribution/index' })
    }, 1200)
  } catch (e: any) {
    uni.showToast({ title: e.message || '申请失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.apply-page {
  min-height: 100vh;
  background: #f5f6fa;
}
.hero {
  padding: 60rpx 40rpx;
  background: linear-gradient(135deg, #ff9a3c 0%, #ff6a00 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.hero-title {
  font-size: 40rpx;
  font-weight: 700;
}
.hero-desc {
  margin-top: 16rpx;
  font-size: 26rpx;
  opacity: 0.9;
  text-align: center;
}
.form-card {
  margin: 24rpx;
  padding: 36rpx;
  background: #fff;
  border-radius: 20rpx;
}
.form-item {
  display: flex;
  flex-direction: column;
  margin-bottom: 28rpx;
}
.form-label {
  font-size: 26rpx;
  color: #666;
  margin-bottom: 12rpx;
}
.form-input {
  padding: 20rpx 24rpx;
  background: #f5f6fa;
  border-radius: 12rpx;
  font-size: 28rpx;
}
.submit-btn {
  margin-top: 16rpx;
  text-align: center;
  padding: 24rpx 0;
  background: #ff6a00;
  color: #fff;
  border-radius: 44rpx;
  font-size: 30rpx;
  font-weight: 600;
}
.rules-card {
  margin: 0 24rpx;
  padding: 32rpx 36rpx;
  background: #fff;
  border-radius: 20rpx;
  display: flex;
  flex-direction: column;
}
.rules-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 16rpx;
}
.rules-line {
  font-size: 24rpx;
  color: #888;
  line-height: 44rpx;
}
</style>
