<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>海报管理</span>
          <el-button type="primary" @click="handleCreate">新建海报</el-button>
        </div>
      </template>

      <ProTable
        ref="tableRef"
        :columns="columns"
        :request="handleRequest"
        :search-config="searchConfig"
        :actions="actions"
      />
    </el-card>

    <ProFormDialog
      v-model="dialogVisible"
      :title="dialogTitle"
      :fields="fields"
      :initial-data="currentPoster"
      :on-submit="handleSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import ProTable from '@/components/common/ProTable/ProTable.vue'
import type { ColumnConfig, SearchConfig, ActionConfig, RequestParams, RequestResult } from '@/components/common/ProTable/ProTable.vue'
import ProFormDialog from '@/components/common/ProFormDialog/ProFormDialog.vue'
import type { FieldConfig } from '@/components/common/ProFormDialog/ProFormDialog.vue'
import {
  getPosterList,
  createPoster,
  updatePoster,
  deletePoster,
  type Poster,
} from '@/api/scrm/poster'

defineOptions({ name: 'PosterManagement' })

const tableRef = ref()
const dialogVisible = ref(false)
const dialogTitle = ref('新建海报')
const currentPoster = ref<Record<string, any>>({})

const searchConfig: SearchConfig[] = [
  { prop: 'title', label: '海报名称', type: 'input', placeholder: '请输入海报名称' },
  {
    prop: 'status',
    label: '状态',
    type: 'select',
    placeholder: '请选择状态',
    options: [
      { label: '启用', value: 1 },
      { label: '禁用', value: 0 },
    ],
  },
]

const columns: ColumnConfig[] = [
  { prop: 'id', label: 'ID', width: 80 },
  { prop: 'title', label: '海报名称', minWidth: 150 },
  { prop: 'imageUrl', label: '海报图片', minWidth: 120 },
  { prop: 'jumpUrl', label: '跳转链接', minWidth: 200, showOverflowTooltip: true },
  { prop: 'status', label: '状态', width: 100 },
  { prop: 'createdAt', label: '创建时间', width: 180, sortable: true },
]

const actions: ActionConfig[] = [
  { label: '编辑', type: 'primary', onClick: (row) => handleEdit(row as Poster) },
  { label: '删除', type: 'danger', onClick: (row) => handleDelete(row as Poster) },
]

const fields: FieldConfig[] = [
  { prop: 'title', label: '海报名称', type: 'input', required: true, maxlength: 50 },
  { prop: 'imageUrl', label: '海报图片', type: 'input', required: true, placeholder: '请输入图片URL' },
  { prop: 'jumpUrl', label: '跳转链接', type: 'input', placeholder: '请输入跳转链接' },
  {
    prop: 'status',
    label: '状态',
    type: 'radio',
    required: true,
    options: [
      { label: '启用', value: 1 },
      { label: '禁用', value: 0 },
    ],
  },
]

async function handleRequest(params: RequestParams): Promise<RequestResult> {
  const res = await getPosterList({
    page: params.page,
    pageSize: params.pageSize,
    title: params.title,
    status: params.status,
  })
  return { data: res.data ?? [], total: res.total ?? 0 }
}

function handleCreate() {
  dialogTitle.value = '新建海报'
  currentPoster.value = { status: 1 }
  dialogVisible.value = true
}

function handleEdit(row: Poster) {
  dialogTitle.value = '编辑海报'
  currentPoster.value = { ...row }
  dialogVisible.value = true
}

async function handleSubmit(data: Record<string, any>) {
  if (data.id) {
    await updatePoster(data.id, data)
    ElMessage.success('更新成功')
  } else {
    await createPoster(data)
    ElMessage.success('创建成功')
  }
  tableRef.value?.refresh()
}

async function handleDelete(row: Poster) {
  await ElMessageBox.confirm('确定删除该海报吗？', '提示', { type: 'warning' })
  await deletePoster(row.id)
  ElMessage.success('删除成功')
  tableRef.value?.refresh()
}
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
