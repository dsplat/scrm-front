<template>
  <view class="self-service-page">
    <NavBar title="客服中心" :show-back="false" />
    <view v-if="aiAvailable" class="section ai-section">
      <view class="ai-head">
        <text class="section-title"> AI 助手 </text>
        <text v-if="messages.length > 0" class="ai-reset" @tap="startNewChat"> 新对话 </text>
      </view>
      <view v-if="messages.length === 0" class="chat-empty">
        <text>你好，我可以帮你答疑常见问题、介绍课程与活动、解答售后政策…</text>
      </view>
      <ChatMessage v-for="m in messages" :key="m.id" :message="m" />
      <view class="chat-input">
        <input
          v-model="draft"
          class="chat-input__field"
          type="text"
          placeholder="输入你的问题…"
          :disabled="answering"
          confirm-type="send"
          @confirm="handleSend"
        />
        <button class="chat-input__btn" :disabled="answering || !draft.trim()" @tap="handleSend">
          {{ answering ? '回答中' : '发送' }}
        </button>
      </view>
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
import { ref, onMounted, onUnmounted } from 'vue'
import { getFAQs, submitFeedback, startAgentConversation, getRecommendations } from '../../api/scrm'
import type { RecommendationCard } from '../../api/scrm'
import { ensureLogin } from '../../utils/auth-guard'
import { useTenantTitle } from '../../composables/useTenantTitle'
import { streamUserAi, type LocalChatMessage, type LocalToolCallState } from '../../api/user-ai'
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

// ── 智能推荐卡片（BL-030b b4：后端三源聚合，action_url 为服务端设计时预设） ──
const recommendations = ref<RecommendationCard[]>([])
const recTypeLabel: Record<RecommendationCard['type'], string> = {
  coupon: '券',
  activity: '活动',
  message: '消息',
}

// 微信原生栏标题统一为租户名
useTenantTitle()

// ── AI 助手（Fork A：收敛到框架 UserAi 基座；H5 经 Node SSE 流式 /ai-stream/chat（scope=user），mp 仍同步 /user-ai/ask）──
// anonymous + 知识库白名单，能力锁死、限流硬控；流式逐字打字机，工具面仍仅 knowledge_search（BL-030e）。
const aiAvailable = ref(true)
const draft = ref('')
const answering = ref(false)
const messages = ref<LocalChatMessage[]>([])
let msgSeq = 0
let activeController: AbortController | null = null

/**
 * 按 toolCallId 记账单个工具（`max_tool_calls` > 1 时同轮多个，不互相覆盖），
 * 并刷新 `toolStatus` 聚合投影（供既有单行模板消费；逐工具态见 ChatMessage 的 tools 列表）。
 */
function upsertTool(
  msg: LocalChatMessage,
  patch: { id: string; name?: string; status: LocalToolCallState['status'] },
) {
  const tools = (msg.tools ??= [])
  const target = tools.find((t) => t.id === patch.id)
  if (target) {
    if (patch.name) target.name = patch.name
    target.status = patch.status
  } else {
    tools.push({ id: patch.id, name: patch.name || '工具', status: patch.status })
  }
  msg.toolName = tools[tools.length - 1].name
  syncToolStatus(msg)
}

/** tools 的聚合投影：任一 running 则 running，否则任一 error 则 error，否则 done */
function syncToolStatus(msg: LocalChatMessage) {
  if (!msg.tools?.length) return
  if (msg.tools.some((t) => t.status === 'running')) msg.toolStatus = 'running'
  else if (msg.tools.some((t) => t.status === 'error')) msg.toolStatus = 'error'
  else msg.toolStatus = 'done'
}

/** 流已终结但工具未收到结果帧（连接被截断等）：按失败收敛，不停在 running */
function settleRunningTools(msg: LocalChatMessage) {
  for (const tool of msg.tools ?? []) {
    if (tool.status === 'running') tool.status = 'error'
  }
  syncToolStatus(msg)
}

async function handleSend() {
  const text = draft.value.trim()
  if (!text || answering.value) return
  draft.value = ''
  messages.value.push({ id: ++msgSeq, role: 'user', content: text })
  messages.value.push({ id: ++msgSeq, role: 'assistant', content: '', streaming: true })
  // 取数组内的响应式代理引用再变更（直接改 push 前的 raw 对象不触发更新）
  const pending = messages.value[messages.value.length - 1]
  answering.value = true
  const controller = new AbortController()
  activeController = controller
  try {
    // 多轮历史为 pending 之前的既有消息；H5 逐字流式、非 H5 由 api 层内部回退同步整包
    const history = messages.value.slice(0, messages.value.length - 2)
    await streamUserAi(
      text,
      (chunk) => {
        pending.content += chunk
      },
      {
        history,
        signal: controller.signal,
        onToolCall: (toolName, toolCallId) => {
          upsertTool(pending, { id: toolCallId, name: toolName, status: 'running' })
        },
        onToolResult: (id, result) => {
          const failed = !!result && typeof result === 'object' && 'error' in result
          upsertTool(pending, { id, status: failed ? 'error' : 'done' })
        },
      },
    )
    settleRunningTools(pending)
    if (!pending.content) pending.content = '抱歉，暂时无法回答这个问题。'
  } catch (error: any) {
    // 用户主动中断（切新对话 / 离开页面）：保留已到达内容，不产生错误气泡
    if (error?.name === 'AbortError') return
    settleRunningTools(pending)
    pending.isError = true
    // 只直呈 api 层「已整理原因」；浏览器底层异常（Failed to fetch 等）转可理解兜底文案
    const reason = error?.curated ? String(error.message) : '网络异常，请稍后再试'
    pending.content = pending.content ? `${pending.content}（回答中断：${reason}）` : reason
  } finally {
    pending.streaming = false
    if (activeController === controller) {
      activeController = null
      answering.value = false
    }
  }
}

function startNewChat() {
  activeController?.abort()
  activeController = null
  answering.value = false
  messages.value = []
}

onUnmounted(() => activeController?.abort())

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
.rec-card {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1px solid #f0f0f0;
}
.rec-card:last-child {
  border-bottom: none;
}
.rec-badge {
  flex-shrink: 0;
  width: 56rpx;
  height: 56rpx;
  line-height: 56rpx;
  text-align: center;
  border-radius: 12rpx;
  font-size: 24rpx;
  color: #fff;
  margin-right: 20rpx;
}
.rec-badge--coupon {
  background: #ff6b6b;
}
.rec-badge--activity {
  background: #4a90d9;
}
.rec-badge--message {
  background: #52c41a;
}
.rec-body {
  flex: 1;
  min-width: 0;
}
.rec-title {
  font-size: 28rpx;
  color: #333;
  display: block;
}
.rec-sub {
  font-size: 24rpx;
  color: #999;
  display: block;
  margin-top: 6rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rec-arrow {
  flex-shrink: 0;
  font-size: 40rpx;
  color: #ccc;
  margin-left: 12rpx;
}
</style>
