<template>
  <view class="wrong-page">
    <NavBar title="错题本" />

    <view class="section">
      <view v-if="loading" class="loading-tip">
        <text>加载中...</text>
      </view>
      <view v-else-if="questions.length === 0" class="empty-tip">
        <text>暂无错题，继续加油！</text>
      </view>

      <view v-for="(q, i) in questions" :key="q.question_id" class="question-card">
        <view class="q-header">
          <text class="q-index">
            {{ i + 1 }}
          </text>
          <text class="q-type">
            {{ typeLabel(q.type) }}
          </text>
          <text class="q-score"> {{ q.score }} 分 </text>
        </view>
        <view class="q-content">
          <text>{{ q.content }}</text>
        </view>
        <view v-if="q.analysis" class="q-analysis">
          <text>解析：{{ q.analysis }}</text>
        </view>
      </view>
    </view>

    <view v-if="questions.length > 0" class="submit-bar">
      <button class="submit-btn" @tap="startWrongPractice">错题重练（抽 10 题）</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import NavBar from '../../components/NavBar.vue'
import { getWrongQuestions, type PracticeQuestion } from '../../api/exam'

const questions = ref<PracticeQuestion[]>([])
const loading = ref(true)

function typeLabel(t: string) {
  return (
    ({ single: '单选', multi: '多选', judge: '判断', essay: '简答' } as Record<string, string>)[
      t
    ] ?? t
  )
}

function startWrongPractice() {
  uni.navigateTo({ url: '/pages/practice/practice?source=wrong' })
}

onMounted(async () => {
  try {
    questions.value = (await getWrongQuestions()) ?? []
  } catch (e: any) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.wrong-page {
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
  font-size: 26rpx;
  color: #999;
}

.q-type {
  font-size: 22rpx;
  color: #ff976a;
  background: #fff7f0;
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
}

.q-analysis {
  margin-top: 16rpx;
  font-size: 26rpx;
  color: #999;
  background: #f7f8fa;
  border-radius: 10rpx;
  padding: 16rpx;
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

.loading-tip,
.empty-tip {
  text-align: center;
  color: #999;
  padding: 60rpx 0;
}
</style>
