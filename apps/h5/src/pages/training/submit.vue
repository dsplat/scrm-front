<template>
  <view class="submit-page">
    <NavBar title="提交作业" />

    <view v-if="loading" class="center-tip">
      <text>加载中...</text>
    </view>

    <template v-else-if="assignment">
      <!-- 作业说明卡 -->
      <view class="assign-card">
        <view class="assign-top">
          <text class="assign-title">
            {{ assignment.title }}
          </text>
        </view>
        <text v-if="assignment.class_name" class="assign-class">
          {{ assignment.class_name }}
        </text>
        <text v-if="assignment.content" class="assign-content">
          {{ assignment.content }}
        </text>
        <text v-if="assignment.due_at" class="assign-due" :class="{ overdue: isOverdue }">
          {{ isOverdue ? '已截止' : '截止时间' }}：{{ formatDue(assignment.due_at) }}
        </text>
      </view>

      <!-- 已批改提示 -->
      <view v-if="assignment.submission?.review" class="review-banner">
        <text class="review-score"> {{ assignment.submission.review.score }} 分 </text>
        <text class="review-grade">
          {{ assignment.submission.review.grade_label }}
        </text>
        <text v-if="assignment.submission.review.comment" class="review-comment">
          评语：{{ assignment.submission.review.comment }}
        </text>
        <text class="review-hint"> 重新提交后将覆盖原内容，等待老师再次批改 </text>
      </view>

      <!-- 提交表单 -->
      <view class="form-card">
        <text class="form-label"> 文字说明（选填，与媒体至少一项） </text>
        <textarea
          v-model="contentText"
          class="content-input"
          placeholder="写下你的作业内容/心得…"
          maxlength="5000"
          :disabled="submitting"
        />

        <view class="form-label-row">
          <text class="form-label"> 作品附件（最多 9 个） </text>
          <text v-if="uploading" class="uploading-tip"> 上传中… </text>
        </view>

        <!-- 媒体九宫格 -->
        <view class="media-grid">
          <view v-for="(item, idx) in mediaList" :key="item.url" class="media-cell">
            <image
              v-if="item.type === 'image'"
              class="media-thumb"
              :src="item.url"
              mode="aspectFill"
              @tap="previewMedia(idx)"
            />
            <view v-else-if="item.type === 'video'" class="media-video" @tap="previewMedia(idx)">
              <text class="video-icon"> ▶ </text>
            </view>
            <view v-else class="media-file" @tap="previewMedia(idx)">
              <text class="file-icon"> 📄 </text>
              <text class="file-name">
                {{ fileNameOf(item.url) }}
              </text>
            </view>
            <view v-if="!submitting" class="media-remove" @tap.stop="removeMedia(idx)">
              <text>×</text>
            </view>
          </view>
        </view>

        <!-- 添加媒体工具栏（静态可见，避免依赖 :active 的手势层） -->
        <view v-if="mediaList.length < 9 && !uploading" class="media-toolbar">
          <view class="toolbar-btn" @tap="pickImages">
            <text class="toolbar-icon"> 🖼 </text>
            <text>图片</text>
          </view>
          <view class="toolbar-btn" @tap="pickVideo">
            <text class="toolbar-icon"> 🎬 </text>
            <text>视频</text>
          </view>
          <view class="toolbar-btn" @tap="pickFile">
            <text class="toolbar-icon"> 📄 </text>
            <text>文件</text>
          </view>
        </view>
      </view>

      <!-- 提交栏 -->
      <view class="submit-bar">
        <button class="submit-btn" :disabled="submitting || uploading" @tap="handleSubmit">
          {{ submitting ? '提交中...' : assignment.submitted ? '重新提交' : '提交作业' }}
        </button>
        <text v-if="assignment.submitted && !assignment.submission?.review" class="submit-hint">
          已提交待批改，重新提交将覆盖原内容
        </text>
      </view>
    </template>

    <view v-else class="center-tip">
      <text>作业不存在或已关闭</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import {
  getStudentAssignment,
  submitStudentAssignment,
  uploadTrainingFile,
  type TrainingAssignment,
  type TrainingMedia,
} from '../../api/training'
import { useTenantTitle } from '../../composables/useTenantTitle'
import NavBar from '../../components/NavBar.vue'

const assignment = ref<TrainingAssignment | null>(null)
const loading = ref(true)
const contentText = ref('')
const mediaList = ref<TrainingMedia[]>([])
const submitting = ref(false)
const uploading = ref(false)

let assignmentId = ''

useTenantTitle()

