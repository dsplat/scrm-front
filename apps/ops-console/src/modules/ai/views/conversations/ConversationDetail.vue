<template>
  <div class="page-container">
    <el-row :gutter="20">
      <el-col :span="18">
        <el-card v-loading="loading">
          <template #header> 对话记录 </template>
          <div class="chat-area">
            <div v-if="!messages.length" style="text-align: center; padding: 40px">
              <el-empty description="暂无消息" />
            </div>
            <div
              v-for="msg in messages"
              :key="msg.id"
              class="chat-msg"
              :class="{ self: msg.role === 'agent' }"
            >
              <div class="msg-role">
                {{ msg.role === 'agent' ? '客服' : '客户' }}
              </div>
              <div class="msg-content">
                {{ msg.content }}
              </div>
              <div class="msg-time">
                {{ msg.created_at }}
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <template #header> 客户信息 </template>
          <el-descriptions :column="1">
            <el-descriptions-item label="昵称">
              {{ conversation.customer_name || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="渠道">
              {{ conversation.channel || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="标签">
              {{ conversation.tags?.join(', ') || '—' }}
            </el-descriptions-item>
          </el-descriptions>
          <el-button
            type="primary"
            style="width: 100%; margin-top: 12px"
            :loading="analyzing"
            @click="handleAnalyze"
          >
            AI 分析对话
          </el-button>
          <div
            v-if="analysis"
            style="margin-top: 12px; white-space: pre-wrap; font-size: 13px; color: #606266"
          >
            {{ analysis }}
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { http } from '@scrm/shared'

const route = useRoute()
const conversationId = route.params.id as string

const loading = ref(false)
const messages = ref<any[]>([])
const conversation = ref<Record<string, any>>({})
const analyzing = ref(false)
const analysis = ref('')

async function loadConversation() {
  if (!conversationId) return
  loading.value = true
  try {
    const res = (await http.get(`/scrm/conversations/${conversationId}`)) as any
    const data = res?.data ?? res ?? {}
    conversation.value = data
    messages.value = data.messages ?? []
  } catch {
    ElMessage.error('加载会话详情失败')
  } finally {
    loading.value = false
  }
}

async function handleAnalyze() {
  analyzing.value = true
  try {
    const res = (await http.post(`/scrm/conversations/${conversationId}/analyze`)) as any
    analysis.value = res?.data?.analysis ?? res?.analysis ?? '分析完成'
    ElMessage.success('AI 分析完成')
  } catch {
    ElMessage.error('分析失败')
  } finally {
    analyzing.value = false
  }
}

onMounted(loadConversation)
</script>
