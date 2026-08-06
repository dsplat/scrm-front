<template>
  <view class="h5c-learn-page">
    <NavBar :title="course?.title || title" />
    <view v-if="loading" class="loading-tip">
      <text>加载中...</text>
    </view>
    <template v-else-if="course">
      <view v-if="!hasAccess" class="no-access">
        <text>尚未开通该课程</text>
        <button class="go-buy-btn" @tap="goDetail">去开通</button>
      </view>
      <template v-else>
        <!-- 章节导航 -->
        <scroll-view class="chapter-nav" scroll-x>
          <view
            v-for="ch in chapters"
            :key="ch.chapter_id"
            class="nav-item"
            :class="{ active: current?.chapter_id === ch.chapter_id }"
            @tap="selectChapter(ch)"
          >
            <text>{{ ch.sort_order + 1 }}. {{ ch.title }}</text>
          </view>
        </scroll-view>

        <!-- 章节内容 -->
        <view v-if="current" class="content-card">
          <text class="content-title">
            {{ current.title }}
          </text>
          <video
            v-if="current.type === 'video' && current.file_url"
            class="content-video"
            :src="current.file_url"
            controls
          />
          <view v-else-if="current.type === 'file' && current.file_url" class="file-box">
            <text class="file-tip"> 附件资料 </text>
            <!-- #ifdef H5 -->
            <a :href="current.file_url" target="_blank" class="file-link">
              {{ current.file_url }}
            </a>
            <!-- #endif -->
          </view>
          <text v-else class="content-text">
            {{ current.content || '（暂无内容）' }}
          </text>

          <button class="finish-btn" :disabled="reporting" @tap="handleFinish">
            {{ reporting ? '提交中...' : '学完本节' }}
          </button>
        </view>

        <view v-if="rewardTip" class="reward-tip">
          <text>{{ rewardTip }}</text>
        </view>
      </template>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  getCourseDetail,
  reportLearningProgress,
  type CourseVO,
  type ChapterVO,
} from '../api/course'
import { courseDetailUrl } from '../config'
import NavBar from '../components/NavBar.vue'

const props = withDefaults(
  defineProps<{
    /** 课程 id（宿主页面 onLoad 解析后传入） */
    courseId?: number
    title?: string
  }>(),
  {
    courseId: 0,
    title: '课程学习',
  },
)

const course = ref<CourseVO | null>(null)
const chapters = ref<ChapterVO[]>([])
const hasAccess = ref(false)
const current = ref<ChapterVO | null>(null)
const loading = ref(false)
const reporting = ref(false)
const rewardTip = ref('')

watch(
  () => props.courseId,
  () => load(),
  { immediate: true },
)

function selectChapter(ch: ChapterVO) {
  current.value = ch
  rewardTip.value = ''
}

function goDetail() {
  uni.redirectTo({ url: courseDetailUrl(props.courseId) })
}

async function load() {
  if (!props.courseId) return
  loading.value = true
  try {
    const res = await getCourseDetail(props.courseId)
    course.value = res.course
    chapters.value = res.chapters || []
    hasAccess.value = !!res.has_access
    current.value = chapters.value[0] ?? null
  } catch (e: any) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function handleFinish() {
  if (!current.value) return
  reporting.value = true
  try {
    const res = await reportLearningProgress(props.courseId, current.value.chapter_id)
    if (res.completed_now) {
      rewardTip.value =
        res.reward_granted > 0
          ? `恭喜完成全部课程！奖励积分 +${res.reward_granted}`
          : '恭喜完成全部课程！'
      uni.showToast({ title: '课程已完成', icon: 'success' })
    } else {
      uni.showToast({ title: '已记录进度', icon: 'success' })
      // 自动进入下一节
      const idx = chapters.value.findIndex((c) => c.chapter_id === current.value?.chapter_id)
      if (idx >= 0 && idx < chapters.value.length - 1) {
        current.value = chapters.value[idx + 1]
      }
    }
  } catch (e: any) {
    uni.showToast({ title: e.message || '提交失败', icon: 'none' })
  } finally {
    reporting.value = false
  }
}
</script>

<style scoped>
.h5c-learn-page {
  min-height: 100vh;
  background: #f5f6fa;
}
.loading-tip {
  text-align: center;
  padding: 120rpx 0;
  color: #999;
  font-size: 28rpx;
}
.no-access {
  padding: 120rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #999;
  font-size: 28rpx;
}
.go-buy-btn {
  margin-top: 32rpx;
  padding: 0 64rpx;
  height: 76rpx;
  line-height: 76rpx;
  background: #07c160;
  color: #fff;
  font-size: 28rpx;
  border-radius: 38rpx;
}
.chapter-nav {
  white-space: nowrap;
  background: #fff;
  padding: 16rpx 12rpx;
}
.nav-item {
  display: inline-block;
  padding: 12rpx 28rpx;
  margin: 0 8rpx;
  border-radius: 24rpx;
  font-size: 26rpx;
  color: #666;
  background: #f5f6fa;
}
.nav-item.active {
  background: #e8f8ee;
  color: #07c160;
  font-weight: 600;
}
.content-card {
  margin: 24rpx;
  padding: 32rpx 28rpx;
  background: #fff;
  border-radius: 16rpx;
}
.content-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}
.content-video {
  margin-top: 24rpx;
  width: 100%;
  border-radius: 12rpx;
}
.file-box {
  margin-top: 24rpx;
  padding: 24rpx;
  background: #f5f6fa;
  border-radius: 12rpx;
}
.file-tip {
  font-size: 26rpx;
  color: #666;
}
.file-link {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #07c160;
  word-break: break-all;
}
.content-text {
  margin-top: 24rpx;
  font-size: 28rpx;
  color: #444;
  line-height: 1.8;
  white-space: pre-wrap;
}
.finish-btn {
  margin-top: 40rpx;
  background: #07c160;
  color: #fff;
  font-size: 30rpx;
  border-radius: 40rpx;
}
.finish-btn[disabled] {
  opacity: 0.6;
}
.reward-tip {
  margin: 0 24rpx;
  padding: 24rpx;
  background: #fff7e6;
  border-radius: 12rpx;
  text-align: center;
  color: #ff9500;
  font-size: 28rpx;
}
</style>