onLoad(async (options) => {
  assignmentId = String(options?.assignment_id || '')
  if (!assignmentId) {
    uni.showToast({ title: '参数错误', icon: 'none' })
    loading.value = false
    return
  }
  await loadDetail()
})

async function loadDetail() {
  loading.value = true
  try {
    assignment.value = (await getStudentAssignment(assignmentId)) as TrainingAssignment
    const submission = assignment.value?.submission
    contentText.value = submission?.content || ''
    mediaList.value = Array.isArray(submission?.media) ? (submission?.media ?? []) : []
  } catch (e: any) {
    if (e?.message?.includes('未登录')) return // request 层已跳登录
    uni.showToast({ title: e?.message || '加载失败，请稍后再试', icon: 'none' })
  } finally {
    loading.value = false
  }
}

const isOverdue = computed(() => {
  const dueAt = assignment.value?.due_at
  if (!dueAt) return false
  return new Date(dueAt.replace(' ', 'T')).getTime() < Date.now()
})

function formatDue(dueAt: string): string {
  return dueAt.slice(0, 16).replace('T', ' ')
}

function remainingCount(): number {
  return 9 - mediaList.value.length
}

function uploadAndAppend(paths: string[], type: TrainingMedia['type']): Promise<void> {
  const list = paths.slice(0, remainingCount())
  if (list.length === 0) {
    uni.showToast({ title: '最多上传 9 个附件', icon: 'none' })
    return Promise.resolve()
  }
  return (async () => {
    uploading.value = true
    try {
      for (const path of list) {
        // eslint-disable-next-line no-await-in-loop
        const url = await uploadTrainingFile(path)
        mediaList.value.push({ type, url })
      }
    } catch (e: any) {
      uni.showToast({ title: e?.message || '上传失败，请重试', icon: 'none' })
    } finally {
      uploading.value = false
    }
  })()
}

function pickImages() {
  if (uploading.value || remainingCount() <= 0) return
  uni.chooseImage({
    count: remainingCount(),
    sourceType: ['album', 'camera'],
    success: (res) => {
      // 部分端类型声明为 string | string[]，统一归一后上传
      const paths = Array.isArray(res.tempFilePaths) ? res.tempFilePaths : [res.tempFilePaths]
      uploadAndAppend(paths, 'image')
    },
  })
}

function pickVideo() {
  if (uploading.value || remainingCount() <= 0) return
  uni.chooseVideo({
    sourceType: ['album', 'camera'],
    maxDuration: 60,
    success: (res) => {
      uploadAndAppend([res.tempFilePath], 'video')
    },
  })
}

function pickFile() {
  if (uploading.value || remainingCount() <= 0) return
  // #ifdef H5
  uni.chooseFile({
    count: remainingCount(),
    type: 'all',
    success: (res) => {
      const raw: any[] = Array.isArray(res.tempFiles) ? res.tempFiles : [res.tempFiles]
      const paths = raw.map((f) => f?.path || f?.tempFilePath).filter(Boolean)
      uploadAndAppend(paths, 'file')
    },
  })
  // #endif
  // #ifdef MP-WEIXIN
  // 经 globalThis 取 wx（vue-tsc 不剥离条件编译块，避免裸 wx 标识符类型错误）
  const wxApi: any = (globalThis as any).wx
  if (!wxApi?.chooseMessageFile) return
  wxApi.chooseMessageFile({
    count: remainingCount(),
    type: 'file',
    success: (res: any) => {
      const paths = (res.tempFiles || []).map((f: any) => f?.path).filter(Boolean)
      uploadAndAppend(paths, 'file')
    },
  })
  // #endif
}

function removeMedia(idx: number) {
  mediaList.value.splice(idx, 1)
}

function previewMedia(idx: number) {
  const item = mediaList.value[idx]
  if (!item) return
  if (item.type === 'image') {
    const urls = mediaList.value.filter((m) => m.type === 'image').map((m) => m.url)
    uni.previewImage({ current: item.url, urls })
    return
  }
  if (item.type === 'video') {
    uni.previewMedia?.({
      sources: [{ url: item.url, type: 'video' }],
    })
  }
}

function fileNameOf(url: string): string {
  const raw = url.split('?')[0].split('/').pop() || ''
  try {
    return decodeURIComponent(raw).slice(-18)
  } catch {
    return raw.slice(-18)
  }
}

