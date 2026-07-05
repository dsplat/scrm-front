<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>AI Agent</span>
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
import { ElMessage, ElMessageBox } from 'element-plus'
import { listAgents, toggleAgent } from '@/api/agents'

interface TableItem { id: number; name: string; role?: string; status: string; conversations_count?: number; createdAt: string }

const router = useRouter()
const loading = ref(false)
const tableData = ref<TableItem[]>([])

async function loadData() {
  loading.value = true
  try {
    const res = await listAgents()
    tableData.value = res?.data ?? res ?? []
  } catch {
    ElMessage.error('加载 Agent 列表失败')
  } finally {
    loading.value = false
  }
}

function handleCreate() { router.push('/agents/new') }
function handleEdit(row: TableItem) { router.push(`/agents/${row.id}`) }
async function handleToggle(row: TableItem) {
  await toggleAgent(row.id)
  ElMessage.success(row.status === 'active' ? '已停用' : '已启用')
  loadData()
}

onMounted(loadData)
</script>

<style scoped lang="scss">
.card-header { display: flex; justify-content: space-between; align-items: center; }
.pagination-wrapper { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
