<template>
  <view v-if="aiAvailable" class="ai-action">
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
      <button v-if="copyable && !busyState" class="ai-action__copy" @tap="copyResult">
        复制文案
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAssistantStream, usePageContext, useAvailability, assistantStore } from '@scrm/h5-ai'
import { ensureLogin } from '../../utils/auth-guard'
import ChatMessage from './ChatMessage.vue'

// 页面级 AI 动作按钮（BL-030c）：封装「登录门禁 → 带页面上下文发起流式对话 → 内联渲染结果」。
// 固定 intent（错题讲解 / 活动分享文案）点按即发；无 intent 时渲染输入框走自由问询（AI 找单）。
// 复用全局 assistant 会话：仅渲染本次 tap 之后新增的轮次（slice 起点），不重复历史。
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

const { send } = useAssistantStream()
const { pageContext } = usePageContext()
const { check: checkAvailability } = useAvailability()

const aiAvailable = ref(false)
const draft = ref('')
const busy = ref(false)
const startIdx = ref(0)

const streaming = computed(() => assistantStore.streaming.value)
const busyState = computed(() => busy.value || streaming.value)
const turns = computed(() => assistantStore.messages.value.slice(startIdx.value))

async function onTap() {
  if (busyState.value) return
  const text = (props.intent || draft.value).trim()
  if (!text) return
  await run(text)
}

async function run(requestText?: string) {
  const text = (requestText ?? props.intent ?? draft.value).trim()
  if (!text || busyState.value) return
  // AI 动作以登录身份执行（Bearer user_token）：未登录先引导
  if (!(await ensureLogin('使用 AI 助手需先登录'))) return

  busy.value = true
  startIdx.value = assistantStore.messages.value.length
  try {
    await send(
      pageContext({
        entity_type: props.entityType || null,
        entity_id: props.entityId != null ? Number(props.entityId) : null,
        visible_data_summary: props.dataSummary || '',
      }),
      text,
    )
  } finally {
    busy.value = false
  }
}

function copyResult() {
  const lastAssistant = [...turns.value].reverse().find((m) => m.role === 'assistant' && m.content)
  if (!lastAssistant) return
  uni.setClipboardData({
    data: lastAssistant.content,
    success: () => uni.showToast({ title: '已复制', icon: 'none' }),
  })
}

onMounted(async () => {
  aiAvailable.value = await checkAvailability()
})
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
  border: 1px solid #e0e0e0;
  border-radius: 36rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  background: #fff;
}
.ai-action__btn {
  background: #4a90d9;
  color: #fff;
  font-size: 28rpx;
  border-radius: 40rpx;
  padding: 0 32rpx;
  line-height: 72rpx;
  margin: 0;
}
.ai-action__btn[disabled] {
  background: #b8cbe0;
}
.ai-action__result {
  margin-top: 20rpx;
}
.ai-action__copy {
  margin-top: 12rpx;
  background: #fff;
  color: #4a90d9;
  border: 2rpx solid #4a90d9;
  border-radius: 40rpx;
  font-size: 26rpx;
  line-height: 64rpx;
}
</style>
