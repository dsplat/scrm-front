<template>
  <view class="exam-page">
    <NavBar title="考试" />

    <view class="section">
      <view class="section-title">
        <text>可参加的考试</text>
      </view>
      <view v-if="loading" class="loading-tip">
        <text>加载中...</text>
      </view>
      <ErrorState v-else-if="loadError" message="考试列表加载失败，请稍后重试" @retry="load" />
      <view v-else-if="exams.length === 0" class="empty-tip">
        <text>暂无进行中的考试</text>
      </view>
      <view v-for="exam in exams" :key="exam.exam_id" class="exam-card" @tap="goDetail(exam)">
        <view class="exam-title">
          <text>{{ exam.title }}</text>
        </view>
        <view class="exam-meta">
          <text>满分 {{ exam.total_score }} · 及格 {{ exam.pass_score }}</text>
          <text v-if="exam.time_limit_minutes > 0">
            · 限时 {{ exam.time_limit_minutes }} 分钟
          </text>
          <text> · 可考 {{ exam.retry_limit }} 次</text>
        </view>
        <view class="exam-action">
          <text class="action-btn"> 开始考试 </text>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-title">
        <text>我的成绩</text>
      </view>
      <view v-if="!loggedIn" class="login-tip">
        <text>登录后查看我的成绩</text>
        <text class="go-login" @tap="goLogin"> 去登录 </text>
      </view>
      <view v-else-if="records.taken === 0" class="empty-tip">
        <text>暂无考试记录</text>
      </view>
      <view v-for="(r, i) in records.records" :key="i" class="record-item">
        <view class="record-left">
          <text class="record-title"> 考试 #{{ r.exam_id }} · 第 {{ r.attempt }} 次 </text>
          <text class="record-time">
            {{ r.submitted_at || '未提交' }}
          </text>
        </view>
        <text class="record-score" :class="r.passed ? 'pass' : 'fail'">
          {{ r.total_score }}{{ r.passed ? ' 通过' : '' }}
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import NavBar from '../../components/NavBar.vue'
import ErrorState from '../../components/ErrorState.vue'
import { ensureLogin } from '../../utils/auth-guard'
import { redirectToLogin } from '../../utils/request'
import { isLoggedIn } from '../../api/auth'
import {
  getExams,
  getMyExamRecords,
  type ExamSummary,
  type ExamRecordSummary,
} from '../../api/exam'

const exams = ref<ExamSummary[]>([])
const records = ref<{ taken: number; passed: number; records: ExamRecordSummary[] }>({
  taken: 0,
  passed: 0,
  records: [],
})
const loading = ref(true)
// 加载失败与空数据区分展示：失败给 ErrorState（重试/返回出口）
const loadError = ref(false)
const loggedIn = computed(() => isLoggedIn())

async function load() {
  loading.value = true
  loadError.value = false
  try {
    exams.value = (await getExams()) ?? []
  } catch {
    exams.value = []
    loadError.value = true
  } finally {
    loading.value = false
  }
  // 成绩为登录态数据（required 接口）：仅已登录时拉取，避免游客 401 强跳
  if (isLoggedIn()) {
    try {
      records.value = await getMyExamRecords()
    } catch {
      // 成绩拉取失败不阻断考试列表浏览
    }
  }
}

async function goDetail(exam: ExamSummary) {
  // 考试为登录态操作（答题记录以用户身份落库）：未登录先引导（登录后回跳本页）
  if (!(await ensureLogin('参加考试需登录后进行'))) return
  uni.navigateTo({
    url: `/pages/exam/detail?exam_id=${exam.exam_id}&time_limit=${exam.time_limit_minutes}`,
  })
}

function goLogin() {
  redirectToLogin()
}

onMounted(load)
</script>

<style scoped>
.exam-page {
  min-height: 100vh;
  background: #f6f7f9;
  padding-bottom: 40rpx;
}

.section {
  margin: 20rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  margin-bottom: 16rpx;
}

.exam-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
}

.exam-title {
  font-size: 32rpx;
  font-weight: 600;
}

.exam-meta {
  font-size: 24rpx;
  color: #999;
  margin: 12rpx 0;
}

.exam-action {
  display: flex;
  justify-content: flex-end;
}

.action-btn {
  font-size: 26rpx;
  color: var(--scrm-primary);
  font-weight: 600;
}

.record-item {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 14rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.record-title {
  font-size: 28rpx;
  display: block;
}

.record-time {
  font-size: 22rpx;
  color: #999;
}

.record-score.pass {
  color: var(--scrm-primary);
}

.record-score.fail {
  color: #fa5151;
}

.loading-tip,
.empty-tip {
  text-align: center;
  color: #999;
  font-size: 26rpx;
  padding: 40rpx 0;
}

.login-tip {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16rpx;
  color: #999;
  font-size: 26rpx;
  padding: 40rpx 0;
}

.go-login {
  color: var(--scrm-primary);
  font-weight: 600;
}
</style>
