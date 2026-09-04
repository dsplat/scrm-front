<template>
  <view class="training-page">
    <NavBar title="我的班级" />

    <view v-if="loading" class="center-tip">
      <text>加载中...</text>
    </view>

    <template v-else>
      <!-- 空态引导 -->
      <view v-if="classes.length === 0" class="empty-state">
        <text class="empty-icon"> 🏫 </text>
        <text class="empty-title"> 还没有加入任何班级 </text>
        <text class="empty-desc"> 老师邀请分班后，可在这里查看作业与提交作品 </text>
      </view>

      <!-- 班级卡片列表 -->
      <view v-else class="class-list">
        <view
          v-for="item in classes"
          :key="item.class_id"
          class="class-card"
          @tap="goDetail(item.class_id)"
        >
          <view class="card-top">
            <text class="class-name">
              {{ item.name }}
            </text>
            <text class="status-tag" :class="`status-${item.status}`">
              {{ statusLabel(item.status) }}
            </text>
          </view>
          <text v-if="item.teacher_name" class="class-teacher">
            带班老师：{{ item.teacher_name }}
          </text>
          <text class="class-period">
            {{ periodText(item) }}
          </text>

          <!-- 作业进度 -->
          <view v-if="item.assignment_count > 0" class="progress-row">
            <view class="progress-track">
              <view class="progress-fill" :style="{ width: progressPercent(item) + '%' }" />
            </view>
            <text class="progress-text">
              已交 {{ item.submitted_count }}/{{ item.assignment_count }}
            </text>
          </view>
          <view v-else class="no-assignment">
            <text>暂无已发布作业</text>
          </view>

          <view v-if="item.pending_assignment_count > 0" class="pending-badge">
            <text>{{ item.pending_assignment_count }} 项作业待提交</text>
          </view>
          <view v-else-if="item.assignment_count > 0" class="done-badge">
            <text>作业已全部提交 ✓</text>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { isLoggedIn } from '../../api/auth'
import { getMyTrainingClasses, type TrainingClassSummary } from '../../api/training'
import { useTenantTitle } from '../../composables/useTenantTitle'
import NavBar from '../../components/NavBar.vue'

const classes = ref<TrainingClassSummary[]>([])
const loading = ref(true)

useTenantTitle()

onShow(async () => {
  // 未登录直接引导去登录页（后端 401 也会自动跳转，这里提前拦截避免白屏闪动）
  if (!isLoggedIn()) {
    uni.reLaunch({ url: '/pages/auth/login' })
    return
  }
  loading.value = true
  try {
    classes.value = (await getMyTrainingClasses()) ?? []
  } catch (e: any) {
    uni.showToast({ title: e?.message || '加载失败，请稍后再试', icon: 'none' })
  } finally {
    loading.value = false
  }
})

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

function progressPercent(item: TrainingClassSummary): number {
  if (item.assignment_count <= 0) return 0
  return Math.min(100, Math.round((item.submitted_count / item.assignment_count) * 100))
}

function goDetail(classId: number) {
  uni.navigateTo({ url: `/pages/training/detail?class_id=${classId}` })
}
</script>

<style scoped>
.training-page {
  min-height: 100vh;
  background: #f5f6fa;
  padding-bottom: 40rpx;
}
.center-tip,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 160rpx;
  color: #999;
}
.empty-icon {
  font-size: 88rpx;
  margin-bottom: 24rpx;
}
.empty-title {
  font-size: 30rpx;
  color: #333;
  font-weight: bold;
}
.empty-desc {
  font-size: 26rpx;
  margin-top: 12rpx;
  text-align: center;
  line-height: 1.6;
}
.class-list {
  padding: 24rpx;
}
.class-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
  position: relative;
}
.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.class-name {
  font-size: 32rpx;
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
.status-planning {
  background: #fff7e6;
  color: #fa8c16;
}
.status-closed {
  background: #f0f0f0;
  color: #999;
}
.class-teacher,
.class-period {
  font-size: 24rpx;
  color: #666;
  display: block;
  margin-top: 12rpx;
}
.progress-row {
  display: flex;
  align-items: center;
  margin-top: 20rpx;
}
.progress-track {
  flex: 1;
  height: 12rpx;
  background: #f0f2f5;
  border-radius: 8rpx;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #07c160, #34d37a);
  border-radius: 8rpx;
}
.progress-text {
  font-size: 22rpx;
  color: #999;
  margin-left: 16rpx;
  flex-shrink: 0;
}
.no-assignment {
  margin-top: 20rpx;
  font-size: 24rpx;
  color: #bbb;
}
.pending-badge {
  margin-top: 20rpx;
  background: #fff3e0;
  color: #e65100;
  font-size: 24rpx;
  padding: 12rpx 20rpx;
  border-radius: 12rpx;
}
.done-badge {
  margin-top: 20rpx;
  background: #e6f7ed;
  color: #07c160;
  font-size: 24rpx;
  padding: 12rpx 20rpx;
  border-radius: 12rpx;
}
</style>
