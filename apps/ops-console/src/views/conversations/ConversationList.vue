<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>会话记录</span>
          <el-button type="primary" @click="handleCreate"> 新建 </el-button>
        </div>
      </template>
      <el-table v-loading="loading" :data="tableData" stripe style="width: 100%">
        <el-table-column type="index" width="50" />
        <el-table-column label="名称" prop="name" />
        <el-table-column label="状态" prop="status" width="120">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'">
              {{ row.status === 'active' ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" prop="createdAt" width="180" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleEdit(row)"> 编辑 </el-button>
            <el-button link type="danger" @click="handleDelete(row)"> 删除 </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrapper">
        <el-pagination layout="total, prev, pager, next" :total="total" :page-size="20" />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { http } from '@scrm/shared'

interface TableItem {
  id: number
  customer_name?: string
  channel?: string
  agent_name?: string
  last_message?: string
  unread_count?: number
  status: string
  createdAt: string
}

const router = useRouter()
const loading = ref(false)
const tableData = ref<TableItem[]>([])
const total = ref(0)

async function loadData() {
  loading.value = true
  try {
    const res = (await http.get('/scrm/conversations')) as any
    const items = res?.data ?? res ?? []
    tableData.value = Array.isArray(items) ? items : []
    total.value = res?.total ?? 0
  } catch {
    ElMessage.error('加载会话列表失败')
  } finally {
    loading.value = false
  }
}

function handleCreate() {
  router.push('/conversations/new')
}
function handleEdit(row: TableItem) {
  router.push(`/conversations/${row.id}`)
}
async function handleDelete(row: TableItem) {
  await ElMessageBox.confirm(`确定删除会话「${row.customer_name ?? row.id}」？`)
  await http.delete(`/scrm/conversations/${row.id}`)
  ElMessage.success('已删除')
  loadData()
}

onMounted(loadData)
</script>

<style scoped lang="scss">
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.pagination-wrapper {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
