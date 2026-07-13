<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>外部知识库</span>
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

    <!-- 新建/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑知识库' : '新建知识库'" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="知识库名称">
          <el-input v-model="form.name" placeholder="请输入知识库名称" />
        </el-form-item>
        <el-form-item label="提供方类型">
          <el-select v-model="form.provider_type" placeholder="选择提供方">
            <el-option label="向量数据库" value="vector_db" />
            <el-option label="Elasticsearch" value="elasticsearch" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio value="active"> 启用 </el-radio>
            <el-radio value="inactive"> 停用 </el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false"> 取消 </el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit"> 确定 </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { http } from '@scrm/shared'

interface TableItem {
  id: number
  name: string
  provider_type?: string
  connection_status?: string
  status: string
  createdAt: string
}

const loading = ref(false)
const tableData = ref<TableItem[]>([])
const total = ref(0)
const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref<number | null>(null)
const submitting = ref(false)
const form = ref({ name: '', provider_type: 'vector_db', status: 'active' })

async function loadData() {
  loading.value = true
  try {
    const res = (await http.get('/scrm/external-knowledge-bases')) as any
    const items = res?.data ?? res ?? []
    tableData.value = Array.isArray(items) ? items : []
    total.value = res?.total ?? 0
  } catch {
    ElMessage.error('加载外部知识库列表失败')
  } finally {
    loading.value = false
  }
}
function handleCreate() {
  isEdit.value = false
  editId.value = null
  form.value = { name: '', provider_type: 'vector_db', status: 'active' }
  dialogVisible.value = true
}
function handleEdit(row: TableItem) {
  isEdit.value = true
  editId.value = row.id
  form.value = {
    name: row.name,
    provider_type: row.provider_type ?? 'vector_db',
    status: row.status,
  }
  dialogVisible.value = true
}
async function handleSubmit() {
  if (!form.value.name) {
    ElMessage.warning('请输入知识库名称')
    return
  }
  submitting.value = true
  try {
    if (isEdit.value && editId.value) {
      await http.put(`/scrm/external-knowledge-bases/${editId.value}`, form.value)
      ElMessage.success('已更新')
    } else {
      await http.post('/scrm/external-knowledge-bases', form.value)
      ElMessage.success('已创建')
    }
    dialogVisible.value = false
    loadData()
  } catch {
    ElMessage.error('操作失败')
  } finally {
    submitting.value = false
  }
}
async function handleDelete(row: TableItem) {
  await ElMessageBox.confirm(`确定删除知识库「${row.name}」？`)
  await http.delete(`/scrm/external-knowledge-bases/${row.id}`)
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
