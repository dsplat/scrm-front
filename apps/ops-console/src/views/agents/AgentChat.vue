<template>
  <div class="chat-container">
    <el-row :gutter="0" style="height: 100%">
      <!-- 左侧 Agent 列表 -->
      <el-col :span="5" class="agent-list-panel">
        <el-card shadow="never" class="panel-card">
          <template #header>
            <div class="panel-header">
              <span>Agent 列表</span>
              <el-button size="small" type="primary" link @click="loadAgents">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </div>
          </template>
          <div class="agent-list">
            <div
              v-for="agent in agents"
              :key="agent.id"
              class="agent-item"
              :class="{ active: selectedAgentId === agent.id }"
              @click="selectAgent(agent)"
            >
              <el-avatar :size="36" class="agent-avatar">
                <el-icon><Cpu /></el-icon>
              </el-avatar>
              <div class="agent-info">
                <div class="agent-name">{{ agent.name }}</div>
                <div class="agent-role">{{ agent.role || '数字员工' }}</div>
              </div>
              <el-badge
                :is-dot="agent.status === 'active'"
                :type="agent.status === 'active' ? 'success' : 'info'"
              />
            </div>
            <el-empty v-if="agents.length === 0" description="暂无 Agent" :image-size="60" />
          </div>
        </el-card>
      </el-col>

      <!-- 中间对话区域 -->
      <el-col :span="14" class="chat-panel">
        <div class="chat-header" v-if="selectedAgent">
          <span class="chat-title">{{ selectedAgent.name }}</span>
          <el-tag :type="selectedAgent.status === 'active' ? 'success' : 'info'" size="small">
            {{ selectedAgent.status === 'active' ? '在线' : '离线' }}
          </el-tag>
        </div>
        <div class="chat-messages" ref="messagesRef">
          <div v-if="messages.length === 0 && !selectedAgent" class="chat-placeholder">
            <el-icon :size="48" color="#c0c4cc"><ChatDotRound /></el-icon>
            <p>请从左侧选择一个 Agent 开始对话</p>
          </div>
          <div v-else-if="messages.length === 0" class="chat-placeholder">
            <el-icon :size="48" color="#409eff"><Cpu /></el-icon>
            <p>开始与 {{ selectedAgent?.name }} 对话</p>
          </div>
          <div v-for="(msg, index) in messages" :key="index" class="message-row" :class="msg.role">
            <el-avatar :size="32" class="msg-avatar">
              <el-icon v-if="msg.role === 'agent'"><Cpu /></el-icon>
              <el-icon v-else><User /></el-icon>
            </el-avatar>
            <div class="msg-content">
              <div class="msg-bubble" :class="msg.role">
                <p v-if="msg.type === 'text'">{{ msg.content }}</p>
                <div v-else-if="msg.type === 'action_card'" class="action-card">
                  <el-icon color="#67c23a"><SuccessFilled /></el-icon>
                  <span>{{ msg.content }}</span>
                </div>
              </div>
              <span class="msg-time">{{ msg.time }}</span>
            </div>
          </div>
          <div v-if="sending" class="message-row agent">
            <el-avatar :size="32" class="msg-avatar"
              ><el-icon><Cpu /></el-icon
            ></el-avatar>
            <div class="msg-content">
              <div class="msg-bubble agent loading">
                <span class="typing-dots"> <span></span><span></span><span></span> </span>
              </div>
            </div>
          </div>
        </div>
        <div class="chat-input">
          <div class="quick-actions">
            <el-button size="small" @click="insertQuickAction('查看今日数据')">今日数据</el-button>
            <el-button size="small" @click="insertQuickAction('查看客户列表')">客户列表</el-button>
            <el-button size="small" @click="insertQuickAction('查看社群活跃度')"
              >社群活跃</el-button
            >
          </div>
          <div class="input-row">
            <el-input
              v-model="message"
              placeholder="输入消息或指令..."
              @keyup.enter="sendMessage"
              :disabled="!selectedAgent"
            >
              <template #append>
                <el-button
                  @click="sendMessage"
                  :disabled="!message.trim() || sending"
                  type="primary"
                >
                  发送
                </el-button>
              </template>
            </el-input>
          </div>
        </div>
      </el-col>

      <!-- 右侧上下文面板 -->
      <el-col :span="5" class="context-panel">
        <el-card shadow="never" class="panel-card" v-if="selectedAgent">
          <template #header>
            <div class="panel-header">
              <span>上下文</span>
            </div>
          </template>
          <div class="context-section">
            <h4>Agent 角色</h4>
            <p class="context-desc">{{ selectedAgent.role || '数字员工' }}</p>
            <p class="context-capability">
              {{ selectedAgent.description || '可执行客户查询、数据分析、消息发送等操作' }}
            </p>
          </div>
          <el-divider />
          <div class="context-section">
            <h4>交互模式</h4>
            <el-tag :type="interactionModeTag(selectedAgent.interaction_mode)">
              {{ interactionModeLabel(selectedAgent.interaction_mode) }}
            </el-tag>
          </div>
          <el-divider />
          <div class="context-section">
            <h4>关联知识库</h4>
            <div v-if="knowledgeBases.length > 0">
              <el-tag v-for="kb in knowledgeBases" :key="kb" size="small" class="kb-tag">{{
                kb
              }}</el-tag>
            </div>
            <p v-else class="context-empty">暂无关联知识库</p>
          </div>
          <el-divider />
          <div class="context-section">
            <h4>最近操作</h4>
            <div v-if="recentActions.length > 0" class="recent-actions">
              <div v-for="(action, i) in recentActions" :key="i" class="action-item">
                <el-icon :size="14" color="#67c23a"><SuccessFilled /></el-icon>
                <span>{{ action }}</span>
              </div>
            </div>
            <p v-else class="context-empty">暂无操作记录</p>
          </div>
        </el-card>
        <el-card shadow="never" class="panel-card" v-else>
          <el-empty description="选择 Agent 查看上下文" :image-size="60" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, nextTick, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { http } from '@scrm/shared'

