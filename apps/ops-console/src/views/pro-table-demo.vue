<template>
  <div class="page-container">
    <ProTable
      :columns="columns"
      :request="fetchData"
      :search-config="searchConfig"
      :actions="actions"
    />
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import { ElTag } from 'element-plus'
import {
  ProTable,
  type ColumnConfig,
  type SearchConfig,
  type ActionConfig,
  type RequestParams,
  type RequestResult,
} from '@/components/common/ProTable'

const searchConfig: SearchConfig[] = [
  { prop: 'name', label: '名称', type: 'input', placeholder: '请输入名称' },
  {
    prop: 'status',
    label: '状态',
    type: 'select',
    placeholder: '请选择状态',
    options: [
      { label: '启用', value: 'active' },
      { label: '停用', value: 'inactive' },
    ],
  },
]

const columns: ColumnConfig[] = [
  { prop: 'id', label: 'ID', width: 80 },
  { prop: 'name', label: '名称', minWidth: 150 },
  {
    prop: 'status',
    label: '状态',
    width: 120,
    sortable: true,
    render: (row) =>
      h(ElTag, { type: row.status === 'active' ? 'success' : 'info' }, () =>
        row.status === 'active' ? '启用' : '停用',
      ),
  },
  { prop: 'createdAt', label: '创建时间', width: 180, sortable: true },
]

const actions: ActionConfig[] = [
  { label: '编辑', onClick: (row) => console.log('编辑', row) },
  { label: '删除', type: 'danger', onClick: (row) => console.log('删除', row) },
]

async function fetchData(params: RequestParams): Promise<RequestResult> {
  await new Promise((resolve) => setTimeout(resolve, 500))
  return {
    data: Array.from({ length: params.pageSize }, (_, i) => ({
      id: (params.page - 1) * params.pageSize + i + 1,
      name: `示例项目 ${(params.page - 1) * params.pageSize + i + 1}`,
      status: i % 3 === 0 ? 'inactive' : 'active',
      createdAt: '2024-01-01 12:00:00',
    })),
    total: 100,
  }
}
</script>

<style scoped lang="scss">
.page-container {
  padding: 20px;
}
</style>
