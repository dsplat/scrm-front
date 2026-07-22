<template>
  <view class="poster-page">
    <NavBar title="活动海报" />

    <!-- 加载中 -->
    <view v-if="loading" class="loading">
      <view class="spinner" />
      <text class="loading-text"> 海报生成中… </text>
    </view>

    <!-- 海报主体 -->
    <view v-else-if="posterUrl" class="poster-wrap">
      <image
        class="poster-img"
        :src="posterUrl"
        mode="widthFix"
        show-menu-by-longpress
        @tap="preview"
      />
      <view class="tips">
        <text class="tips-text"> 长按二维码识别 · 或长按图片保存到相册 </text>
      </view>
      <view class="actions">
        <button class="btn-save" @tap="preview">预览 / 保存</button>
      </view>
    </view>

    <!-- 失败兜底 -->
    <view v-else class="error">
      <text class="error-text"> 海报生成失败，请稍后重试 </text>
      <button class="btn-retry" @tap="loadPoster">重新生成</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { renderEventPoster } from '../../api/event'
import NavBar from '../../components/NavBar.vue'

const loading = ref(true)
const posterUrl = ref('')
let eventId = ''
let distributorId = ''

/** 将后端返回的相对路径补全为绝对 URL（H5 展示/预览需要） */
function toAbsoluteUrl(url: string): string {
  if (!url) return ''
  if (/^https?:\/\//.test(url)) return url
  // #ifdef H5
  return window.location.origin + url
  // #endif
  // #ifndef H5
  return url
  // #endif
}

async function loadPoster() {
  loading.value = true
  posterUrl.value = ''
  try {
    const data: any = { utm_source: 'poster_share' }
    if (distributorId) data.distributor_id = Number(distributorId)
    const res: any = await renderEventPoster(eventId, data)
    // request 封装已解包 body.data，res 即 { url, path, cached }
    posterUrl.value = toAbsoluteUrl(res?.url || '')
  } catch (e: any) {
    uni.showToast({ title: e.message || '海报生成失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function preview() {
  if (!posterUrl.value) return
  uni.previewImage({ urls: [posterUrl.value], current: posterUrl.value })
}

onMounted(() => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  eventId = page.$page?.options?.eventId || page.options?.eventId || ''
  distributorId = page.$page?.options?.distributorId || page.options?.distributorId || ''
  if (eventId) {
    loadPoster()
  } else {
    loading.value = false
  }
})
</script>

<style scoped>
.poster-page {
  min-height: 100vh;
  background: #1a1a2e;
}
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 200rpx 0;
}
.spinner {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  border: 6rpx solid rgba(255, 255, 255, 0.2);
  border-top-color: #fff;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.loading-text {
  margin-top: 24rpx;
  color: rgba(255, 255, 255, 0.7);
  font-size: 28rpx;
}
.poster-wrap {
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.poster-img {
  width: 100%;
  border-radius: 16rpx;
  box-shadow: 0 12rpx 40rpx rgba(0, 0, 0, 0.4);
}
.tips {
  margin-top: 24rpx;
}
.tips-text {
  color: rgba(255, 255, 255, 0.6);
  font-size: 24rpx;
}
.actions {
  width: 100%;
  margin-top: 32rpx;
}
.btn-save {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background: #4a90d9;
  color: #fff;
  border-radius: 44rpx;
  font-size: 30rpx;
}
.error {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 200rpx 32rpx;
}
.error-text {
  color: rgba(255, 255, 255, 0.7);
  font-size: 28rpx;
  margin-bottom: 32rpx;
}
.btn-retry {
  width: 320rpx;
  height: 80rpx;
  line-height: 80rpx;
  background: #4a90d9;
  color: #fff;
  border-radius: 40rpx;
  font-size: 28rpx;
}
</style>