interface Agent {
  id: number
  name: string
  role?: string
  status?: string
  description?: string
  interaction_mode?: string
}

interface ChatMessage {
  role: 'user' | 'agent'
  content: string
  type: 'text' | 'action_card'
  time: string
}

const agents = ref<Agent[]>([])
const selectedAgentId = ref<number | null>(null)
const selectedAgent = ref<Agent | null>(null)
const messages = ref<ChatMessage[]>([])
const message = ref('')
const sending = ref(false)
const messagesRef = ref<HTMLElement | null>(null)
const knowledgeBases = ref<string[]>([])
const recentActions = ref<string[]>([])

function interactionModeLabel(mode?: string): string {
  return mode === 'full_auto' ? '全自动' : mode === 'semi_auto' ? '半自动' : '手动确认'
}

function interactionModeTag(mode?: string): string {
  return mode === 'full_auto' ? 'success' : mode === 'semi_auto' ? 'warning' : 'info'
}

function formatTime(): string {
  return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

async function loadAgents() {
  try {
    const res = await http.get('/scrm/agents')
    agents.value = res.data?.data ?? res.data ?? []
  } catch {
    ElMessage.error('加载 Agent 列表失败')
  }
}

async function selectAgent(agent: Agent) {
  selectedAgentId.value = agent.id
  selectedAgent.value = agent
  messages.value = []

  // Load knowledge bases
  try {
    const res = await http.get(`/scrm/agents/${agent.id}/knowledge-bases`)
    const kbs = res.data?.data ?? res.data ?? []
    knowledgeBases.value = Array.isArray(kbs) ? kbs.map((k: any) => k.name || k) : []
  } catch {
    knowledgeBases.value = []
  }

  // Load conversation history
  try {
    const res = await http.get(`/scrm/agents/${agent.id}/conversations`)
    const convs = res.data?.data ?? res.data ?? []
    if (Array.isArray(convs) && convs.length > 0) {
      recentActions.value = convs.slice(0, 5).map((c: any) => c.summary || c.title || '对话记录')
    }
  } catch {
    recentActions.value = []
  }
}

function insertQuickAction(text: string) {
  message.value = text
}

async function sendMessage() {
  if (!message.value.trim() || !selectedAgentId.value || sending.value) return

  const userMsg = message.value.trim()
  messages.value.push({
    role: 'user',
    content: userMsg,
    type: 'text',
    time: formatTime(),
  })
  message.value = ''
  sending.value = true
  await scrollToBottom()

  try {
    const res = await http.post(`/scrm/agents/${selectedAgentId.value}/conversations`, {
      message: userMsg,
    })
    const data = res.data?.data ?? res.data
    const reply = data?.reply || data?.message || '收到您的指令'
    const action = data?.action

    messages.value.push({
      role: 'agent',
      content: reply,
      type: 'text',
      time: formatTime(),
    })

    if (action) {
      messages.value.push({
        role: 'agent',
        content: action,
        type: 'action_card',
        time: formatTime(),
      })
    }
  } catch {
    messages.value.push({
      role: 'agent',
      content: '抱歉，处理请求时出错，请稍后再试。',
      type: 'text',
      time: formatTime(),
    })
  } finally {
    sending.value = false
    await scrollToBottom()
  }
}

async function scrollToBottom() {
  await nextTick()
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}

onMounted(() => {
  loadAgents()
})
</script>

<style scoped lang="scss">
.chat-container {
  height: calc(100vh - 140px);
  background: #fff;
  border-radius: 4px;
}

.panel-card {
  height: 100%;
  :deep(.el-card__header) {
    padding: 12px 16px;
  }
  :deep(.el-card__body) {
    padding: 0;
    height: calc(100% - 55px);
    overflow-y: auto;
  }
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Left: Agent list */
.agent-list-panel {
  height: 100%;
  border-right: 1px solid #e6e6e6;
}
.agent-list {
  padding: 8px;
}
.agent-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
  &:hover {
    background: #f5f7fa;
  }
  &.active {
    background: #ecf5ff;
  }
}
.agent-info {
  flex: 1;
  min-width: 0;
}
.agent-name {
  font-size: 14px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.agent-role {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

/* Center: Chat */
.chat-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  border-left: 1px solid #e6e6e6;
  border-right: 1px solid #e6e6e6;
}
.chat-header {
  padding: 12px 16px;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  align-items: center;
  gap: 10px;
}
.chat-title {
  font-size: 15px;
  font-weight: 600;
}
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #fafafa;
}
.chat-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #c0c4cc;
  p {
    margin-top: 12px;
    font-size: 14px;
  }
}