async function handleSubmit() {
  if (submitting.value || uploading.value) return
  const content = contentText.value.trim()
  if (!content && mediaList.value.length === 0) {
    uni.showToast({ title: '请填写文字或添加附件', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    await submitStudentAssignment(assignmentId, {
      content: content || undefined,
      media: mediaList.value.length > 0 ? mediaList.value : undefined,
    })
    uni.showToast({ title: '提交成功', icon: 'success' })
    setTimeout(() => {
      uni.navigateBack()
    }, 800)
  } catch (e: any) {
    uni.showToast({ title: e?.message || '提交失败，请重试', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.submit-page {
  min-height: 100vh;
  background: #f5f6fa;
  padding-bottom: 160rpx;
}
.center-tip {
  text-align: center;
  padding-top: 160rpx;
  color: #999;
  font-size: 28rpx;
}
.assign-card,
.form-card {
  background: #fff;
  margin: 24rpx;
  border-radius: 16rpx;
  padding: 28rpx;
}
.assign-top {
  display: flex;
}
.assign-title {
  font-size: 34rpx;
  font-weight: bold;
  color: #333;
}
.assign-class {
  font-size: 24rpx;
  color: #1989fa;
  display: block;
  margin-top: 10rpx;
}
.assign-content {
  font-size: 27rpx;
  color: #555;
  margin-top: 16rpx;
  display: block;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-all;
}
.assign-due {
  font-size: 24rpx;
  color: #999;
  display: block;
  margin-top: 16rpx;
}
.assign-due.overdue {
  color: #e64340;
}
.review-banner {
  background: #fff;
  margin: 0 24rpx 24rpx;
  border-radius: 16rpx;
  padding: 24rpx 28rpx;
  border-left: 8rpx solid #07c160;
  display: flex;
  flex-direction: column;
}
.review-score {
  font-size: 40rpx;
  font-weight: bold;
  color: #07c160;
}
.review-grade {
  font-size: 24rpx;
  color: #07c160;
  margin-top: 6rpx;
}
.review-comment {
  font-size: 26rpx;
  color: #555;
  margin-top: 12rpx;
  line-height: 1.6;
}
.review-hint {
  font-size: 22rpx;
  color: #e6a23c;
  margin-top: 12rpx;
}
.form-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.form-label {
  font-size: 26rpx;
  font-weight: bold;
  color: #333;
  display: block;
}
.uploading-tip {
  font-size: 22rpx;
  color: #e6a23c;
}
.content-input {
  width: 100%;
  height: 240rpx;
  background: #f7f8fa;
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 27rpx;
  box-sizing: border-box;
  margin: 20rpx 0 32rpx;
  line-height: 1.6;
}
.media-grid {
  display: flex;
  flex-wrap: wrap;
  margin-top: 20rpx;
}
.media-cell {
  width: 200rpx;
  height: 200rpx;
  border-radius: 12rpx;
  margin: 0 16rpx 16rpx 0;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
}
.media-thumb {
  width: 100%;
  height: 100%;
}
.media-video {
  width: 100%;
  height: 100%;
  background: #1f2937;
  display: flex;
  align-items: center;
  justify-content: center;
}
.video-icon {
  color: #fff;
  font-size: 56rpx;
}
.media-file {
  width: 100%;
  height: 100%;
  background: #f0f4ff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10rpx;
  box-sizing: border-box;
}
.file-icon {
  font-size: 48rpx;
}
.file-name {
  font-size: 20rpx;
  color: #666;
  margin-top: 8rpx;
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.media-remove {
  position: absolute;
  top: 0;
  right: 0;
  width: 44rpx;
  height: 44rpx;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 32rpx;
  line-height: 40rpx;
  text-align: center;
  border-radius: 0 0 0 12rpx;
}
.media-toolbar {
  display: flex;
  margin-top: 8rpx;
}
.toolbar-btn {
  display: flex;
  align-items: center;
  border: 2rpx solid #07c160;
  color: #07c160;
  border-radius: 32rpx;
  font-size: 24rpx;
  padding: 10rpx 28rpx;
  margin-right: 20rpx;
}
.toolbar-btn:active {
  background: #e6f7ed;
}
.toolbar-icon {
  margin-right: 8rpx;
  font-size: 26rpx;
}
.submit-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fff;
  padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  align-items: center;
}
.submit-btn {
  width: 100%;
  background: #07c160;
  color: #fff;
  border-radius: 44rpx;
  font-size: 30rpx;
  margin: 0;
}
.submit-btn[disabled] {
  opacity: 0.6;
  color: #fff;
}
.submit-hint {
  font-size: 22rpx;
  color: #999;
  margin-top: 10rpx;
}
</style>
