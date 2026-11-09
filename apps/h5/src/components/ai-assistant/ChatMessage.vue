<template>
  <view :class="['chat-msg', message.role]">
    <view :class="['bubble', { error: message.isError }]">
      <rich-text v-if="message.content && !isUser" class="msg-text" :nodes="richContent" />
      <text v-else-if="message.content" class="msg-text msg-text--plain">
        {{ message.content }}
      </text>
      <text v-else-if="message.streaming" class="typing"> 正在思考… </text>
      <template v-if="message.tools?.length">
        <text
          v-for="tool in message.tools"
          :key="tool.id"
          :class="['tool-status', { 'error-text': tool.status === 'error' }]"
        >
          {{ toolLine(tool) }}
        </text>
      </template>
      <view v-if="!isUser && message.sources?.length" class="sources">
        <text class="sources__toggle" @tap="showSources = !showSources">
          参考资料（{{ message.sources.length }}）{{ showSources ? '▴' : '▾' }}
        </text>
        <view v-if="showSources" class="sources__list">
          <view v-for="(source, index) in message.sources" :key="index" class="source-item">
            <text v-if="source.title" class="source-item__title">
              {{ source.title }}
            </text>
            <text class="source-item__content">
              {{ source.content }}
            </text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { LocalChatMessage, LocalToolCallState } from '../../api/user-ai'
import { markdownToRichText } from '../../utils/markdown'

// 单条对话气泡：文本 + 同步等待占位 + 错误态。User AI 走 /ai-stream/chat 流式返回，
// 同步与流式共用本地消息结构；工具调用状态由协议事件驱动。
const props = defineProps<{ message: LocalChatMessage }>()

// 用户输入按纯文本展示：走 Markdown 会把 `*` `_` 误当强调标记
const isUser = computed(() => props.message.role === 'user')
const richContent = computed(() => markdownToRichText(props.message.content || ''))

const showSources = ref(false)

function toolLine(tool: LocalToolCallState): string {
  if (tool.labels) return tool.labels[tool.status]
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
  padding: 16rpx 22rpx;
  border-radius: 18rpx;
  font-size: 26rpx;
  line-height: 1.6;
  word-break: break-word;
}
.chat-msg.user .bubble {
  background: var(--scrm-primary);
  color: #fff;
  border-bottom-right-radius: 6rpx;
}
.chat-msg.assistant .bubble {
  background: var(--scrm-card-bg, #fff);
  color: var(--scrm-text-primary, #1f2329);
  border: 1rpx solid var(--scrm-border, #ebedf0);
  border-bottom-left-radius: 6rpx;
}
.bubble.error {
  background: #fff1f0;
  color: #d4380d;
}
.msg-text {
  display: block;
  word-break: break-word;
}
.msg-text--plain {
  white-space: pre-wrap;
}
.tool-status {
  display: block;
  color: #999;
  font-size: 22rpx;
}
/* 模板里的失败态样式（此前只有类名、无规则，颜色退回 .tool-status 的灰） */
.error-text {
  color: #d4380d;
}
.typing {
  color: var(--scrm-text-tertiary, #8a9099);
}
.sources {
  margin-top: 16rpx;
  padding-top: 12rpx;
  border-top: 1rpx solid var(--scrm-border, #ebedf0);
}
.sources__toggle {
  color: var(--scrm-primary);
  font-size: 22rpx;
}
.sources__list {
  margin-top: 12rpx;
}
.source-item {
  margin-top: 12rpx;
  padding: 12rpx;
  border-radius: 10rpx;
  background: var(--scrm-page-bg, #f4f5f7);
}
.source-item__title,
.source-item__content {
  display: block;
  font-size: 22rpx;
  line-height: 1.5;
}
.source-item__title {
  margin-bottom: 6rpx;
  font-weight: 600;
}
.source-item__content {
  color: var(--scrm-text-secondary, #6b7280);
}
</style>