.message-row {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  &.user {
    flex-direction: row-reverse;
  }
}
.msg-content {
  max-width: 70%;
}
.msg-bubble {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.5;
  &.user {
    background: #409eff;
    color: #fff;
    border-bottom-right-radius: 4px;
  }
  &.agent {
    background: #fff;
    color: #303133;
    border-bottom-left-radius: 4px;
    border: 1px solid #e6e6e6;
  }
  &.loading {
    padding: 8px 16px;
  }
  p {
    margin: 0;
  }
}
.msg-time {
  font-size: 11px;
  color: #909399;
  margin-top: 4px;
  display: block;
}
.message-row.user .msg-time {
  text-align: right;
}

.action-card {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #67c23a;
  font-size: 13px;
}

.typing-dots {
  display: inline-flex;
  gap: 4px;
  span {
    width: 6px;
    height: 6px;
    background: #909399;
    border-radius: 50%;
    animation: dot-pulse 1.4s ease-in-out infinite;
    &:nth-child(2) {
      animation-delay: 0.2s;
    }
    &:nth-child(3) {
      animation-delay: 0.4s;
    }
  }
}
@keyframes dot-pulse {
  0%,
  80%,
  100% {
    opacity: 0.3;
  }
  40% {
    opacity: 1;
  }
}

.chat-input {
  border-top: 1px solid #e6e6e6;
  background: #fff;
}
.quick-actions {
  padding: 8px 12px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.input-row {
  padding: 0 12px 12px;
}

/* Right: Context */
.context-panel {
  height: 100%;
}
.context-section {
  padding: 0 16px;
  h4 {
    font-size: 13px;
    font-weight: 600;
    color: #303133;
    margin-bottom: 8px;
  }
}
.context-desc {
  font-size: 13px;
  color: #606266;
  margin-bottom: 4px;
}
.context-capability {
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
}
.context-empty {
  font-size: 12px;
  color: #c0c4cc;
}
.kb-tag {
  margin: 0 4px 4px 0;
}
.recent-actions {
  .action-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #606266;
    margin-bottom: 6px;
  }
}
</style>
