<template>
  <view :class="['chat-msg', message.role]">
    <view :class="['bubble', { error: message.isError }]">
      <text v-if="message.content" class="msg-text">
        {{ message.content }}
      </text>
      <text v-else-if="message.streaming" class="typing"> 正在思考… </text>
      <text v-if="message.toolStatus === 'running'" class="tool-status">
        正在调用 {{ message.toolName || '工具' }}…
      </text>
      <text v-else-if="message.toolStatus === 'done'" class="tool-status"> 工具调用完成 </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { LocalChatMessage } from '../../api/user-ai'

// 单条对话气泡：文本 + 同步等待占位 + 错误态。User AI 走 /user-ai/ask 同步整包返回，
// 同步与流式共用本地消息结构；工具调用状态由协议事件驱动。
defineProps<{ message: LocalChatMessage }>()
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
.typing {
  color: #999;
}
</style>
