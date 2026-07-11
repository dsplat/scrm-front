<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>模板消息</span>
          <el-button type="primary" @click="handleCreate">新建模板</el-button>
        </div>
      </template>
      <el-table :data="tableData" stripe style="width: 100%" v-loading="loading">
        <el-table-column type="index" width="50" />
        <el-table-column label="模板ID" prop="template_id" width="200" />
        <el-table-column label="标题" prop="title" />
        <el-table-column label="状态" prop="status" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'approved' ? 'success' : 'warning'">
              {{ row.status === 'approved' ? '已审核' : '待审核' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleSendTest(row)">测试发送</el-button>
            <el-button link type="info" @click="handleEdit(row)">配置</el-button>
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

interface TableItem {
  id: number
  template_id: string
  title: string
  status: string
}

const loading = ref(false)
const tableData = ref<TableItem[]>([])

async function loadData() {
  loading.value = true
  try {
    const res = await http.get('/scrm/wechat-templates')
    tableData.value = res.data?.data ?? res.data ?? []
  } catch {
    ElMessage.error('加载模板列表失败')
  } finally {
    loading.value = false
  }
}
function handleCreate() {
  ElMessage.info('新建模板')
}
function handleEdit(_row: TableItem) {
  ElMessage.info('配置模板')
}
async function handleSendTest(_row: TableItem) {
  ElMessage.success('测试消息已发送')
}
onMounted(loadData)
</script>
<style scoped lang="scss">
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
