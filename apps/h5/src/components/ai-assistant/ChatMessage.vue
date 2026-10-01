<template>
  <view :class="['chat-msg', message.role]">
    <view :class="['bubble', { error: message.isError }]">
      <view v-if="toolHint" class="tool-hint">
        <text class="tool-hint__dot" />
        <text>{{ toolHint }}</text>
      </view>
      <text v-if="message.content" class="msg-text">
        {{ message.content }}
      </text>
      <text v-else-if="message.streaming" class="typing"> 正在思考… </text>
      <view v-if="message.action && message.action.route" class="msg-action" @tap="onAction">
        {{ message.action.label }}
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ChatMessage } from '@scrm/h5-ai'

// 单条对话气泡（BL-030b 简化版）：文本 + 流式占位 + 工具进行中提示 + 错误操作按钮。
// 表单填充 / 工作流 / 内联确认 / 选项卡片等非文本形态依赖后端 User 工具面（BL-030d），暂不渲染。
const props = defineProps<{ message: ChatMessage }>()

const toolHint = computed(() => {
  const calls = props.message.toolCalls
  if (!calls || calls.length === 0) return ''
  const running = calls.find((c) => c.status === 'running')
  return running ? `正在查询：${running.name || running.slug || '工具'}…` : ''
})

function onAction() {
  const route = props.message.action?.route
  if (route) uni.navigateTo({ url: route })
}
</script>

<style scoped>
.chat-msg {
  display: flex;
  margin-bottom: 20rpx;
}
.chat-msg.user {
  justify-content: flex-end;
}
.chat-msg.assistant {
  justify-content: flex-start;
}
.bubble {
  max-width: 78%;
  padding: 18rpx 24rpx;
  border-radius: 20rpx;
  font-size: 28rpx;
  line-height: 1.5;
  word-break: break-word;
}
.chat-msg.user .bubble {
  background: #4a90d9;
  color: #fff;
  border-bottom-right-radius: 6rpx;
}
.chat-msg.assistant .bubble {
  background: #f2f3f5;
  color: #333;
  border-bottom-left-radius: 6rpx;
}
.bubble.error {
  background: #fff1f0;
  color: #d4380d;
}
.msg-text {
  white-space: pre-wrap;
}
.typing {
  color: #999;
}
.tool-hint {
  display: flex;
  align-items: center;
  font-size: 24rpx;
  color: #888;
  margin-bottom: 8rpx;
}
.tool-hint__dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #4a90d9;
  margin-right: 10rpx;
}
.msg-action {
  margin-top: 12rpx;
  font-size: 26rpx;
  color: #4a90d9;
  text-decoration: underline;
}
</style>
