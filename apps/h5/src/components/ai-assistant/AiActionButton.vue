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
import { ref, computed } from 'vue'
import { askUserAi, type LocalChatMessage } from '../../api/user-ai'
import ChatMessage from './ChatMessage.vue'

// 页面级 AI 动作按钮（Fork A）：收敛到框架 UserAi 基座，走 /user-ai/ask 同步问答。
// 固定 intent（错题讲解 / 活动分享文案）点按即发；无 intent 时渲染输入框走自由问询。
// 能力面为知识库白名单（anonymous）；真实的「查订单/讲错题/生成分享文案」工具态属 BL-030e 外部 agentic 后续刀。
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

const aiAvailable = ref(true)
const draft = ref('')
const busy = ref(false)
const turns = ref<LocalChatMessage[]>([])
let seq = 0

const busyState = computed(() => busy.value)

async function onTap() {
  if (busyState.value) return
  const text = (props.intent || draft.value).trim()
  if (!text) return
  await run(text)
}

async function run(requestText?: string) {
  const text = (requestText ?? props.intent ?? draft.value).trim()
  if (!text || busyState.value) return
  // 把页面可见数据摘要作为轻量上下文一并上行（知识库仍可能无相关片段，工具态待 BL-030e）
  const question = props.dataSummary ? `${text}\n（相关：${props.dataSummary}）` : text
  busy.value = true
  turns.value.push({ id: ++seq, role: 'user', content: text })
  turns.value.push({ id: ++seq, role: 'assistant', content: '', streaming: true })
  const pending = turns.value[turns.value.length - 1]
  try {
    const res = await askUserAi(question)
    pending.streaming = false
    pending.content = res.answer || (res.allowed ? '' : '抱歉，暂时无法回答这个问题。')
    pending.isError = !res.allowed && !res.answer
  } catch {
    pending.streaming = false
    pending.isError = true
    pending.content = '网络异常，请稍后再试'
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
