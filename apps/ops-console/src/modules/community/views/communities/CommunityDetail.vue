<template>
  <div class="page-container">
    <el-page-header @back="$router.push('/communities')">
      <template #content>
        <span class="page-title">{{ community.name || '社群详情' }}</span>
      </template>
    </el-page-header>

    <el-card v-loading="loading" class="mt-20">
      <el-tabs v-model="activeTab">
        <!-- 基础信息 -->
        <el-tab-pane label="基础信息" name="info">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="社群名称">{{ community.name || '—' }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="community.status === 'active' ? 'success' : 'info'">
                {{ community.status === 'active' ? '启用' : '停用' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="平台">
              <el-tag :type="getPlatformTagType(community.platform)">
                {{ getPlatformLabel(community.platform) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="类型">{{ getTypeLabel(community.type) }}</el-descriptions-item>
            <el-descriptions-item label="成员数">{{ community.member_count ?? 0 }}</el-descriptions-item>
            <el-descriptions-item label="外部ID">{{ community.external_id || '—' }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ formatTime(community.created_at) }}</el-descriptions-item>
            <el-descriptions-item label="更新时间">{{ formatTime(community.updated_at) }}</el-descriptions-item>
          </el-descriptions>
          
          <div class="action-bar">
            <el-button @click="showEditDialog = true">编辑</el-button>
            <el-button type="success" @click="syncMembers" :loading="syncing">同步成员</el-button>
          </div>
        </el-tab-pane>

        <!-- 成员列表 -->
        <el-tab-pane label="成员列表" name="members">
          <div class="tab-header">
            <span>共 {{ memberTotal }} 名成员</span>
            <el-button size="small" @click="loadMembers">刷新</el-button>
          </div>
          <el-table :data="members" stripe v-loading="membersLoading">
            <el-table-column label="昵称" prop="nickname" min-width="120" />
            <el-table-column label="角色" prop="role" width="100">
              <template #default="{ row }">
                <el-tag :type="row.role === 'owner' ? 'danger' : row.role === 'admin' ? 'warning' : 'info'" size="small">
                  {{ getRoleLabel(row.role) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="加入时间" prop="joined_at" width="180">
              <template #default="{ row }">{{ formatTime(row.joined_at) }}</template>
            </el-table-column>
            <el-table-column label="状态" prop="status" width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
                  {{ row.status === 'active' ? '正常' : '已离开' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
          <div class="pagination-wrapper">
            <el-pagination
              v-model:current-page="memberPage"
              layout="total, prev, pager, next"
              :total="memberTotal"
              :page-size="20"
              @current-change="loadMembers"
            />
          </div>
        </el-tab-pane>

        <!-- SOP 配置 -->
        <el-tab-pane label="SOP 配置" name="sop">
          <div class="tab-header">
            <span>SOP 自动化规则</span>
            <el-button size="small" type="primary" @click="$router.push(`/communities/${communityId}/sop/new`)">新建 SOP</el-button>
          </div>
          <el-empty v-if="!sopConfigs.length" description="暂无 SOP 配置" />
          <el-table v-else :data="sopConfigs" stripe>
            <el-table-column label="名称" prop="name" min-width="150" />
            <el-table-column label="触发条件" prop="trigger_type" width="120" />
            <el-table-column label="执行动作" prop="action_type" width="120" />
            <el-table-column label="状态" prop="status" width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
                  {{ row.status === 'active' ? '启用' : '停用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150">
              <template #default>
                <el-button link type="primary" size="small">编辑</el-button>
                <el-button link type="danger" size="small">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- 群发管理 -->
        <el-tab-pane label="群发管理" name="broadcast">
          <div class="tab-header">
            <span>群发任务</span>
            <el-button size="small" type="primary" @click="showBroadcastDialog = true">新建群发</el-button>
          </div>
          <el-empty v-if="!massPushes.length" description="暂无群发任务" />
          <el-table v-else :data="massPushes" stripe>
            <el-table-column label="标题" prop="title" min-width="150" />
            <el-table-column label="内容类型" prop="content_type" width="100" />
            <el-table-column label="状态" prop="status" width="100">
              <template #default="{ row }">
                <el-tag :type="getStatusTagType(row.status)" size="small">
                  {{ getStatusLabel(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="计划发送" prop="scheduled_at" width="180">
              <template #default="{ row }">{{ formatTime(row.scheduled_at) }}</template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- 数据分析 -->
        <el-tab-pane label="数据分析" name="analytics">
          <el-row :gutter="20">
            <el-col :span="8">
              <el-card shadow="hover">
                <el-statistic title="活跃成员" :value="analytics.active_members ?? 0" />
              </el-card>
            </el-col>
            <el-col :span="8">
              <el-card shadow="hover">
                <el-statistic title="7日活跃率" :value="analytics.active_rate ?? 0" suffix="%" />
              </el-card>
            </el-col>
            <el-col :span="8">
              <el-card shadow="hover">
                <el-statistic title="消息数(7日)" :value="analytics.message_count_7d ?? 0" />
              </el-card>
            </el-col>
          </el-row>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 编辑对话框 -->
    <el-dialog v-model="showEditDialog" title="编辑社群" width="500px">
      <el-form :model="editForm" label-width="100px">
        <el-form-item label="社群名称">
          <el-input v-model="editForm.name" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="editForm.active" active-text="启用" inactive-text="停用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditDialog = false">取消</el-button>
        <el-button type="primary" @click="handleUpdate">保存</el-button>
      </template>
    </el-dialog>

    <!-- 群发对话框 -->
    <el-dialog v-model="showBroadcastDialog" title="新建群发" width="500px">
      <el-form :model="broadcastForm" label-width="100px">
        <el-form-item label="标题" required>
          <el-input v-model="broadcastForm.title" placeholder="请输入标题" />
        </el-form-item>
        <el-form-item label="内容" required>
          <el-input v-model="broadcastForm.content" type="textarea" :rows="4" placeholder="请输入群发内容" />
        </el-form-item>
        <el-form-item label="发送时间">
          <el-radio-group v-model="broadcastForm.sendType">
            <el-radio label="now">立即发送</el-radio>
            <el-radio label="scheduled">定时发送</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="broadcastForm.sendType === 'scheduled'" label="定时">
          <el-date-picker v-model="broadcastForm.scheduledAt" type="datetime" placeholder="选择时间" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showBroadcastDialog = false">取消</el-button>
        <el-button type="primary" @click="handleBroadcast" :loading="broadcasting">发送</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { http } from '@scrm/shared'

const route = useRoute()
const communityId = route.params.id as string

const loading = ref(false)
const syncing = ref(false)
const activeTab = ref('info')
const community = ref<Record<string, any>>({})
const analytics = ref<Record<string, any>>({})

// Members
const members = ref<any[]>([])
const membersLoading = ref(false)
const memberTotal = ref(0)
const memberPage = ref(1)

// SOP
const sopConfigs = ref<any[]>([])

// Broadcast
const massPushes = ref<any[]>([])
const showBroadcastDialog = ref(false)
const broadcasting = ref(false)
const broadcastForm = ref({
  title: '',
  content: '',
  sendType: 'now',
  scheduledAt: null as Date | null,
})

// Edit
const showEditDialog = ref(false)
const editForm = ref({ name: '', active: true })

function getPlatformLabel(platform: string): string {
  const map: Record<string, string> = {
    wechat_work: '企业微信',
    wechat_official: '微信公众号',
    telegram: 'Telegram',
  }
  return map[platform] || platform || '未知'
}

function getPlatformTagType(platform: string): string {
  const map: Record<string, string> = {
    wechat_work: 'success',
    wechat_official: 'warning',
    telegram: 'primary',
  }
  return map[platform] || 'info'
}

function getTypeLabel(type: string): string {
  const map: Record<string, string> = {
    customer: '客户群',
    internal: '内部群',
    vip: 'VIP群',
  }
  return map[type] || type || '—'
}

function getRoleLabel(role: string): string {
  const map: Record<string, string> = {
    owner: '群主',
    admin: '管理员',
    member: '成员',
  }
  return map[role] || role
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: '待发送',
    sending: '发送中',
    sent: '已发送',
    failed: '失败',
  }
  return map[status] || status
}

function getStatusTagType(status: string): string {
  const map: Record<string, string> = {
    pending: 'warning',
    sending: 'primary',
    sent: 'success',
    failed: 'danger',
  }
  return map[status] || 'info'
}

function formatTime(time: string | null): string {
  if (!time) return '—'
  return new Date(time).toLocaleString('zh-CN')
}

async function loadCommunity() {
  if (!communityId) return
  loading.value = true
  try {
    const res = await http.get(`/scrm/communities/${communityId}`) as any
    const data = res?.data ?? res ?? {}
    community.value = data
    editForm.value = {
      name: data.name || '',
      active: data.status === 'active',
    }
    sopConfigs.value = data.sops ?? []
  } catch (e: any) {
    ElMessage.error(e?.message || '加载社群详情失败')
  } finally {
    loading.value = false
  }
}

async function loadMembers() {
  membersLoading.value = true
  try {
    const res = await http.get(`/scrm/communities/${communityId}/members`, {
      params: { page: memberPage.value, per_page: 20 },
    }) as any
    const data = res?.data ?? res
    if (data?.data && Array.isArray(data.data)) {
      members.value = data.data
      memberTotal.value = data.total ?? 0
    } else if (Array.isArray(data)) {
      members.value = data
      memberTotal.value = data.length
    } else {
      members.value = []
      memberTotal.value = 0
    }
  } catch {
    members.value = []
  } finally {
    membersLoading.value = false
  }
}

async function syncMembers() {
  syncing.value = true
  try {
    await http.post(`/scrm/communities/${communityId}/sync`)
    ElMessage.success('同步任务已提交')
    setTimeout(loadMembers, 2000)
  } catch (e: any) {
    ElMessage.error(e?.message || '同步失败')
  } finally {
    syncing.value = false
  }
}

async function handleUpdate() {
  try {
    await http.put(`/scrm/communities/${communityId}`, {
      name: editForm.value.name,
      status: editForm.value.active ? 'active' : 'inactive',
    })
    ElMessage.success('更新成功')
    showEditDialog.value = false
    loadCommunity()
  } catch (e: any) {
    ElMessage.error(e?.message || '更新失败')
  }
}

async function handleBroadcast() {
  if (!broadcastForm.value.title || !broadcastForm.value.content) {
    ElMessage.warning('请填写标题和内容')
    return
  }
  broadcasting.value = true
  try {
    await http.post(`/scrm/communities/${communityId}/broadcast`, {
      title: broadcastForm.value.title,
      content: broadcastForm.value.content,
      scheduled_at: broadcastForm.value.sendType === 'scheduled' ? broadcastForm.value.scheduledAt : null,
    })
    ElMessage.success('群发任务已创建')
    showBroadcastDialog.value = false
    broadcastForm.value = { title: '', content: '', sendType: 'now', scheduledAt: null }
  } catch (e: any) {
    ElMessage.error(e?.message || '群发失败')
  } finally {
    broadcasting.value = false
  }
}

onMounted(() => {
  loadCommunity()
  loadMembers()
})
</script>

<style scoped lang="scss">
.page-container {
  padding: 20px;
}
.page-title {
  font-size: 18px;
  font-weight: 500;
}
.mt-20 {
  margin-top: 20px;
}
.action-bar {
  margin-top: 20px;
}
.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.pagination-wrapper {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
