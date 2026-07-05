<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>合规审查</span>
          <el-radio-group v-model="statusFilter" size="small" @change="loadData">
            <el-radio-button value="pending">待审查</el-radio-button>
            <el-radio-button value="approved">已通过</el-radio-button>
            <el-radio-button value="rejected">已拒绝</el-radio-button>
          </el-radio-group>
        </div>
      </template>
      <el-table :data="tableData" stripe style="width: 100%" v-loading="loading">
        <el-table-column type="index" width="50" />
        <el-table-column label="内容" prop="content" show-overflow-tooltip />
        <el-table-column label="类型" prop="type" width="100" />
        <el-table-column label="审查结果" prop="result" width="100">
          <template #default="{ row }">
            <el-tag :type="row.result === 'approved' ? 'success' : row.result === 'rejected' ? 'danger' : 'warning'">
              {{ row.result === 'approved' ? '通过' : row.result === 'rejected' ? '拒绝' : '待审查' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="时间" prop="createdAt" width="180" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleReview(row)">审查</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { http } from '@scrm/shared'

interface TableItem { id: number; content: string; type: string; result: string; createdAt: string }

const loading = ref(false)
const tableData = ref<TableItem[]>([])
const statusFilter = ref('pending')

async function loadData() {
  loading.value = true
  try {
    const res = await http.get('/scrm/compliance/reviews', { params: { status: statusFilter.value } })
    tableData.value = res.data?.data ?? res.data ?? []
  } catch { ElMessage.error('加载审查列表失败') } finally { loading.value = false }
}
function handleReview(_row: TableItem) { ElMessage.info('审查详情') }
onMounted(loadData)
</script>
<style scoped lang="scss">
.card-header { display: flex; justify-content: space-between; align-items: center; }
</style>
