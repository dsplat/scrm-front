<template>
  <view class="self-service-page">
    <NavBar title="客服中心" :show-back="false" />
    <view class="section">
      <text class="section-title"> 常见问题 </text>
      <view v-for="faq in faqs" :key="faq.id" class="faq-item" @tap="toggleFaq(faq.id)">
        <text class="faq-q">
          {{ faq.question }}
        </text>
        <text v-if="faq.open" class="faq-a">
          {{ faq.answer }}
        </text>
      </view>
      <view v-if="faqs.length === 0 && !loading" class="empty">
        <text>暂无常见问题</text>
      </view>
    </view>
    <view class="section">
      <text class="section-title"> 在线客服 </text>
      <button @tap="contactAgent">联系 AI 客服</button>
    </view>
    <view class="section">
      <text class="section-title"> 意见反馈 </text>
      <textarea v-model="feedback" placeholder="请输入您的意见..." />
      <button :disabled="submitting || !feedback.trim()" @tap="handleSubmitFeedback">
        {{ submitting ? '提交中...' : '提交反馈' }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getFAQs, submitFeedback, startAgentConversation } from '../../api/scrm'
import { useTenantTitle } from '../../composables/useTenantTitle'
import NavBar from '../../components/NavBar.vue'

interface FAQ {
  id: number
  question: string
  answer: string
  open: boolean
}

const feedback = ref('')
const submitting = ref(false)
const loading = ref(true)
const faqs = ref<FAQ[]>([])

// 微信原生栏标题统一为租户名
useTenantTitle()

onMounted(async () => {
  try {
    const data = await getFAQs()
    faqs.value = (Array.isArray(data) ? data : []).map((f: any) => ({
      id: f.id,
      question: f.question,
      answer: f.answer,
      open: false,
    }))
  } catch {
    // Fallback to static FAQs if API unavailable
    faqs.value = [
      {
        id: 1,
        question: '如何退换货？',
        answer: '7天内无理由退换货，请联系客服处理。',
        open: false,
      },
      { id: 2, question: '物流时效？', answer: '通常1-3个工作日送达。', open: false },
      { id: 3, question: '如何积分兑换？', answer: '在个人中心-积分商城进行兑换。', open: false },
    ]
  } finally {
    loading.value = false
  }
})

function toggleFaq(id: number) {
  const faq = faqs.value.find((f) => f.id === id)
  if (faq) faq.open = !faq.open
}

async function contactAgent() {
  try {
    // @ts-ignore - uni is provided by uni-app runtime
    uni.showLoading({ title: '连接客服中...' })
    await startAgentConversation(1, '您好，我需要帮助')
    // @ts-ignore
    uni.hideLoading()
    // @ts-ignore
    uni.showToast({ title: '客服已连接', icon: 'success' })
  } catch {
    // @ts-ignore
    uni.hideLoading()
    // @ts-ignore
    uni.showToast({ title: '连接失败，请稍后再试', icon: 'none' })
  }
}

async function handleSubmitFeedback() {
  if (!feedback.value.trim()) return
  submitting.value = true
  try {
    await submitFeedback(feedback.value)
    // @ts-ignore
    uni.showToast({ title: '反馈已提交', icon: 'success' })
    feedback.value = ''
  } catch {
    // @ts-ignore
    uni.showToast({ title: '提交失败，请稍后再试', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.self-service-page {
  padding: 20rpx;
}
.section {
  background: #fff;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}
.section-title {
  font-size: 30rpx;
  font-weight: bold;
  display: block;
  margin-bottom: 16rpx;
}
.faq-item {
  padding: 16rpx 0;
  border-bottom: 1px solid #f0f0f0;
}
.faq-q {
  font-size: 28rpx;
  display: block;
}
.faq-a {
  font-size: 26rpx;
  color: #666;
  display: block;
  margin-top: 8rpx;
}
.empty {
  text-align: center;
  padding: 40rpx;
  color: #999;
  font-size: 26rpx;
}
textarea {
  width: 100%;
  height: 150rpx;
  border: 1px solid #e0e0e0;
  border-radius: 8rpx;
  padding: 16rpx;
}
button {
  margin-top: 16rpx;
}
</style>
