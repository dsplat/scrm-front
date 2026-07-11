<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>自动化规则</span>
          <el-button type="primary" @click="handleCreate">新建</el-button>
        </div>
      </template>
      <el-table :data="tableData" stripe style="width: 100%" v-loading="loading">
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
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrapper">
        <el-pagination layout="total, prev, pager, next" :total="0" :page-size="20" />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { http } from '@scrm/shared'

interface TableItem {
  id: number
  name: string
  trigger_type?: string
  executions_count?: number
  status: string
  createdAt: string
}

const router = useRouter()
const loading = ref(false)
const tableData = ref<TableItem[]>([])

async function loadData() {
  loading.value = true
  try {
    const res = await http.get('/scrm/automations')
    tableData.value = res.data?.data ?? res.data ?? []
  } catch {
    ElMessage.error('加载规则列表失败')
  } finally {
    loading.value = false
  }
}
function handleCreate() {
  router.push('/automations/new')
}
function handleEdit(row: TableItem) {
  router.push(`/automations/${row.id}`)
}
async function handleToggle(row: TableItem) {
  try {
    await http.patch(`/scrm/automations/${row.id}/toggle`)
    ElMessage.success('已切换状态')
    loadData()
  } catch {
    ElMessage.error('操作失败')
  }
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
