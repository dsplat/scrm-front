<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>朋友圈 SOP</span>
          <el-button type="primary" @click="handleCreate">新建 SOP</el-button>
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
      :initial-data="currentItem"
      :on-submit="handleSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, h } from 'vue'
import { ElMessage, ElMessageBox, ElTag } from 'element-plus'
import ProTable from '@/components/common/ProTable/ProTable.vue'
import type { ColumnConfig, SearchConfig, ActionConfig, RequestParams, RequestResult } from '@/components/common/ProTable/ProTable.vue'
import ProFormDialog from '@/components/common/ProFormDialog/ProFormDialog.vue'
import type { FieldConfig } from '@/components/common/ProFormDialog/ProFormDialog.vue'
import {
  getMomentsSopList,
  createMomentsSop,
  updateMomentsSop,
  deleteMomentsSop,
  toggleMomentsSop,
  type MomentsSop,
} from '@/api/scrm/momentsSop'

defineOptions({ name: 'MomentsSOP' })

const tableRef = ref<InstanceType<typeof ProTable>>()
const dialogVisible = ref(false)
const dialogTitle = ref('新建 SOP')
const currentItem = ref<Partial<MomentsSop>>({})

const searchConfig: SearchConfig[] = [
  { prop: 'name', label: 'SOP 名称', type: 'input', placeholder: '请输入 SOP 名称' },
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
  { prop: 'name', label: 'SOP 名称', minWidth: 150 },
  { prop: 'content', label: '内容', minWidth: 200, showOverflowTooltip: true },
  { prop: 'executeTime', label: '执行时间', width: 180 },
  {
    prop: 'status',
    label: '状态',
    width: 100,
    render: (row: MomentsSop) =>
      h(ElTag, { type: row.status === 1 ? 'success' : 'danger' }, () =>
        row.status === 1 ? '启用' : '禁用',
      ),
  },
  { prop: 'createdAt', label: '创建时间', width: 180, sortable: true },
]

const actions: ActionConfig[] = [
  { label: '编辑', type: 'primary', onClick: (row) => handleEdit(row as MomentsSop) },
  {
    label: '启用',
    type: 'success',
    onClick: (row) => handleToggle(row as MomentsSop, 1),
    visible: (row: MomentsSop) => row.status === 0,
  },
  {
    label: '停用',
    type: 'warning',
    onClick: (row) => handleToggle(row as MomentsSop, 0),
    visible: (row: MomentsSop) => row.status === 1,
  },
  { label: '删除', type: 'danger', onClick: (row) => handleDelete(row as MomentsSop) },
]

const fields: FieldConfig[] = [
  { prop: 'name', label: 'SOP 名称', type: 'input', required: true, maxlength: 50 },
  { prop: 'content', label: '内容', type: 'textarea', required: true, rows: 4 },
  { prop: 'executeTime', label: '执行时间', type: 'date-picker', required: true, dateType: 'datetime', format: 'YYYY-MM-DD HH:mm:ss', valueFormat: 'YYYY-MM-DD HH:mm:ss' },
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
  try {
    const query: Record<string, any> = {
      page: params.page,
      pageSize: params.pageSize,
    }
    if (params.name) query.name = params.name
    if (params.status !== undefined && params.status !== '') query.status = params.status
    const res = await getMomentsSopList(query as any)
    return { data: res.data ?? [], total: res.total ?? 0 }
  } catch (e: any) {
    ElMessage.error(e.message || '获取 SOP 列表失败')
    return { data: [], total: 0 }
  }
}

function handleCreate() {
  dialogTitle.value = '新建 SOP'
  currentItem.value = { status: 1 }
  dialogVisible.value = true
}

function handleEdit(row: MomentsSop) {
  dialogTitle.value = '编辑 SOP'
  currentItem.value = { ...row }
  dialogVisible.value = true
}

async function handleSubmit(data: Record<string, any>) {
  if (data.id) {
    const { id, ...updateData } = data
    await updateMomentsSop(id, updateData)
  } else {
    const { name, content, executeTime, status } = data
    await createMomentsSop({ name, content, executeTime, status })
  }
  tableRef.value?.refresh()
}

async function handleToggle(row: MomentsSop, status: number) {
  try {
    await toggleMomentsSop(row.id, status)
    ElMessage.success(status === 1 ? '已启用' : '已停用')
    tableRef.value?.refresh()
  } catch (e: any) {
    ElMessage.error(e.message || '操作失败')
  }
}

async function handleDelete(row: MomentsSop) {
  try {
    await ElMessageBox.confirm('确定删除该 SOP 吗？', '提示', { type: 'warning' })
    await deleteMomentsSop(row.id)
    ElMessage.success('删除成功')
    tableRef.value?.refresh()
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e.message || '删除失败')
    }
  }
}
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
