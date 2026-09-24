<template>
  <view class="certs-page">
    <NavBar title="我的证书" />

    <view v-if="!loggedIn" class="login-prompt">
      <text class="login-tip-text"> 登录后查看获得的证书 </text>
      <button class="go-login-btn" @tap="goLogin">去登录</button>
    </view>

    <template v-else>
      <ErrorState
        v-if="loadError && certs.length === 0"
        message="证书加载失败，请稍后重试"
        @retry="load"
      />

      <view v-else class="cert-list">
        <view v-for="item in certs" :key="item.record_id" class="cert-card">
          <view class="cert-medal">
            <text class="medal-icon"> 🏅 </text>
          </view>
          <view class="cert-info">
            <text class="cert-name">
              {{ certName(item) }}
            </text>
            <view class="cert-tags">
              <text class="cert-type">
                {{ entityText(item.entity_type) }}
              </text>
              <text class="cert-date"> {{ formatDate(item.issued_at) }} 颁发 </text>
            </view>
            <text v-if="certDesc(item)" class="cert-desc">
              {{ certDesc(item) }}
            </text>
          </view>
        </view>

        <view v-if="certs.length === 0 && !loading" class="empty-tip">
          <text>还没有获得证书，完成课程或打卡即可解锁</text>
        </view>
        <view v-if="loading" class="loading-tip">
          <text>加载中...</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { getMyCertificates } from '../../api/scrm'
import { isLoggedIn } from '../../api/auth'
import { redirectToLogin } from '../../utils/request'
import { useTenantTitle } from '../../composables/useTenantTitle'
import NavBar from '../../components/NavBar.vue'
import ErrorState from '../../components/ErrorState.vue'

interface CertRecord {
  record_id: number | string
  certificate_id?: number
  entity_type?: string
  entity_id?: number | string
  issued_at?: string
  data?: Record<string, any> | null
  certificate?: { name?: string; description?: string } | null
}

const ENTITY_TEXT: Record<string, string> = {
  course: '课程结业',
  activity: '活动达标',
  checkin: '打卡达标',
  check_in: '打卡达标',
  manual: '荣誉授予',
}

const certs = ref<CertRecord[]>([])
const loading = ref(false)
const loadError = ref(false)
const loggedIn = computed(() => isLoggedIn())

useTenantTitle()

function certName(item: CertRecord) {
  return item.certificate?.name || item.data?.name || '荣誉证书'
}

function certDesc(item: CertRecord) {
  return item.certificate?.description || item.data?.description || ''
}

function entityText(type?: string) {
  return (type && ENTITY_TEXT[type]) || '荣誉认证'
}

function formatDate(dateStr?: string) {
  if (!dateStr) return ''
  const d = new Date(String(dateStr).replace(' ', 'T'))
  if (isNaN(d.getTime())) return String(dateStr).slice(0, 10)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function load() {
  if (!isLoggedIn()) return
  loading.value = true
  loadError.value = false
  try {
    const res: any = await getMyCertificates()
    certs.value = Array.isArray(res) ? res : res?.data || []
  } catch {
    certs.value = []
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
.certs-page {
  min-height: 100vh;
  background: #f5f6fa;
}
.cert-list {
  padding: 20rpx 24rpx;
}
.cert-card {
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #fffdf5 0%, #fff 60%);
  border: 1px solid #f0e6c8;
  border-radius: 16rpx;
  padding: 28rpx 24rpx;
  margin-bottom: 20rpx;
}
.cert-medal {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: #fff7e0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.medal-icon {
  font-size: 48rpx;
}
.cert-info {
  flex: 1;
  margin-left: 24rpx;
  display: flex;
  flex-direction: column;
}
.cert-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}
.cert-tags {
  display: flex;
  align-items: center;
  margin-top: 12rpx;
}
.cert-type {
  font-size: 22rpx;
  color: #b8860b;
  background: #fdf6e3;
  padding: 4rpx 14rpx;
  border-radius: 20rpx;
}
.cert-date {
  font-size: 22rpx;
  color: #bbb;
  margin-left: 16rpx;
}
.cert-desc {
  font-size: 24rpx;
  color: #999;
  margin-top: 12rpx;
}
.empty-tip {
  text-align: center;
  padding: 120rpx 40rpx;
  color: #999;
  font-size: 28rpx;
}
.loading-tip {
  text-align: center;
  padding: 40rpx 0;
  color: #999;
  font-size: 26rpx;
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
</style>
