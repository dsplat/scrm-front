<template>
  <view class="result-page">
    <NavBar title="考试结果" />

    <view class="result-card">
      <view class="result-score" :class="passed ? 'pass' : 'fail'">
        <text class="score-num">
          {{ total }}
        </text>
        <text class="score-label"> 分 </text>
      </view>
      <view class="result-text">
        <text>{{ statusText }}</text>
      </view>
    </view>

    <view class="actions">
      <button class="btn primary" @tap="goExams">返回考试列表</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import NavBar from '../../components/NavBar.vue'

const total = ref(0)
const passed = ref(false)
const status = ref('')

const statusText = computed(() => {
  if (status.value === 'submitted') {
    return '已提交，含简答题待人工批改，批改后出最终成绩'
  }
  return passed.value ? '恭喜，考试通过！' : '很遗憾，未达及格线'
})

function goExams() {
  uni.redirectTo({ url: '/pages/exam/index' })
}

// onLoad 参数解析（uni-app h5 场景）
const pages = getCurrentPages()
const current: any = pages[pages.length - 1]
const options = current?.options ?? current?.$page?.options ?? {}
total.value = Number(options.total ?? 0)
passed.value = options.passed === '1'
status.value = String(options.status ?? '')
</script>

<style scoped>
.result-page {
  min-height: 100vh;
  background: #f6f7f9;
}

.result-card {
  background: #fff;
  border-radius: 20rpx;
  margin: 60rpx 30rpx;
  padding: 70rpx 40rpx;
  text-align: center;
}

.result-score {
  margin-bottom: 24rpx;
}

.score-num {
  font-size: 96rpx;
  font-weight: 700;
}

.result-score.pass .score-num {
  color: #07c160;
}

.result-score.fail .score-num {
  color: #fa5151;
}

.score-label {
  font-size: 32rpx;
  margin-left: 8rpx;
  color: #666;
}

.result-text {
  font-size: 30rpx;
  color: #333;
}

.actions {
  margin: 0 30rpx;
}

.btn {
  border-radius: 44rpx;
  font-size: 30rpx;
}

.btn.primary {
  background: #07c160;
  color: #fff;
}
</style>
