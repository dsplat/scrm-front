<template>
  <view :class="['chat-msg', message.role]">
    <view :class="['bubble', { error: message.isError }]">
      <text v-if="message.content" class="msg-text">
        {{ message.content }}
      </text>
      <text v-else-if="message.streaming" class="typing"> 正在思考… </text>
      <!-- 多工具（同轮多个 tool_call）：按 toolCallId 逐行呈现，不互相覆盖 -->
      <template v-if="multiTools">
        <text
          v-for="tool in message.tools"
          :key="tool.id"
          :class="['tool-status', { 'error-text': tool.status === 'error' }]"
        >
          {{ toolLine(tool) }}
        </text>
      </template>
      <text v-else-if="message.toolStatus === 'running'" class="tool-status">
        正在调用 {{ message.toolName || '工具' }}…
      </text>
      <text v-else-if="message.toolStatus === 'done'" class="tool-status"> 工具调用完成 </text>
      <text v-else-if="message.toolStatus === 'error'" class="tool-status error-text">
        工具调用失败
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LocalChatMessage, LocalToolCallState } from '../../api/user-ai'

// 单条对话气泡：文本 + 同步等待占位 + 错误态。User AI 走 /user-ai/ask 同步整包返回，
// 同步与流式共用本地消息结构；工具调用状态由协议事件驱动。
const props = defineProps<{ message: LocalChatMessage }>()

// 仅多工具时逐行展开；单工具仍走聚合文案（与历史呈现一致，不额外堆行）
const multiTools = computed(() => (props.message.tools?.length ?? 0) > 1)

function toolLine(tool: LocalToolCallState): string {
  const name = tool.name || '工具'
  if (tool.status === 'running') return `正在调用 ${name}…`
  return tool.status === 'error' ? `${name} 调用失败` : `${name} 调用完成`
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
.tool-status {
  display: block;
  color: #777;
  font-size: 24rpx;
}
/* 模板里的失败态样式（此前只有类名、无规则，颜色退回 .tool-status 的灰） */
.error-text {
  color: #d4380d;
}
.typing {
  color: #999;
}
</style>
