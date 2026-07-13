<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>海报管理</span>
          <el-button type="primary" @click="handleCreate"> 新建海报 </el-button>
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
import { ref, h } from 'vue'
import { ElMessage, ElMessageBox, ElImage, ElTag } from 'element-plus'
import ProTable from '@/components/common/ProTable/ProTable.vue'
import type {
  ColumnConfig,
  SearchConfig,
  ActionConfig,
  RequestParams,
  RequestResult,
} from '@/components/common/ProTable/ProTable.vue'
import ProFormDialog from '@/components/common/ProFormDialog/ProFormDialog.vue'
import type { FieldConfig } from '@/components/common/ProFormDialog/ProFormDialog.vue'
import {
  getPosterList,
  createPoster,
  updatePoster,
  deletePoster,
  type Poster,
} from '@/modules/marketing/api/poster'

defineOptions({ name: 'PosterManagement' })

const tableRef = ref<InstanceType<typeof ProTable>>()
const dialogVisible = ref(false)
const dialogTitle = ref('新建海报')
const currentPoster = ref<Partial<Poster>>({})

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
  {
    prop: 'imageUrl',
    label: '海报图片',
    minWidth: 120,
    render: (row: Poster) =>
      h(ElImage, {
        src: row.imageUrl,
        style: 'width: 60px; height: 60px',
        previewSrcList: [row.imageUrl],
        fit: 'cover',
      }),
  },
  { prop: 'jumpUrl', label: '跳转链接', minWidth: 200, showOverflowTooltip: true },
  {
    prop: 'status',
    label: '状态',
    width: 100,
    render: (row: Poster) =>
      h(ElTag, { type: row.status === 1 ? 'success' : 'danger' }, () =>
        row.status === 1 ? '启用' : '禁用',
      ),
  },
  { prop: 'createdAt', label: '创建时间', width: 180, sortable: true },
]

const actions: ActionConfig[] = [
  { label: '编辑', type: 'primary', onClick: (row) => handleEdit(row as Poster) },
  { label: '删除', type: 'danger', onClick: (row) => handleDelete(row as Poster) },
]

const fields: FieldConfig[] = [
  { prop: 'title', label: '海报名称', type: 'input', required: true, maxlength: 50 },
  {
    prop: 'imageUrl',
    label: '海报图片',
    type: 'input',
    required: true,
    placeholder: '请输入图片URL',
  },
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
  try {
    const query: Record<string, any> = {
      page: params.page,
      pageSize: params.pageSize,
    }
    if (params.title) query.title = params.title
    if (params.status !== undefined && params.status !== '') query.status = params.status
    const res = await getPosterList(query as any)
    return { data: res.data ?? [], total: res.total ?? 0 }
  } catch (e: any) {
    ElMessage.error(e.message || '获取海报列表失败')
    return { data: [], total: 0 }
  }
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
    const { id, ...updateData } = data
    await updatePoster(id, updateData)
  } else {
    const { title, imageUrl, jumpUrl, status } = data
    await createPoster({ title, imageUrl, jumpUrl, status })
  }
  tableRef.value?.refresh()
}

async function handleDelete(row: Poster) {
  try {
    await ElMessageBox.confirm('确定删除该海报吗？', '提示', { type: 'warning' })
    await deletePoster(row.id)
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
