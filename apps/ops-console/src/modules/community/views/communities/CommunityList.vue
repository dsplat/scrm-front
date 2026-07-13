<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>社群管理</span>
          <el-button type="primary" @click="showCreateDialog = true">新建社群</el-button>
        </div>
      </template>
      
      <!-- 筛选栏 -->
      <div class="filter-bar">
        <el-select v-model="filters.platform" placeholder="平台" clearable @change="loadData">
          <el-option label="企业微信" value="wechat_work" />
          <el-option label="微信公众号" value="wechat_official" />
          <el-option label="Telegram" value="telegram" />
        </el-select>
        <el-select v-model="filters.status" placeholder="状态" clearable @change="loadData">
          <el-option label="启用" value="active" />
          <el-option label="停用" value="inactive" />
        </el-select>
        <el-input v-model="filters.search" placeholder="搜索社群名称" clearable @keyup.enter="loadData" />
        <el-button @click="loadData">搜索</el-button>
      </div>

      <el-table v-loading="loading" :data="tableData" stripe style="width: 100%">
        <el-table-column type="index" width="50" />
        <el-table-column label="社群名称" prop="name" min-width="150" />
        <el-table-column label="平台" prop="platform" width="120">
          <template #default="{ row }">
            <el-tag :type="getPlatformTagType(row.platform)">
              {{ getPlatformLabel(row.platform) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="类型" prop="type" width="100">
          <template #default="{ row }">
            {{ getTypeLabel(row.type) }}
          </template>
        </el-table-column>
        <el-table-column label="成员数" prop="member_count" width="100" />
        <el-table-column label="状态" prop="status" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'">
              {{ row.status === 'active' ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" prop="created_at" width="180" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          @size-change="loadData"
          @current-change="loadData"
        />
      </div>
    </el-card>

    <!-- 创建社群对话框 -->
    <el-dialog v-model="showCreateDialog" title="新建社群" width="500px">
      <el-form :model="createForm" label-width="100px">
        <el-form-item label="社群名称" required>
          <el-input v-model="createForm.name" placeholder="请输入社群名称" />
        </el-form-item>
        <el-form-item label="平台" required>
          <el-select v-model="createForm.platform" placeholder="选择平台">
            <el-option label="企业微信" value="wechat_work" />
            <el-option label="微信公众号" value="wechat_official" />
            <el-option label="Telegram" value="telegram" />
          </el-select>
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="createForm.type" placeholder="选择类型">
            <el-option label="客户群" value="customer" />
            <el-option label="内部群" value="internal" />
            <el-option label="VIP群" value="vip" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="handleCreate" :loading="creating">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { http } from '@scrm/shared'

interface Community {
  community_id: number
  name: string
  platform: string
  type: string
  member_count: number
  status: string
  created_at: string
}

const router = useRouter()
const loading = ref(false)
const creating = ref(false)
const tableData = ref<Community[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const showCreateDialog = ref(false)

const filters = ref({
  platform: '',
  status: '',
  search: '',
})

const createForm = ref({
  name: '',
  platform: 'wechat_work',
  type: 'customer',
})

function getPlatformLabel(platform: string): string {
  const map: Record<string, string> = {
    wechat_work: '企业微信',
    wechat_official: '微信公众号',
    telegram: 'Telegram',
  }
  return map[platform] || platform
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
  return map[type] || type
}

async function loadData() {
  loading.value = true
  try {
    const params: Record<string, any> = {
      per_page: pageSize.value,
      page: currentPage.value,
    }
    if (filters.value.platform) params.platform = filters.value.platform
    if (filters.value.status) params.status = filters.value.status
    if (filters.value.search) params.search = filters.value.search

    const res = await http.get('/scrm/communities', { params }) as any
    const data = res?.data ?? res
    
    // Handle paginated response
    if (data?.data && Array.isArray(data.data)) {
      tableData.value = data.data
      total.value = data.total ?? data.meta?.total ?? 0
    } else if (Array.isArray(data)) {
      tableData.value = data
      total.value = data.length
    } else {
      tableData.value = []
      total.value = 0
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '加载社群列表失败')
    tableData.value = []
  } finally {
    loading.value = false
  }
}

async function handleCreate() {
  if (!createForm.value.name) {
    ElMessage.warning('请输入社群名称')
    return
  }
  creating.value = true
  try {
    await http.post('/scrm/communities', createForm.value)
    ElMessage.success('创建成功')
    showCreateDialog.value = false
    createForm.value = { name: '', platform: 'wechat_work', type: 'customer' }
    loadData()
  } catch (e: any) {
    ElMessage.error(e?.message || '创建失败')
  } finally {
    creating.value = false
  }
}

function handleEdit(row: Community) {
  router.push(`/communities/${row.community_id}`)
}

async function handleDelete(row: Community) {
  await ElMessageBox.confirm(`确定删除社群「${row.name}」？`)
  try {
    await http.delete(`/scrm/communities/${row.community_id}`)
    ElMessage.success('已删除')
    loadData()
  } catch (e: any) {
    ElMessage.error(e?.message || '删除失败')
  }
}

onMounted(loadData)
</script>

<style scoped lang="scss">
.page-container {
  padding: 20px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  .el-select {
    width: 140px;
  }
  .el-input {
    width: 200px;
  }
}
.pagination-wrapper {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
