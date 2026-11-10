<template>
  <!-- 租户关闭 AI 时整块不渲染（后端同时 403，这里只负责入口消失） -->
  <view v-if="aiState.enabled" class="ai-action">
    <!-- 自由输入态：给一个输入框 + 触发按钮（如「AI 找单」） -->
    <view v-if="!intent" class="ai-action__ask">
      <input
        v-model="draft"
        class="ai-action__input"
        type="text"
        :placeholder="placeholder"
        :disabled="busyState"
        confirm-type="search"
        @confirm="run()"
      />
    </view>

    <button class="ai-action__btn" :disabled="busyState" @tap="onTap">
      {{ busyState ? '处理中…' : label }}
    </button>

    <!-- 内联渲染本次 AI 交互（复用 ChatMessage：流式文本 + 工具提示 + 错误降级） -->
    <view v-if="turns.length > 0" class="ai-action__result">
      <ChatMessage v-for="m in turns" :key="m.id" :message="m" />
      <AiGeneratedNotice />
      <button v-if="copyable && !busyState" class="ai-action__copy" @tap="copyResult">
        复制文案
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import AiGeneratedNotice from './AiGeneratedNotice.vue'
import ChatMessage from './ChatMessage.vue'
import { ensureAiAvailability, useAiAvailability } from '../../store/ai'
import { useUserAiChat } from '../../composables/useUserAiChat'
const props = withDefaults(
  defineProps<{
    label: string
    intent?: string
    placeholder?: string
    entityType?: string
    entityId?: number | string
    dataSummary?: string
    copyable?: boolean
  }>(),
  {
    intent: '',
    placeholder: '描述你的需求…',
    entityType: '',
    entityId: undefined,
    dataSummary: '',
    copyable: false,
  },
)

const { draft, answering: busy, messages: turns, send } = useUserAiChat()
const { state: aiState } = useAiAvailability()
const busyState = computed(() => busy.value)

onMounted(() => {
  void ensureAiAvailability()
})

async function onTap() {
  if (busyState.value) return
  const text = (props.intent || draft.value).trim()
  if (!text) return
  await run(text)
}

async function run(requestText?: string) {
  const text = (requestText ?? props.intent ?? draft.value).trim()
  if (!text || busyState.value) return
  // 页面上下文随问题上行：模型据此调用页面工具（如活动页 generate_share_copy 需要 activity_id）。
  // 只带实体定位与摘要，业务事实由后端按 ID 回表，不信任页面文本。
  const hints: string[] = []
  if (props.dataSummary) hints.push(props.dataSummary)
  if (props.entityType && props.entityId) hints.push(`${props.entityType}_id=${props.entityId}`)
  const question = hints.length > 0 ? `${text}\n（页面信息：${hints.join('；')}）` : text
  await send(question, { displayText: text })
}

function copyResult() {
  const lastAssistant = [...turns.value].reverse().find((m) => m.role === 'assistant' && m.content)
  if (!lastAssistant) return
  uni.setClipboardData({
    data: lastAssistant.content,
    success: () => uni.showToast({ title: '已复制', icon: 'none' }),
  })
}
</script>

<style scoped>
.ai-action {
  margin-top: 20rpx;
}
.ai-action__ask {
  margin-bottom: 12rpx;
}
.ai-action__input {
  height: 72rpx;
  border: 1px solid var(--scrm-border, #ebedf0);
  border-radius: 36rpx;
  padding: 0 24rpx;
  font-size: 26rpx;
  background: var(--scrm-card-bg, #fff);
}
.ai-action__btn {
  background: var(--scrm-primary);
  color: #fff;
  font-size: 26rpx;
  border-radius: 40rpx;
  padding: 0 32rpx;
  line-height: 72rpx;
  margin: 0;
}
.ai-action__btn[disabled] {
  background: var(--scrm-primary);
  color: rgba(255, 255, 255, 0.55);
}
.ai-action__result {
  margin-top: 20rpx;
}
.ai-action__copy {
  margin-top: 12rpx;
  background: var(--scrm-card-bg, #fff);
  color: var(--scrm-primary);
  border: 2rpx solid var(--scrm-primary);
  border-radius: 40rpx;
  font-size: 26rpx;
  line-height: 64rpx;
}
</style>
