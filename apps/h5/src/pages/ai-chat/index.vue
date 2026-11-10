<template>
  <view class="ai-chat-page">
    <NavBar :title="pageTitle">
      <template #right>
        <view class="nav-actions">
          <text v-if="handoffMessage" class="nav-action" @tap="openHandoff"> 人工 </text>
          <text v-if="messages.length" class="nav-action" @tap="startNewChat"> 新对话 </text>
        </view>
      </template>
    </NavBar>

    <ErrorState v-if="!aiState.enabled" message="AI 功能暂未开放" :show-retry="false" />

    <template v-else>
      <scroll-view
        class="message-scroll"
        scroll-y
        :scroll-top="scrollTop"
        :scroll-with-animation="false"
        :show-scrollbar="false"
        @scroll="handleScroll"
      >
        <view class="message-container">
          <view v-if="messages.length === 0" class="welcome">
            <view class="welcome__badge"> AI </view>
            <text class="welcome__title">
              {{ pageTitle }}
            </text>
            <text class="welcome__text">
              {{ welcomeText }}
            </text>
            <view v-if="quickQuestions.length > 0" class="quick-list">
              <button
                v-for="question in quickQuestions"
                :key="question"
                class="quick-question"
                @tap="send(question)"
              >
                {{ question }}
              </button>
            </view>
          </view>

          <template v-for="message in messages" :key="message.id">
            <ChatMessage :message="message" />
            <view
              v-if="message.role === 'assistant' && message.content && !message.streaming"
              class="message-actions"
            >
              <text @tap="copyMessage(message.content)"> 复制 </text>
              <text v-if="message.isError" @tap="retry(message)"> 重试 </text>
            </view>
          </template>

          <text v-if="extraDisclaimer" class="disclaimer">
            {{ extraDisclaimer }}
          </text>
        </view>
      </scroll-view>

      <view class="notice-bar">
        <AiGeneratedNotice />
      </view>

      <view class="composer">
        <input
          v-model="draft"
          class="composer__input"
          type="text"
          placeholder="输入你的问题…"
          :maxlength="capabilities.input_max_chars"
          confirm-type="send"
          @confirm="send()"
        />
        <button v-if="answering" class="composer__button composer__button--stop" @tap="stop">
          停止
        </button>
        <button v-else class="composer__button" :disabled="!draft.trim()" @tap="send()">
          发送
        </button>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import NavBar from '../../components/NavBar.vue'
import ErrorState from '../../components/ErrorState.vue'
import AiGeneratedNotice from '../../components/ai-assistant/AiGeneratedNotice.vue'
import { isAiNoticeLike } from '../../components/ai-assistant/ai-generated-notice'
import ChatMessage from '../../components/ai-assistant/ChatMessage.vue'
import { useUserAiChat } from '../../composables/useUserAiChat'
import { applyAiEnabled, useAiAvailability } from '../../store/ai'
import { ensureLogin } from '../../utils/auth-guard'
import { getWorkbench, type Workbench } from '../../api/workbench'

const { capabilities, draft, answering, messages, send, stop, startNewChat, retry } =
  useUserAiChat()
const { state: aiState } = useAiAvailability()
const scrollTop = ref(0)
const viewportHeight = ref(0)
const nearBottom = ref(true)
let scrollSeq = 0

/** 工作台配置：成功时优先用 persona / quick_questions，失败时保持 capabilities 旧口径 */
const workbench = ref<Workbench | null>(null)
const persona = computed(() =>
  workbench.value && !workbench.value.fallback ? workbench.value.persona : null,
)
const pageTitle = computed(() => persona.value?.name || capabilities.value.title)
const welcomeText = computed(() => persona.value?.welcome || capabilities.value.welcome)
/** 后台定制提示仅作补充；已含 AI 标识字样时由合规标识统一表达，不重复渲染 */
const extraDisclaimer = computed(() => {
  const text = (persona.value?.disclaimer || capabilities.value.disclaimer).trim()
  return text && !isAiNoticeLike(text) ? text : ''
})
const quickQuestions = computed(() =>
  workbench.value && !workbench.value.fallback
    ? workbench.value.quick_questions
    : capabilities.value.quick_questions,
)
const handoffMessage = computed(() => {
  if (!workbench.value || workbench.value.fallback) return ''
  return workbench.value.handoff.mode === 'message' ? workbench.value.handoff.message : ''
})

/** 工作台页跳入时携带的首个问题：登录 + 配置就绪后自动发送一次 */
const pendingQuestion = ref('')
const autoSent = ref(false)
let workbenchLoaded = false

onLoad((query) => {
  pendingQuestion.value = typeof query?.q === 'string' ? query.q.trim() : ''
})

async function loadWorkbench(): Promise<void> {
  const data = await getWorkbench()
  workbench.value = data
  // 失败兜底不算加载成功：下次 onShow 仍可重试，避免把已成功配置覆盖成空态
  workbenchLoaded = !data.fallback
  if (!data.fallback) applyAiEnabled(data.ai_enabled)
}

