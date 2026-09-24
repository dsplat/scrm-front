<template>
  <view class="courses-page">
    <NavBar title="我的课程" />

    <view v-if="!loggedIn" class="login-prompt">
      <text class="login-tip-text"> 登录后查看已购课程 </text>
      <button class="go-login-btn" @tap="goLogin">去登录</button>
    </view>

    <template v-else>
      <ErrorState
        v-if="loadError && courses.length === 0"
        message="课程加载失败，请稍后重试"
        @retry="load"
      />

      <view v-else class="course-list">
        <view
          v-for="item in courses"
          :key="item.course.course_id"
          class="course-card"
          @tap="goLearn(item)"
        >
          <image
            v-if="item.course.cover"
            class="cover"
            :src="item.course.cover"
            mode="aspectFill"
          />
          <view v-else class="cover placeholder">
            <text>{{ item.course.title.slice(0, 1) }}</text>
          </view>
          <view class="course-info">
            <text class="course-title">
              {{ item.course.title }}
            </text>
            <view class="progress-row">
              <view class="progress-bar">
                <view class="progress-inner" :style="{ width: progressPct(item) + '%' }" />
              </view>
              <text class="progress-text"> {{ progressPct(item) }}% </text>
            </view>
            <view class="course-foot">
              <text class="course-status" :class="{ done: isCompleted(item) }">
                {{ isCompleted(item) ? '已完成' : '学习中' }}
              </text>
              <text class="learn-btn">
                {{ isCompleted(item) ? '回顾课程' : '继续学习' }}
              </text>
            </view>
          </view>
        </view>

        <view v-if="courses.length === 0 && !loading" class="empty-tip">
          <text>还没有课程，去课程中心逛逛吧</text>
          <button class="go-login-btn browse-btn" @tap="goBrowse">浏览课程</button>
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
import { getMyCourses, navCourseLearn, type MyCourseItem } from '@scrm/h5-commerce'
import { isLoggedIn } from '../../api/auth'
import { redirectToLogin } from '../../utils/request'
import { useTenantTitle } from '../../composables/useTenantTitle'
import NavBar from '../../components/NavBar.vue'
import ErrorState from '../../components/ErrorState.vue'

const courses = ref<MyCourseItem[]>([])
const loading = ref(false)
const loadError = ref(false)
const loggedIn = computed(() => isLoggedIn())

useTenantTitle()

function progressPct(item: MyCourseItem) {
  const p = Number(item.progress || 0)
  return Math.max(0, Math.min(100, Math.round(p)))
}

function isCompleted(item: MyCourseItem) {
  return !!item.completed_at || progressPct(item) >= 100
}

async function load() {
  if (!isLoggedIn()) return
  loading.value = true
  loadError.value = false
  try {
    const res = await getMyCourses()
    courses.value = Array.isArray(res) ? res : (res as any)?.data || []
  } catch {
    courses.value = []
    loadError.value = true
  } finally {
    loading.value = false
  }
}

function goLearn(item: MyCourseItem) {
  navCourseLearn(item.course.course_id)
}

function goBrowse() {
  uni.navigateTo({ url: '/pages/course/index' })
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
.courses-page {
  min-height: 100vh;
  background: #f5f6fa;
}
.course-list {
  padding: 20rpx 24rpx;
}
.course-card {
  display: flex;
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
}
.cover {
  width: 180rpx;
  height: 140rpx;
  border-radius: 12rpx;
  background: #f0f0f0;
  flex-shrink: 0;
}
.cover.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48rpx;
  color: #ccc;
  background: #eef0ff;
}
.course-info {
  flex: 1;
  margin-left: 20rpx;
  display: flex;
  flex-direction: column;
}
.course-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.progress-row {
  display: flex;
  align-items: center;
  margin-top: 16rpx;
}
.progress-bar {
  flex: 1;
  height: 12rpx;
  background: #f0f0f0;
  border-radius: 6rpx;
  overflow: hidden;
}
.progress-inner {
  height: 100%;
  background: var(--scrm-primary);
  border-radius: 6rpx;
}
.progress-text {
  font-size: 22rpx;
  color: #999;
  margin-left: 12rpx;
}
.course-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16rpx;
}
.course-status {
  font-size: 22rpx;
  color: #e6a23c;
}
.course-status.done {
  color: var(--scrm-primary);
}
.learn-btn {
  font-size: 26rpx;
  color: var(--scrm-primary);
  font-weight: 500;
}
.empty-tip {
  text-align: center;
  padding: 100rpx 0 40rpx;
  color: #999;
  font-size: 28rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32rpx;
}
.browse-btn {
  width: 280rpx;
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
