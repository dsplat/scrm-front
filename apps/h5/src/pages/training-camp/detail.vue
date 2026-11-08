<template>
  <view class="camp-page">
    <NavBar title="训练营" />

    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>
    <ErrorState v-else-if="loadError" :message="errorMessage" @retry="load" />
    <template v-else-if="detail">
      <view class="hero-card">
        <text class="camp-title">
          {{ detail.activity.title }}
        </text>
        <text v-if="detail.activity.description" class="camp-desc">
          {{ detail.activity.description }}
        </text>
        <view class="camp-meta">
          <text>{{ detail.activity.start_date }} ~ {{ detail.activity.end_date }}</text>
          <text>{{ detail.progress.completed_count }}/{{ detail.tasks.length }} 已完成</text>
        </view>
        <view class="camp-progress">
          <text class="streak"> 连续 {{ detail.progress.streak_count }} 天 </text>
          <text v-if="detail.progress.today_checked" class="checked"> 今日已打卡 </text>
        </view>
      </view>

      <view class="today-card">
        <view class="section-title"> 今日任务 </view>
        <template v-if="todayTask">
          <text class="task-title">
            {{ todayTask.title }}
          </text>
          <text v-if="todayTask.instructions" class="task-instructions">
            {{ todayTask.instructions }}
          </text>
          <view v-if="todayTask.course" class="course-row" @tap="goCourse(todayTask.course)">
            <view class="course-info">
              <text class="course-title">
                {{ todayTask.course.course_title || '课程' }}
              </text>
              <text v-if="todayTask.course.chapter_title" class="chapter-title">
                {{ todayTask.course.chapter_title }}
              </text>
            </view>
            <text class="course-link"> 去学习 › </text>
          </view>

          <view v-if="todayTask.completed" class="submitted-box">
            <text class="submitted-label"> 今日已提交 </text>
            <text v-if="todayTask.submission?.content" class="submitted-content">
              {{ todayTask.submission?.content }}
            </text>
            <view v-if="mediaImages(todayTask).length" class="media-grid">
              <image
                v-for="(url, idx) in mediaImages(todayTask)"
                :key="idx"
                class="media-image"
                :src="url"
                mode="aspectFill"
                @tap="previewImages(todayTask, idx)"
              />
            </view>
            <view
              v-for="ev in todayTask.submission?.evaluations || []"
              :key="ev.evaluation_id"
              class="evaluation"
            >
              <text class="evaluation-score"> 老师点评 · 综合 {{ ev.overall_score }} 分 </text>
              <text v-if="ev.comment" class="evaluation-comment">
                {{ ev.comment }}
              </text>
            </view>
          </view>

          <view v-else class="submit-box">
            <textarea
              v-model="content"
              class="content-input"
              placeholder="写下今天的学习心得..."
              maxlength="5000"
            />
            <button class="submit-btn" :disabled="submitting" @tap="handleSubmit">
              {{ submitting ? '提交中...' : '提交今日任务' }}
            </button>
          </view>
        </template>
        <view v-else class="empty-today">
          <text>今日暂无任务，查看下方完整排期</text>
        </view>
      </view>

      <view class="schedule">
        <view class="section-title"> 完整排期 </view>
        <view
          v-for="task in detail.tasks"
          :key="task.task_id"
          class="task-item"
          :class="{ 'task-item--today': task.task_id === detail.today_task_id }"
        >
          <view class="task-item-head">
            <text class="task-date">
              {{ formatDate(task.scheduled_at) }}
            </text>
            <text v-if="task.completed" class="task-state task-state--done"> 已完成 </text>
            <text v-else-if="task.task_id === detail.today_task_id" class="task-state"> 今日 </text>
          </view>
          <text class="task-name">
            {{ task.title }}
          </text>
          <text v-if="task.instructions" class="task-note">
            {{ task.instructions }}
          </text>
          <view v-if="task.course" class="task-course" @tap="goCourse(task.course)">
            <text class="course-title">
              {{ task.course.course_title || '课程' }}
            </text>
            <text class="course-link"> 去学习 › </text>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import {
  getTrainingCampDetail,
  submitTrainingCampTask,
  type TrainingCampCourseRef,
  type TrainingCampDetail,
  type TrainingCampTask,
} from '../../api/training-camp'
import { useTenantTitle } from '../../composables/useTenantTitle'
import NavBar from '../../components/NavBar.vue'
import ErrorState from '../../components/ErrorState.vue'
import { ensureLogin } from '../../utils/auth-guard'
import { isLoggedIn } from '../../api/auth'