async function maybeAutoSend(): Promise<void> {
  if (autoSent.value || !pendingQuestion.value) return
  const question = pendingQuestion.value
  autoSent.value = true
  pendingQuestion.value = ''
  await send(question)
}

onShow(async () => {
  if (!(await ensureLogin('使用智能客服需登录后进行'))) return
  if (!workbenchLoaded) await loadWorkbench()
  await maybeAutoSend()
})

onMounted(() => {
  nextTick(() => {
    uni
      .createSelectorQuery()
      .select('.message-scroll')
      .boundingClientRect((rect) => {
        if (rect && !Array.isArray(rect)) viewportHeight.value = rect.height ?? 0
      })
      .exec()
  })
})

watch(
  () => messages.value.map((message) => message.content).join('|'),
  () => {
    if (!nearBottom.value) return
    nextTick(() => {
      scrollTop.value = 100000 + ++scrollSeq
    })
  },
)

function handleScroll(event: { detail: { scrollTop: number; scrollHeight: number } }) {
  const { scrollTop: top, scrollHeight } = event.detail
  nearBottom.value = scrollHeight - top - viewportHeight.value < 120
}

function openHandoff() {
  if (workbench.value?.handoff.mode !== 'message' || !handoffMessage.value) return
  uni.showModal({
    title: '联系人工',
    content: handoffMessage.value,
    showCancel: false,
  })
}

function copyMessage(content: string) {
  uni.setClipboardData({
    data: content,
    success: () => uni.showToast({ title: '已复制', icon: 'none' }),
  })
}
</script>

<style scoped>
.ai-chat-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--scrm-page-bg, #f4f5f7);
}
.nav-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 20rpx;
}
.nav-action {
  color: var(--scrm-primary);
  font-size: 24rpx;
  white-space: nowrap;
}
:deep(.scrm-navbar__right) {
  width: auto;
  min-width: 64rpx;
}
.message-scroll {
  flex: 1;
  min-height: 0;
  box-sizing: border-box;
}
.message-container {
  padding: 24rpx 24rpx 32rpx;
}
.welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 64rpx 20rpx 40rpx;
  text-align: center;
}
.welcome__badge {
  width: 88rpx;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 28rpx;
  background: var(--scrm-primary-soft);
  color: var(--scrm-primary);
  font-size: 32rpx;
  font-weight: 600;
}
.welcome__title {
  margin-top: 24rpx;
  color: var(--scrm-text-primary, #1f2329);
  font-size: 34rpx;
  font-weight: 600;
}
.welcome__text {
  max-width: 560rpx;
  margin-top: 16rpx;
  color: var(--scrm-text-secondary, #6b7280);
  font-size: 26rpx;
  line-height: 1.6;
}
.quick-list {
  width: 100%;
  margin-top: 32rpx;
}
.quick-question {
  margin: 0 0 16rpx;
  padding: 0 28rpx;
  border: 1rpx solid var(--scrm-border, #ebedf0);
  border-radius: 20rpx;
  background: var(--scrm-card-bg, #fff);
  color: var(--scrm-text-primary, #1f2329);
  font-size: 26rpx;
  line-height: 76rpx;
  text-align: left;
}
.quick-question::after,
.composer__button::after {
  border: none;
}
.message-actions {
  display: flex;
  gap: 24rpx;
  margin: -8rpx 0 20rpx 12rpx;
  color: var(--scrm-text-tertiary, #8a9099);
  font-size: 22rpx;
}
.disclaimer {
  display: block;
  padding: 20rpx 24rpx 0;
  color: var(--scrm-text-tertiary, #8a9099);
  font-size: 22rpx;
  line-height: 1.5;
  text-align: center;
}
.notice-bar {
  padding: 12rpx 20rpx 0;
  border-top: 1rpx solid var(--scrm-border, #ebedf0);
  background: var(--scrm-card-bg, #fff);
}
.composer {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 8rpx 20rpx calc(16rpx + env(safe-area-inset-bottom));
  background: var(--scrm-card-bg, #fff);
}
.composer__input {
  flex: 1;
  height: 76rpx;
  padding: 0 28rpx;
  border-radius: 38rpx;
  background: var(--scrm-page-bg, #f4f5f7);
  font-size: 26rpx;
}
.composer__button {
  flex-shrink: 0;
  min-width: 120rpx;
  height: 76rpx;
  margin: 0;
  padding: 0 28rpx;
  border-radius: 38rpx;
  background: var(--scrm-primary);
  color: #fff;
  font-size: 26rpx;
  line-height: 76rpx;
}
.composer__button[disabled] {
  background: var(--scrm-primary);
  color: rgba(255, 255, 255, 0.55);
}
.composer__button--stop {
  border: 1rpx solid var(--scrm-primary);
  background: var(--scrm-card-bg, #fff);
  color: var(--scrm-primary);
}
</style>
