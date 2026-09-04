<template>
  <view class="training-detail-page">
    <NavBar title="班级详情" />

    <view v-if="loading" class="center-tip">
      <text>加载中...</text>
    </view>

    <template v-else-if="classInfo">
      <!-- 班级信息卡 -->
      <view class="info-card">
        <view class="info-top">
          <text class="info-name">
            {{ classInfo.name }}
          </text>
          <text class="status-tag" :class="`status-${classInfo.status}`">
            {{ statusLabel(classInfo.status) }}
          </text>
        </view>
        <view class="info-row">
          <text v-if="classInfo.teacher_name" class="info-item">
            带班老师：{{ classInfo.teacher_name }}
          </text>
          <text class="info-item">
            {{ periodText(classInfo) }}
          </text>
        </view>
      </view>

      <!-- 作业列表 -->
      <view class="section-title">
        <text>班内作业（{{ assignments.length }}）</text>
      </view>

      <view v-if="assignments.length === 0" class="empty-state">
        <text>老师暂未发布作业，敬请期待</text>
      </view>

      <view v-else class="assignment-list">
        <view
          v-for="item in assignments"
          :key="item.assignment_id"
          class="assignment-card"
          @tap="goSubmit(item.assignment_id)"
        >
          <view class="assign-top">
            <text class="assign-title">
              {{ item.title }}
            </text>
            <text class="my-state" :class="stateClass(item)">
              {{ stateText(item) }}
            </text>
          </view>
          <text v-if="item.content" class="assign-content">
            {{ item.content }}
          </text>
          <view class="assign-meta">
            <text v-if="item.due_at" class="due" :class="{ overdue: isOverdue(item) }">
              {{ isOverdue(item) ? '已截止' : '截止' }} {{ formatDue(item.due_at) }}
            </text>
            <text v-if="item.submitted" class="submitted-at">
              提交于 {{ formatTime(item.submission?.updated_at || item.submission?.created_at) }}
            </text>
          </view>

          <!-- 评审结果回显 -->
          <view v-if="item.submission?.review" class="review-box">
            <view class="review-top">
              <text class="review-score"> {{ item.submission.review.score }} 分 </text>
              <text class="review-grade">
                {{ item.submission.review.grade_label }}
              </text>
            </view>
            <text v-if="item.submission.review.comment" class="review-comment">
              {{ item.submission.review.comment }}
            </text>
          </view>
        </view>
      </view>
    </template>

    <view v-else class="center-tip">
      <text>班级不存在或已不可见</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import {
  getMyTrainingClasses,
  getStudentAssignments,
  type TrainingAssignment,
  type TrainingClassSummary,
} from '../../api/training'
import { useTenantTitle } from '../../composables/useTenantTitle'
import NavBar from '../../components/NavBar.vue'

const classInfo = ref<TrainingClassSummary | null>(null)
const assignments = ref<TrainingAssignment[]>([])
const loading = ref(true)
let classId = ''
let loadedOnce = false

useTenantTitle()

onLoad((options) => {
  classId = String(options?.class_id || '')
  loadAll()
})

// 从提交页返回后刷新状态（提交/覆盖提交会改变待办与回显）
onShow(() => {
  if (loadedOnce) loadAll()
})

async function loadAll() {
  if (!classId) {
    uni.showToast({ title: '参数错误', icon: 'none' })
    loading.value = false
    return
  }
  loading.value = true
  try {
    const [classes, list] = await Promise.all([
      getMyTrainingClasses(),
      getStudentAssignments({ class_id: Number(classId) }),
    ])
    classInfo.value = (classes ?? []).find((c) => String(c.class_id) === classId) ?? null
    assignments.value = list ?? []
  } catch (e: any) {
    if (e?.message?.includes('未登录')) return // request 层已跳登录
    uni.showToast({ title: e?.message || '加载失败，请稍后再试', icon: 'none' })
  } finally {
    loading.value = false
    loadedOnce = true
  }
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    recruiting: '招生中',
    running: '进行中',
    finished: '已结课',
    planning: '筹备中',
    closed: '已关闭',
  }
  return map[status] || status
}

