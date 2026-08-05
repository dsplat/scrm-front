<template>
  <view class="posters-page">
    <NavBar title="我的推广海报" />

    <!-- 加载中 -->
    <view v-if="loading" class="empty-tip">
      <text>加载中...</text>
    </view>

    <!-- 空态 -->
    <view v-else-if="posters.length === 0" class="empty-tip">
      <text class="empty-title"> 暂无可推广的海报 </text>
      <text class="empty-desc"> 商家发布推广海报后，你可以在这里生成专属海报 </text>
    </view>

    <!-- 海报列表 -->
    <view v-else class="poster-list">
      <view v-for="p in posters" :key="p.poster_id" class="poster-card">
        <image
          class="poster-thumb"
          :src="p.preview_url || p.template_url || ''"
          mode="aspectFill"
        />
        <view class="poster-info">
          <text class="poster-name">
            {{ p.name }}
          </text>
          <text v-if="p.campaign" class="poster-campaign"> 活动：{{ p.campaign.name }} </text>
          <view class="gen-btn" @tap="handleRender(p)">
            <text>{{ renderingId === p.poster_id ? '生成中...' : '生成我的海报' }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 生成结果弹层 -->
    <view v-if="result" class="result-mask" @tap="result = null">
      <view class="result-card" @tap.stop>
        <text class="result-title">
          {{ result.poster.name }}
        </text>
        <image class="result-image" :src="result.image_url" mode="widthFix" @tap="previewImage" />
        <text class="result-tip">
          长按二维码保存到相册，分享给好友即可赚佣金；也可直接复制专属推广链接
        </text>
        <view class="result-actions">
          <!-- #ifdef MP-WEIXIN -->
          <view class="save-btn" @tap="saveToAlbum">
            <text>保存到相册</text>
          </view>
          <!-- #endif -->
          <!-- #ifdef H5 -->
          <view class="save-btn" @tap="previewImage">
            <text>查看大图（长按保存）</text>
          </view>
          <!-- #endif -->
          <view class="link-btn" @tap="copyShareLink">
            <text>复制我的推广链接</text>
          </view>
          <view class="close-btn" @tap="result = null">
            <text>关闭</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  getMyPosters,
  renderMyPoster,
  type MyPoster,
  type MyPosterRenderResult,
} from '../../api/poster'
import { useTenantTitle } from '../../composables/useTenantTitle'
import NavBar from '../../components/NavBar.vue'

const loading = ref(true)
const posters = ref<MyPoster[]>([])
const renderingId = ref<number | null>(null)
const result = ref<MyPosterRenderResult | null>(null)

useTenantTitle()

onMounted(async () => {
  try {
    posters.value = await getMyPosters()
  } catch (e: any) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
})

async function handleRender(poster: MyPoster) {
  if (renderingId.value) return
  renderingId.value = poster.poster_id
  uni.showLoading({ title: '正在生成专属海报...' })
  try {
    result.value = await renderMyPoster(poster.poster_id)
  } catch (e: any) {
    uni.showToast({ title: e.message || '生成失败，请稍后再试', icon: 'none' })
  } finally {
    uni.hideLoading()
    renderingId.value = null
  }
}

function previewImage() {
  if (!result.value) return
  uni.previewImage({ urls: [result.value.image_url] })
}

/** 复制专属推广链接（qrcode_url 已带我的分销码 ref 归因） */
function copyShareLink() {
  if (!result.value) return
  uni.setClipboardData({
    data: result.value.qrcode_url,
    success: () => uni.showToast({ title: '推广链接已复制，链接中带你的分销码', icon: 'none' }),
    fail: () => uni.showToast({ title: '复制失败，请长按图中二维码访问', icon: 'none' }),
  })
}

// #ifdef MP-WEIXIN
function saveToAlbum() {
  if (!result.value) return
  uni.downloadFile({
    url: result.value.image_url,
    success: (res) => {
      uni.saveImageToPhotosAlbum({
        filePath: res.tempFilePath,
        success: () => uni.showToast({ title: '已保存到相册', icon: 'success' }),
        fail: () => uni.showToast({ title: '保存失败，请检查相册权限', icon: 'none' }),
      })
    },
    fail: () => uni.showToast({ title: '下载失败，请稍后再试', icon: 'none' }),
  })
}
// #endif
</script>

<style scoped>
.posters-page {
  min-height: 100vh;
  background: #f5f6f8;
}
.empty-tip {
  padding: 120rpx 40rpx;
  text-align: center;
  color: #999;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.empty-title {
  font-size: 32rpx;
  color: #333;
}
.empty-desc {
  font-size: 26rpx;
}
.poster-list {
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.poster-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  display: flex;
  gap: 24rpx;
}
.poster-thumb {
  width: 180rpx;
  height: 240rpx;
  border-radius: 12rpx;
  background: #eee;
  flex-shrink: 0;
}
.poster-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.poster-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}
.poster-campaign {
  font-size: 24rpx;
  color: #999;
}
.gen-btn {
  margin-top: auto;
  background: #ff6b6b;
  color: #fff;
  border-radius: 32rpx;
  padding: 14rpx 0;
  text-align: center;
  font-size: 26rpx;
}
.result-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99;
}
.result-card {
  width: 86%;
  background: #fff;
  border-radius: 20rpx;
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
  max-height: 86vh;
  overflow-y: auto;
}
.result-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}
.result-image {
  width: 100%;
  border-radius: 12rpx;
}
.result-tip {
  font-size: 24rpx;
  color: #999;
  text-align: center;
}
.result-actions {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.save-btn {
  background: #ff6b6b;
  color: #fff;
  border-radius: 40rpx;
  padding: 18rpx 0;
  text-align: center;
  font-size: 28rpx;
}
.link-btn {
  background: #fff;
  color: #ff6b6b;
  border: 2rpx solid #ff6b6b;
  border-radius: 40rpx;
  padding: 16rpx 0;
  text-align: center;
  font-size: 28rpx;
}
.close-btn {
  border: 1rpx solid #ddd;
  color: #666;
  border-radius: 40rpx;
  padding: 18rpx 0;
  text-align: center;
  font-size: 28rpx;
}
</style>
