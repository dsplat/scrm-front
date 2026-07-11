<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>敏感词管理</span>
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
import { ElMessage } from 'element-plus'
import { http } from '@scrm/shared'

interface TableItem {
  id: number
  word: string
  category?: string
  level?: string
  hits_count?: number
  status: string
  createdAt: string
}

const loading = ref(false)
const tableData = ref<TableItem[]>([])

async function loadData() {
  loading.value = true
  try {
    const res = await http.get('/scrm/sensitive-words')
    tableData.value = res.data?.data ?? res.data ?? []
  } catch {
    ElMessage.error('加载敏感词列表失败')
  } finally {
    loading.value = false
  }
}
function handleCreate() {
  ElMessage.info('新建敏感词')
}
function handleEdit(_row: TableItem) {
  ElMessage.info('编辑敏感词')
}
function handleDelete(_row: TableItem) {
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