function periodText(item: TrainingClassSummary): string {
  const start = item.start_date || '—'
  const end = item.end_date || '长期'
  return `${start} ~ ${end}`
}

function stateText(item: TrainingAssignment): string {
  if (!item.submitted) return '未提交'
  if (item.submission?.review) return `已评 ${item.submission.review.score} 分`
  return '已交待评'
}

function stateClass(item: TrainingAssignment): string {
  if (!item.submitted) return 'state-pending'
  if (item.submission?.review) return 'state-done'
  return 'state-submitted'
}

function isOverdue(item: TrainingAssignment): boolean {
  if (!item.due_at) return false
  return new Date(item.due_at.replace(' ', 'T')).getTime() < Date.now()
}

function formatDue(dueAt: string): string {
  return dueAt.slice(0, 16).replace('T', ' ')
}

function formatTime(dateStr?: string | null): string {
  if (!dateStr) return ''
  return dateStr.slice(0, 16).replace('T', ' ')
}

function goSubmit(assignmentId: number) {
  uni.navigateTo({ url: `/pages/training/submit?assignment_id=${assignmentId}` })
}
</script>

<style scoped>
.training-detail-page {
  min-height: 100vh;
  background: #f5f6fa;
  padding-bottom: 40rpx;
}
.center-tip,
.empty-state {
  text-align: center;
  padding-top: 120rpx;
  color: #999;
  font-size: 28rpx;
}
.info-card {
  background: #fff;
  margin: 24rpx;
  padding: 28rpx;
  border-radius: 16rpx;
}
.info-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.info-name {
  font-size: 34rpx;
  font-weight: bold;
  color: #333;
  flex: 1;
  margin-right: 16rpx;
}
.status-tag {
  font-size: 22rpx;
  padding: 6rpx 16rpx;
  border-radius: 24rpx;
  flex-shrink: 0;
}
.status-recruiting {
  background: #e8f3ff;
  color: #1989fa;
}
.status-running {
  background: #e6f7ed;
  color: #07c160;
}
.status-finished {
  background: #f0f0f0;
  color: #999;
}
.info-row {
  margin-top: 16rpx;
  display: flex;
  flex-direction: column;
}
.info-item {
  font-size: 24rpx;
  color: #666;
  margin-top: 8rpx;
}
.section-title {
  margin: 8rpx 24rpx 16rpx;
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}
.assignment-list {
  margin: 0 24rpx;
}
.assignment-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}
.assign-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.assign-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  flex: 1;
  margin-right: 16rpx;
}
.my-state {
  font-size: 22rpx;
  padding: 6rpx 16rpx;
  border-radius: 24rpx;
  flex-shrink: 0;
}
.state-pending {
  background: #fff3e0;
  color: #e65100;
}
.state-submitted {
  background: #e8f3ff;
  color: #1989fa;
}
.state-done {
  background: #e6f7ed;
  color: #07c160;
}
.assign-content {
  font-size: 26rpx;
  color: #666;
  margin-top: 14rpx;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}
.assign-meta {
  display: flex;
  justify-content: space-between;
  margin-top: 14rpx;
  font-size: 22rpx;
  color: #999;
}
.due.overdue {
  color: #e64340;
}
.review-box {
  margin-top: 16rpx;
  background: #f8fafc;
  border-radius: 12rpx;
  padding: 16rpx;
}
.review-top {
  display: flex;
  align-items: center;
}
.review-score {
  font-size: 30rpx;
  font-weight: bold;
  color: #07c160;
}
.review-grade {
  font-size: 22rpx;
  color: #07c160;
  background: #e6f7ed;
  border-radius: 16rpx;
  padding: 4rpx 12rpx;
  margin-left: 12rpx;
}
.review-comment {
  font-size: 24rpx;
  color: #666;
  margin-top: 8rpx;
  display: block;
  line-height: 1.6;
}
</style>