const detail = ref<TrainingCampDetail | null>(null)
const loading = ref(true)
const loadError = ref(false)
const errorMessage = computed(() =>
  isLoggedIn() ? '训练营加载失败，请稍后重试' : '登录后查看训练营',
)
const content = ref('')
const submitting = ref(false)

const todayTask = computed<TrainingCampTask | null>(() => {
  if (!detail.value?.today_task_id) return null
  return detail.value.tasks.find((task) => task.task_id === detail.value?.today_task_id) ?? null
})

let activityId = ''

useTenantTitle()

onLoad((options) => {
  activityId = String(options?.id || '')
  if (!activityId) {
    uni.showToast({ title: '参数错误', icon: 'none' })
    loadError.value = true
    loading.value = false
  }
})

onShow(() => {
  if (activityId) load()
})

async function load() {
  if (!isLoggedIn()) {
    loading.value = false
    loadError.value = true
    await ensureLogin('查看训练营需登录后进行')
    return
  }
  loading.value = true
  loadError.value = false
  try {
    detail.value = await getTrainingCampDetail(activityId)
  } catch {
    detail.value = null
    loadError.value = true
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  if (submitting.value || !todayTask.value) return
  const text = content.value.trim()
  if (!text) {
    uni.showToast({ title: '请输入今日内容', icon: 'none' })
    return
  }
  if (!(await ensureLogin('提交训练营任务需登录后进行'))) return

  submitting.value = true
  try {
    const res = await submitTrainingCampTask(activityId, todayTask.value.task_id, { content: text })
    content.value = ''
    const points = Number(res.check_in?.points_awarded ?? 0)
    uni.showToast({
      title: points > 0 ? `提交成功 +${points}积分` : '提交成功',
      icon: points > 0 ? 'none' : 'success',
    })
    await load()
  } catch (e: any) {
    uni.showToast({ title: e?.message || '提交失败', icon: 'none' })
    if (e?.statusCode === 409 || e?.code === 'training_camp.completion_conflict') {
      await load()
    }
  } finally {
    submitting.value = false
  }
}

function goCourse(course: TrainingCampCourseRef | null) {
  if (!course?.course_id) return
  uni.navigateTo({ url: `/pages/course/learn?id=${course.course_id}` })
}

function formatDate(iso: string | null): string {
  return iso ? iso.slice(0, 10) : '-'
}

function mediaImages(task: TrainingCampTask | null): string[] {
  return (task?.submission?.media || [])
    .filter((item) => item.type === 'image' && item.url)
    .map((item) => item.url)
}

function previewImages(task: TrainingCampTask | null, index: number) {
  const urls = mediaImages(task)
  if (!urls.length) return
  uni.previewImage({ urls, current: urls[index] })
}
</script>

<style scoped>
.camp-page {
  min-height: 100vh;
  background: #f5f6fa;
  padding-bottom: 48rpx;
}
.loading {
  text-align: center;
  padding-top: 200rpx;
  color: #999;
  font-size: 28rpx;
}
.hero-card {
  background: #fff;
  margin: 24rpx;
  padding: 28rpx;
  border-radius: 16rpx;
}
.camp-title {
  font-size: 34rpx;
  font-weight: bold;
  color: #333;
  display: block;
}
.camp-desc {
  font-size: 26rpx;
  color: #666;
  display: block;
  margin-top: 12rpx;
}
.camp-meta {
  display: flex;
  justify-content: space-between;
  margin-top: 20rpx;
  font-size: 24rpx;
  color: #999;
}
.camp-progress {
  display: flex;
  justify-content: space-between;
  margin-top: 16rpx;
  font-size: 24rpx;
}
.camp-progress .streak {
  color: var(--scrm-primary);
}
.camp-progress .checked {
  color: var(--scrm-primary);
}
.today-card,
.schedule {
  background: #fff;
  margin: 0 24rpx 24rpx;
  padding: 28rpx;
  border-radius: 16rpx;
}
.schedule {
  padding-bottom: 12rpx;
}
.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
}
.task-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  display: block;
}
.task-instructions {
  font-size: 26rpx;
  color: #666;
  display: block;
  margin-top: 12rpx;
}
.course-row,
.task-course {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f7f8fa;
  border-radius: 12rpx;
  padding: 18rpx 20rpx;
  margin-top: 16rpx;
}
.course-info {
  display: flex;
  flex-direction: column;
}
.course-title {
  font-size: 26rpx;
  color: #333;
}
.chapter-title {
  font-size: 22rpx;
  color: #999;
  margin-top: 6rpx;
}
.course-link {
  font-size: 24rpx;
  color: var(--scrm-primary);
}
.submitted-box {
  margin-top: 20rpx;
  background: #f0faf4;
  border-radius: 12rpx;
  padding: 20rpx;
}
.submitted-label {
  font-size: 24rpx;
  color: var(--scrm-primary);
  display: block;
}
.submitted-content {
  font-size: 28rpx;
  color: #333;
  display: block;
  margin-top: 10rpx;
  white-space: pre-wrap;
  word-break: break-word;
}
.media-grid {
  display: flex;
  flex-wrap: wrap;
  margin-top: 12rpx;
}
.media-image {
  width: 180rpx;
  height: 180rpx;
  border-radius: 8rpx;
  margin: 0 12rpx 12rpx 0;
}
.evaluation {
  margin-top: 16rpx;
  border-top: 1px solid #dcefe2;
  padding-top: 16rpx;
}
.evaluation-score {
  font-size: 24rpx;
  color: var(--scrm-primary);
  display: block;
}
.evaluation-comment {
  font-size: 26rpx;
  color: #333;
  display: block;
  margin-top: 8rpx;
}
.submit-box {
  margin-top: 20rpx;
}
.content-input {
  width: 100%;
  height: 180rpx;
  background: #f7f8fa;
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 26rpx;
  box-sizing: border-box;
}
.submit-btn {
  background: var(--scrm-primary);
  color: #fff;
  border-radius: 40rpx;
  margin-top: 24rpx;
  font-size: 30rpx;
}
.submit-btn[disabled] {
  opacity: 0.6;
}
.empty-today {
  text-align: center;
  padding: 40rpx 0;
  color: #999;
  font-size: 26rpx;
}
.task-item {
  padding: 24rpx 0;
  border-bottom: 1px solid #f5f5f5;
}
.task-item:last-child {
  border-bottom: none;
}
.task-item--today {
  background: #f7fbf9;
  margin: 0 -28rpx;
  padding: 24rpx 28rpx;
  border-radius: 12rpx;
}
.task-item-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.task-date {
  font-size: 24rpx;
  color: #999;
}
.task-state {
  font-size: 22rpx;
  color: var(--scrm-primary);
}
.task-state--done {
  color: #67c23a;
}
.task-name {
  font-size: 28rpx;
  color: #333;
  display: block;
  margin-top: 10rpx;
}
.task-note {
  font-size: 24rpx;
  color: #999;
  display: block;
  margin-top: 8rpx;
}
</style>
