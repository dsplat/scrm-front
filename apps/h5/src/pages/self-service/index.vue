<template>
  <view class="self-service-page">
    <NavBar title="客服中心" :show-back="false" />
    <view v-if="aiAvailable" class="section ai-section">
      <view class="ai-head">
        <text class="section-title"> AI 助手 </text>
        <text v-if="messages.length > 0" class="ai-reset" @tap="startNewChat"> 新对话 </text>
      </view>
      <view v-if="messages.length === 0" class="chat-empty">
        <text>你好，我可以帮你查订单、找课程、答疑错题、介绍活动…</text>
      </view>
      <ChatMessage v-for="m in messages" :key="m.id" :message="m" />
      <view class="chat-input">
        <input
          v-model="draft"
          class="chat-input__field"
          type="text"
          placeholder="输入你的问题…"
          :disabled="streaming"
          confirm-type="send"
          @confirm="handleSend"
        />
        <button class="chat-input__btn" :disabled="streaming || !draft.trim()" @tap="handleSend">
          {{ streaming ? '回答中' : '发送' }}
        </button>
      </view>
    </view>
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
import { ref, computed, onMounted } from 'vue'
import { getFAQs, submitFeedback, startAgentConversation } from '../../api/scrm'
import { ensureLogin } from '../../utils/auth-guard'
import { useTenantTitle } from '../../composables/useTenantTitle'
import { useAssistantStream, usePageContext, useAvailability, assistantStore } from '@scrm/h5-ai'
import NavBar from '../../components/NavBar.vue'
import ChatMessage from '../../components/ai-assistant/ChatMessage.vue'

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

// ── AI 助手（BL-030b：复用 @scrm/h5-ai，走 Node /ai-stream/chat，零新建后端） ──
const { send } = useAssistantStream()
const { pageContext } = usePageContext()
const { check: checkAvailability } = useAvailability()
const aiAvailable = ref(false)
const draft = ref('')
const streaming = computed(() => assistantStore.streaming.value)
const messages = computed(() => assistantStore.messages.value)

async function handleSend() {
  const text = draft.value.trim()
  if (!text || streaming.value) return
  // AI 会话以登录身份创建（Bearer user_token）：未登录先引导
  if (!(await ensureLogin('使用 AI 助手需先登录'))) return
  draft.value = ''
  await send(pageContext(), text)
}

function startNewChat() {
  assistantStore.reset()
}

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
  // 平台级秘书开关（fail-open：探测失败仍显示，工具级细节由服务端 audience 过滤兜底）
  aiAvailable.value = await checkAvailability()
})

function toggleFaq(id: number) {
  const faq = faqs.value.find((f) => f.id === id)
  if (faq) faq.open = !faq.open
}

async function contactAgent() {
  // AI 客服会话以登录身份创建：未登录先引导（FAQ/反馈均匿名可用）
  if (!(await ensureLogin('联系客服需登录后进行'))) return
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
.ai-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.ai-reset {
  font-size: 24rpx;
  color: #4a90d9;
}
.chat-empty {
  padding: 24rpx 0;
  font-size: 26rpx;
  color: #999;
}
.chat-input {
  display: flex;
  align-items: center;
  margin-top: 20rpx;
}
.chat-input__field {
  flex: 1;
  height: 72rpx;
  border: 1px solid #e0e0e0;
  border-radius: 36rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
}
.chat-input__btn {
  margin-top: 0;
  margin-left: 16rpx;
  height: 72rpx;
  line-height: 72rpx;
  padding: 0 32rpx;
  font-size: 28rpx;
  background: #4a90d9;
  color: #fff;
  border-radius: 36rpx;
}
</style>
