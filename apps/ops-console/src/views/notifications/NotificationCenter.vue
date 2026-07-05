<template>
  <div class="notif-center">
    <el-tabs v-model="activeTab" @tab-change="loadData">
      <el-tab-pane label="全部" name="all">
        <div v-loading="loading">
          <div v-for="n in notifications" :key="n.id" class="notif-item" :class="{ unread: !n.read_at }">
            <div class="notif-icon">
              <el-icon :size="18"><Bell /></el-icon>
            </div>
            <div class="notif-content">
              <div class="notif-title">{{ n.title }}</div>
              <div class="notif-body">{{ n.body }}</div>
              <div class="notif-time">{{ n.createdAt }}</div>
            </div>
            <el-button v-if="!n.read_at" link type="primary" @click="markRead(n)">标为已读</el-button>
          </div>
          <el-empty v-if="notifications.length === 0" description="暂无通知" />
        </div>
      </el-tab-pane>
      <el-tab-pane label="未读" name="unread">
        <div v-loading="loading">
          <div v-for="n in unreadNotifications" :key="n.id" class="notif-item unread">
            <div class="notif-icon"><el-icon :size="18"><Bell /></el-icon></div>
            <div class="notif-content">
              <div class="notif-title">{{ n.title }}</div>
              <div class="notif-body">{{ n.body }}</div>
              <div class="notif-time">{{ n.createdAt }}</div>
            </div>
            <el-button link type="primary" @click="markRead(n)">标为已读</el-button>
          </div>
          <el-empty v-if="unreadNotifications.length === 0" description="暂无未读通知" />
        </div>
      </el-tab-pane>
    </el-tabs>
    <div v-if="notifications.length > 0" style="padding: 12px; text-align: center;">
      <el-button @click="markAllRead">全部标为已读</el-button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { http } from '@scrm/shared'

interface Notification { id: number; title: string; body: string; read_at: string | null; createdAt: string }

const activeTab = ref('all')
const loading = ref(false)
const notifications = ref<Notification[]>([])
const unreadNotifications = computed(() => notifications.value.filter(n => !n.read_at))

async function loadData() {
  loading.value = true
  try {
    const res = await http.get('/scrm/notifications')
    notifications.value = res.data?.data ?? res.data ?? []
  } catch { ElMessage.error('加载通知失败') } finally { loading.value = false }
}

async function markRead(n: Notification) {
  try {
    await http.patch(`/scrm/notifications/${n.id}/read`)
    n.read_at = new Date().toISOString()
    ElMessage.success('已标为已读')
  } catch { ElMessage.error('操作失败') }
}

async function markAllRead() {
  try {
    await http.patch('/scrm/notifications/read-all')
    notifications.value.forEach(n => { n.read_at = new Date().toISOString() })
    ElMessage.success('全部已标为已读')
  } catch { ElMessage.error('操作失败') }
}

onMounted(loadData)
</script>
<style scoped lang="scss">
.notif-center { padding: 8px; }
.notif-item { display: flex; align-items: flex-start; gap: 12px; padding: 12px; border-bottom: 1px solid #f0f0f0; &.unread { background: #f0f9ff; } }
.notif-icon { color: #909399; margin-top: 2px; }
.notif-content { flex: 1; }
.notif-title { font-size: 14px; font-weight: 500; color: #303133; }
.notif-body { font-size: 13px; color: #606266; margin-top: 4px; }
.notif-time { font-size: 12px; color: #909399; margin-top: 4px; }
</style>
