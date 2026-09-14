<template>
  <view class="practice-page">
    <NavBar title="练习" />

    <view v-if="loading" class="loading-tip">
      <text>出题中...</text>
    </view>

    <view v-for="(q, qi) in questions" :key="q.question_id" class="question-card">
      <view class="q-header">
        <text class="q-index"> {{ qi + 1 }}/{{ questions.length }} </text>
        <text class="q-type">
          {{ typeLabel(q.type) }}
        </text>
      </view>
      <view class="q-content">
        <text>{{ q.content }}</text>
      </view>

      <view v-if="q.type === 'single' || q.type === 'multi'" class="q-options">
        <view
          v-for="(opt, oi) in q.options || []"
          :key="oi"
          class="option-item"
          :class="optionClass(q, oi)"
          @tap="toggleOption(q, oi)"
        >
          <text>{{ String.fromCharCode(65 + oi) }}. {{ opt }}</text>
        </view>
      </view>

      <view v-else-if="q.type === 'judge'" class="q-options">
        <view class="option-item" :class="judgeClass(q, true)" @tap="answers[q.question_id] = true">
          <text>正确</text>
        </view>
        <view
          class="option-item"
          :class="judgeClass(q, false)"
          @tap="answers[q.question_id] = false"
        >
          <text>错误</text>
        </view>
      </view>
    </view>

    <view v-if="!loading && questions.length > 0" class="submit-bar">
      <button class="submit-btn" :disabled="submitting" @tap="handleSubmit">
        {{ submitting ? '判分中...' : '提交判分' }}
      </button>
    </view>

    <view v-if="graded" class="result-tip">
      <text>本次练习：{{ gradeResult?.correct_count }}/{{ gradeResult?.total_count }} 正确</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import NavBar from '../../components/NavBar.vue'
import {
  startPractice,
  gradePractice,
  type PracticeQuestion,
  type PracticeGradeResult,
} from '../../api/exam'

const source = ref<'wrong' | 'bank'>('wrong')
const refId = ref(0)
const questions = ref<PracticeQuestion[]>([])
const answers = reactive<Record<string, unknown>>({})
const loading = ref(true)
const submitting = ref(false)
const graded = ref(false)
const gradeResult = ref<PracticeGradeResult | null>(null)

function typeLabel(t: string) {
  return (
    ({ single: '单选', multi: '多选', judge: '判断', essay: '简答' } as Record<string, string>)[
      t
    ] ?? t
  )
}

function isCorrect(q: PracticeQuestion): boolean {
  const detail = gradeResult.value?.detail.find((d) => d.question_id === q.question_id)
  return !!detail?.correct
}

function optionClass(q: PracticeQuestion, oi: number) {
  const selected =
    q.type === 'single'
      ? answers[q.question_id] === oi
      : Array.isArray(answers[q.question_id]) && (answers[q.question_id] as number[]).includes(oi)
  if (graded.value) {
    // 判分后：正确项绿、错选红
    const correctIdx = Array.isArray(q.answer) ? q.answer.indexOf(oi) : q.answer === oi ? 0 : -1
    if (correctIdx >= 0 || (Number.isInteger(q.answer) && q.answer === oi))
      return 'selected correct'
    if (selected && !isCorrect(q)) return 'selected wrong'
    return ''
  }
  return selected ? 'selected' : ''
}

function judgeClass(q: PracticeQuestion, value: boolean) {
  if (graded.value) {
    if (q.answer === value) return 'selected correct'
    if (answers[q.question_id] === value) return 'selected wrong'
    return ''
  }
  return answers[q.question_id] === value ? 'selected' : ''
}

function toggleOption(q: PracticeQuestion, oi: number) {
  if (graded.value) return
  if (q.type === 'single') {
    answers[q.question_id] = oi
    return
  }
  const current = Array.isArray(answers[q.question_id])
    ? [...(answers[q.question_id] as number[])]
    : []
  const idx = current.indexOf(oi)
  if (idx >= 0) current.splice(idx, 1)
  else current.push(oi)
  answers[q.question_id] = current
}

async function handleSubmit() {
  if (submitting.value) return
  submitting.value = true
  try {
    const payload: Record<string, unknown> = {}
    for (const q of questions.value) {
      if (answers[q.question_id] !== undefined) payload[q.question_id] = answers[q.question_id]
    }
    gradeResult.value = await gradePractice(source.value, refId.value, questions.value, payload)
    graded.value = true
    uni.showToast({
      title: `正确 ${gradeResult.value.correct_count}/${gradeResult.value.total_count}`,
      icon: 'none',
    })
  } catch (e: any) {
    uni.showToast({ title: e.message || '判分失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  const pages = getCurrentPages()
  const current: any = pages[pages.length - 1]
  const options = current?.options ?? current?.$page?.options ?? {}
  source.value = (options.source as 'wrong' | 'bank') ?? 'wrong'
  refId.value = Number(options.ref_id ?? 0)

  try {
    // 练习题集由服务端抽取；为避免前端偷看答案，判分在提交后由服务端返回
    const result = await startPractice(source.value, refId.value, 10)
    questions.value = (result ?? []).map(({ answer, analysis, ...rest }) => {
      // 本地暂存答案供判分后回显，模板不渲染
      ;(rest as any)._answer = answer
      ;(rest as any)._analysis = analysis
      return rest as PracticeQuestion
    })
  } catch (e: any) {
    uni.showToast({ title: e.message || '出题失败', icon: 'none' })
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.practice-page {
  min-height: 100vh;
  background: #f6f7f9;
  padding-bottom: 140rpx;
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
  color: var(--scrm-primary);
  background: #e8f8ef;
  border-radius: 6rpx;
  padding: 2rpx 12rpx;
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
  border-color: var(--scrm-primary);
  background: #f0fff6;
}

.option-item.correct {
  border-color: var(--scrm-primary);
  background: #f0fff6;
}

.option-item.wrong {
  border-color: #fa5151;
  background: #fff1f0;
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
  background: var(--scrm-primary);
  color: #fff;
  font-size: 30rpx;
  border-radius: 44rpx;
}

.result-tip {
  text-align: center;
  color: var(--scrm-primary);
  font-size: 28rpx;
  padding: 20rpx;
}

.loading-tip {
  text-align: center;
  color: #999;
  padding: 60rpx 0;
}
</style>
