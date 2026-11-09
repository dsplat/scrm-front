<template>
  <view class="self-service-page">
    <NavBar title="客服中心" />
    <view class="section ai-entry">
      <view class="ai-entry__icon"> AI </view>
      <view class="ai-entry__body">
        <text class="section-title"> 智能小秘书 </text>
        <text class="section-desc"> 课程、活动与常见问题，进入小秘书工作台可直接提问。 </text>
      </view>
      <button class="ai-entry__button" @tap="openSecretary">打开小秘书</button>
    </view>
    <view v-if="recommendations.length > 0" class="section">
      <text class="section-title"> 为你推荐 </text>
      <view v-for="(card, i) in recommendations" :key="i" class="rec-card" @tap="openCard(card)">
        <text class="rec-badge" :class="'rec-badge--' + card.type">
          {{ recTypeLabel[card.type] }}
        </text>
        <view class="rec-body">
          <text class="rec-title">
            {{ card.title }}
          </text>
          <text v-if="card.subtitle" class="rec-sub">
            {{ card.subtitle }}
          </text>
        </view>
        <text class="rec-arrow"> › </text>
      </view>
    </view>
    <view v-if="faqs.length > 0" class="section">
      <text class="section-title"> 常见问题 </text>
      <view v-for="faq in faqs" :key="faq.id" class="faq-item" @tap="toggleFaq(faq.id)">
        <view class="faq-row">
          <text class="faq-q">
            {{ faq.question }}
          </text>
          <text class="faq-arrow">
            {{ faq.open ? '▴' : '▾' }}
          </text>
        </view>
        <text v-if="faq.open" class="faq-a">
          {{ faq.answer }}
        </text>
      </view>
    </view>
    <view class="section">
      <text class="section-title"> 意见反馈 </text>
      <textarea v-model="feedback" placeholder="请输入您的意见..." />
      <button
        class="btn-primary"
        :disabled="submitting || !feedback.trim()"
        @tap="handleSubmitFeedback"
      >
        {{ submitting ? '提交中...' : '提交反馈' }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getFAQs, submitFeedback, getRecommendations } from '../../api/scrm'
import type { RecommendationCard } from '../../api/scrm'
import { ensureLogin } from '../../utils/auth-guard'
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
const faqs = ref<FAQ[]>([])

// ── 智能推荐卡片（BL-030b b4：后端三源聚合，action_url 为服务端设计时预设） ──
const recommendations = ref<RecommendationCard[]>([])
const recTypeLabel: Record<RecommendationCard['type'], string> = {
  coupon: '券',
  activity: '活动',
  message: '消息',
}

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
    // 拉取失败就空着并隐藏该板块：不塞购物类假问答，避免与租户业务无关的占位内容出现在页面上
    faqs.value = []
  }
  // 智能推荐（optional：登录出个性化券/会话，游客仅公开活动；失败静默不阻塞页面）
  try {
    recommendations.value = await getRecommendations()
  } catch {
    recommendations.value = []
  }
})

function openCard(card: RecommendationCard) {
  // 跳转目标由服务端 action_url 预设；message 卡指向本页（tabBar），不重复导航
  if (card.type === 'message') return
  // @ts-ignore - uni is provided by uni-app runtime
  uni.navigateTo({ url: card.action_url })
}

function toggleFaq(id: number) {
  const faq = faqs.value.find((f) => f.id === id)
  if (faq) faq.open = !faq.open
}

async function openSecretary() {
  if (!(await ensureLogin('使用小秘书需先登录'))) return
  uni.navigateTo({ url: '/pages/secretary/index' })
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
  min-height: 100vh;
  box-sizing: border-box;
  padding: 20rpx 24rpx 40rpx;
  background: var(--scrm-page-bg, #f4f5f7);
}
.section {
  background: var(--scrm-card-bg, #fff);
  border-radius: 20rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(17, 24, 39, 0.04);
}
.section-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2329;
  margin-bottom: 20rpx;
}
.ai-entry {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.ai-entry__icon {
  flex-shrink: 0;
  width: 72rpx;
  height: 72rpx;
  border-radius: 22rpx;
  background: var(--scrm-primary-soft);
  color: var(--scrm-primary);
  font-size: 26rpx;
  font-weight: 600;
  line-height: 72rpx;
  text-align: center;
}
.ai-entry__body {
  flex: 1;
  min-width: 0;
}
.ai-entry__body .section-title {
  margin-bottom: 8rpx;
}
.section-desc {
  display: block;
  color: var(--scrm-text-secondary, #6b7280);
  font-size: 24rpx;
  line-height: 1.5;
}
.ai-entry__button {
  flex-shrink: 0;
  margin: 0;
  padding: 0 24rpx;
  border-radius: 32rpx;
  background: var(--scrm-primary);
  color: #fff;
  font-size: 24rpx;
  line-height: 64rpx;
}
.ai-entry__button::after {
  border: none;
}
.faq-item {
  padding: 22rpx 0;
  border-bottom: 1rpx solid #f2f3f5;
}
.faq-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}
.faq-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.faq-q {
  flex: 1;
  font-size: 26rpx;
  color: #1f2329;
}
.faq-arrow {
  flex-shrink: 0;
  font-size: 20rpx;
  color: #c0c4cc;
  margin-left: 16rpx;
}
.faq-a {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: #6b7280;
}
textarea {
  width: 100%;
  height: 180rpx;
  box-sizing: border-box;
  padding: 20rpx;
  border: 1rpx solid #ebedf0;
  border-radius: 12rpx;
  background: #f7f8fa;
  font-size: 26rpx;
}
.btn-primary {
  margin-top: 20rpx;
  height: 84rpx;
  line-height: 84rpx;
  font-size: 28rpx;
  color: #fff;
  background: var(--scrm-primary);
  border: none;
  border-radius: 42rpx;
}
.rec-card {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f2f3f5;
}
.rec-card:last-child {
  border-bottom: none;
}
.rec-badge {
  flex-shrink: 0;
  width: 64rpx;
  height: 64rpx;
  line-height: 64rpx;
  text-align: center;
  border-radius: 16rpx;
  font-size: 22rpx;
  color: #fff;
  margin-right: 20rpx;
}
.rec-badge--coupon {
  background: #ff6b6b;
}
.rec-badge--activity {
  background: var(--scrm-primary);
}
.rec-badge--message {
  background: var(--scrm-primary);
}
.rec-body {
  flex: 1;
  min-width: 0;
}
.rec-title {
  font-size: 26rpx;
  color: #1f2329;
  display: block;
}
.rec-sub {
  font-size: 22rpx;
  color: #8a9099;
  display: block;
  margin-top: 6rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rec-arrow {
  flex-shrink: 0;
  font-size: 36rpx;
  color: #c0c4cc;
  margin-left: 12rpx;
}
</style>
