<template>
  <view class="exam-detail">
    <NavBar title="答题中" />

    <view v-if="countdownText" class="countdown">
      <text>剩余 {{ countdownText }}</text>
    </view>

    <view v-if="loading" class="loading-tip">
      <text>加载中...</text>
    </view>

    <view v-for="(q, qi) in questions" :key="q.question_id" class="question-card">
      <view class="q-header">
        <text class="q-index"> {{ qi + 1 }}/{{ questions.length }} </text>
        <text class="q-type">
          {{ typeLabel(q.type) }}
        </text>
        <text class="q-score"> {{ q.score }} 分 </text>
      </view>
      <view class="q-content">
        <text>{{ q.content }}</text>
      </view>

      <!-- 单选/多选 -->
      <view v-if="q.type === 'single' || q.type === 'multi'" class="q-options">
        <view
          v-for="(opt, oi) in q.options || []"
          :key="oi"
          class="option-item"
          :class="{ selected: isSelected(q, oi) }"
          @tap="toggleOption(q, oi)"
        >
          <text>{{ String.fromCharCode(65 + oi) }}. {{ opt }}</text>
        </view>
      </view>

      <!-- 判断 -->
      <view v-else-if="q.type === 'judge'" class="q-options">
        <view
          class="option-item"
          :class="{ selected: answers[q.question_id] === true }"
          @tap="answers[q.question_id] = true"
        >
          <text>正确</text>
        </view>
        <view
          class="option-item"
          :class="{ selected: answers[q.question_id] === false }"
          @tap="answers[q.question_id] = false"
        >
          <text>错误</text>
        </view>
      </view>

      <!-- 简答 -->
      <view v-else-if="q.type === 'essay'" class="q-essay">
        <textarea
          class="essay-input"
          :value="(answers[q.question_id] as string) ?? ''"
          placeholder="请输入作答内容"
          @input="(e: any) => (answers[q.question_id] = e.detail.value)"
        />
      </view>
    </view>

    <view v-if="!loading" class="submit-bar">
      <button class="submit-btn" :disabled="submitting" @tap="handleSubmit">
        {{ submitting ? '提交中...' : '交卷' }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import NavBar from '../../components/NavBar.vue'
import { startExam, submitExam, type ExamQuestion } from '../../api/exam'

const examId = ref('')
const recordId = ref('')
const questions = ref<ExamQuestion[]>([])
const answers = reactive<Record<string, unknown>>({})
const loading = ref(true)
const submitting = ref(false)

const timeLimitMinutes = ref(0)
const startedAt = ref(0)
const remainSeconds = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

const countdownText = computed(() => {
  if (timeLimitMinutes.value <= 0) return ''
  const s = remainSeconds.value
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h > 0 ? `${h}时${m}分${sec}秒` : `${m}分${sec}秒`
})

function typeLabel(t: string) {
  return (
    ({ single: '单选', multi: '多选', judge: '判断', essay: '简答' } as Record<string, string>)[
      t
    ] ?? t
  )
}

function isSelected(q: ExamQuestion, optionIndex: number) {
  const a = answers[q.question_id]
  if (q.type === 'single') return a === optionIndex
  return Array.isArray(a) && (a as number[]).includes(optionIndex)
}

function toggleOption(q: ExamQuestion, optionIndex: number) {
  if (q.type === 'single') {
    answers[q.question_id] = optionIndex
    return
  }
  const current = Array.isArray(answers[q.question_id])
    ? [...(answers[q.question_id] as number[])]
    : []
  const idx = current.indexOf(optionIndex)
  if (idx >= 0) current.splice(idx, 1)
  else current.push(optionIndex)
  answers[q.question_id] = current
}

function startCountdown() {
  if (timeLimitMinutes.value <= 0) return
  remainSeconds.value =
    timeLimitMinutes.value * 60 - Math.floor((Date.now() - startedAt.value) / 1000)
  timer = setInterval(() => {
    remainSeconds.value -= 1
    if (remainSeconds.value <= 0) {
      remainSeconds.value = 0
      if (timer) clearInterval(timer)
      uni.showToast({ title: '时间到，自动交卷', icon: 'none' })
      handleSubmit()
    }
  }, 1000)
}

async function handleSubmit() {
  if (submitting.value) return
  submitting.value = true
  try {
    // 简答题支持文本；其余题型按答题值提交
    const payload: Record<string, unknown> = {}
    for (const q of questions.value) {
      const a = answers[q.question_id]
      if (q.type === 'essay') {
        payload[q.question_id] = a == null ? null : String(a)
      } else if (a !== undefined) {
        payload[q.question_id] = a
      }
    }
    const result = await submitExam(recordId.value, payload)
    if (timer) clearInterval(timer)
    uni.redirectTo({
      url: `/pages/exam/result?record_id=${result.record_id}&total=${result.total_score}&passed=${result.passed ? 1 : 0}&status=${result.status}`,
    })
  } catch (e: any) {
    uni.showToast({ title: e.message || '提交失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  const pages = getCurrentPages()
  const current: any = pages[pages.length - 1]
  examId.value = current?.options?.exam_id ?? current?.$page?.options?.exam_id ?? ''
  try {
    // 断线重进：start 幂等复用 in_progress 答卷
    const result = await startExam(examId.value)
    recordId.value = String(result.record_id)
    questions.value = result.questions ?? []
    timeLimitMinutes.value = Number(current?.options?.time_limit ?? 0)
    startedAt.value = Date.now()
    startCountdown()
  } catch (e: any) {
    uni.showToast({ title: e.message || '开考失败', icon: 'none' })
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.exam-detail {
  min-height: 100vh;
  background: #f6f7f9;
  padding-bottom: 140rpx;
}

.countdown {
  position: sticky;
  top: 0;
  z-index: 10;
  text-align: center;
  padding: 14rpx;
  background: #fff7e6;
  color: #fa8c16;
  font-size: 26rpx;
}

.question-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 28rpx;
  margin: 20rpx;
}

.q-header {
  display: flex;
  gap: 16rpx;
  align-items: center;
  margin-bottom: 14rpx;
}

.q-index {
  font-size: 24rpx;
  color: #999;
}

.q-type {
  font-size: 22rpx;
  color: #07c160;
  background: #e8f8ef;
  border-radius: 6rpx;
  padding: 2rpx 12rpx;
}

.q-score {
  font-size: 22rpx;
  color: #999;
  margin-left: auto;
}

.q-content {
  font-size: 30rpx;
  line-height: 1.6;
  margin-bottom: 20rpx;
}

.q-options {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.option-item {
  border: 2rpx solid #e5e6eb;
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 28rpx;
}

.option-item.selected {
  border-color: #07c160;
  background: #f0fff6;
}

.essay-input {
  width: 100%;
  min-height: 200rpx;
  background: #f7f8fa;
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.submit-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 30rpx;
  background: #fff;
  box-shadow: 0 -4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.submit-btn {
  background: #07c160;
  color: #fff;
  font-size: 30rpx;
  border-radius: 44rpx;
}

.loading-tip {
  text-align: center;
  color: #999;
  padding: 60rpx 0;
}
</style>
