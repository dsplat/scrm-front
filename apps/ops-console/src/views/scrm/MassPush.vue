<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>群发助手</span>
          <el-button type="primary" @click="handleCreate"> 新建任务 </el-button>
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

    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="640px"
      :close-on-click-modal="false"
      @close="handleDialogClose"
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-form-item label="任务名称" prop="name">
          <el-input
            v-model="formData.name"
            placeholder="请输入任务名称"
            maxlength="50"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="发送内容" prop="content">
          <el-input
            v-model="formData.content"
            type="textarea"
            placeholder="请输入发送内容"
            :rows="4"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="发送对象" prop="targetType">
          <el-select v-model="formData.targetType" placeholder="请选择发送对象" style="width: 100%">
            <el-option
              v-for="opt in targetTypeOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="formData.targetType !== 'all'" label="对象值" prop="targetValue">
          <el-input
            v-model="formData.targetValue"
            :placeholder="formData.targetType === 'group' ? '请输入群ID' : '请输入标签名称'"
          />
        </el-form-item>
        <el-form-item label="定时发送" prop="enableSchedule">
          <el-switch v-model="formData.enableSchedule" />
        </el-form-item>
        <el-form-item v-if="formData.enableSchedule" label="发送时间" prop="scheduledTime">
          <el-date-picker
            v-model="formData.scheduledTime"
            type="datetime"
            placeholder="请选择发送时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false"> 取消 </el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit"> 确定 </el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="detailVisible" title="任务详情" size="480px">
      <template v-if="currentTask">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="任务名称">
            {{ currentTask.name }}
          </el-descriptions-item>
          <el-descriptions-item label="发送对象">
            {{ getTargetLabel(currentTask) }}
          </el-descriptions-item>
          <el-descriptions-item label="发送时间">
            {{ currentTask.scheduledTime || '立即发送' }}
          </el-descriptions-item>
          <el-descriptions-item label="任务状态">
            <el-tag :type="getStatusTagType(currentTask.status) as any">
              {{ getStatusLabel(currentTask.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="发送内容">
            <div class="content-preview">
              {{ currentTask.content }}
            </div>
          </el-descriptions-item>
        </el-descriptions>

        <el-divider>发送统计</el-divider>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-statistic title="目标总数" :value="currentTask.totalCount" />
          </el-col>
          <el-col :span="12">
            <el-statistic title="已发送" :value="currentTask.sentCount" />
          </el-col>
          <el-col :span="12">
            <el-statistic title="成功" :value="currentTask.successCount" />
          </el-col>
          <el-col :span="12">
            <el-statistic title="失败" :value="currentTask.failCount" />
          </el-col>
        </el-row>

        <el-progress
          v-if="currentTask.totalCount > 0"
          :percentage="Math.round((currentTask.sentCount / currentTask.totalCount) * 100)"
          :status="currentTask.status === 'completed' ? 'success' : undefined"
          style="margin-top: 16px"
        />
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, h } from 'vue'
import { ElMessage, ElMessageBox, ElTag, type FormInstance, type FormRules } from 'element-plus'
import ProTable from '@/components/common/ProTable/ProTable.vue'
import type {
  ColumnConfig,
  SearchConfig,
  ActionConfig,
  RequestParams,
  RequestResult,
} from '@/components/common/ProTable/ProTable.vue'
import {
  getMassPushList,
  createMassPush,
  updateMassPush,
  deleteMassPush,
  pauseMassPush,
  resumeMassPush,
  type MassPushTask,
  type CreateMassPushData,
} from '@/api/scrm/massPush'

defineOptions({ name: 'MassPush' })

const tableRef = ref<InstanceType<typeof ProTable>>()
const dialogVisible = ref(false)
const dialogTitle = ref('新建任务')
const submitting = ref(false)
const formRef = ref<FormInstance>()
const editingId = ref<number | null>(null)

const detailVisible = ref(false)
const currentTask = ref<MassPushTask | null>(null)

const targetTypeOptions = [
  { label: '全部客户', value: 'all' },
  { label: '指定群', value: 'group' },
  { label: '指定标签', value: 'tag' },
]

const statusOptions = [
  { label: '待发送', value: 'pending' },
  { label: '发送中', value: 'sending' },
  { label: '已暂停', value: 'paused' },
  { label: '已完成', value: 'completed' },
  { label: '失败', value: 'failed' },
]

const defaultFormData = {
  name: '',
  content: '',
  targetType: 'all' as 'all' | 'group' | 'tag',
  targetValue: '',
  enableSchedule: false,
  scheduledTime: '',
}

const formData = reactive({ ...defaultFormData })

const formRules: FormRules = {
  name: [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
  content: [{ required: true, message: '请输入发送内容', trigger: 'blur' }],
  targetType: [{ required: true, message: '请选择发送对象', trigger: 'change' }],
  targetValue: [
    {
      validator: (_rule: FormRules[string], _value: string, callback: (error?: Error) => void) => {
        if (formData.targetType !== 'all' && !formData.targetValue) {
          callback(new Error('请输入对象值'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
  scheduledTime: [
    {
      validator: (_rule: FormRules[string], _value: string, callback: (error?: Error) => void) => {
        if (formData.enableSchedule && !formData.scheduledTime) {
          callback(new Error('请选择发送时间'))
        } else {
          callback()
        }
      },
      trigger: 'change',
    },
  ],
}

const searchConfig: SearchConfig[] = [
  { prop: 'name', label: '任务名称', type: 'input', placeholder: '请输入任务名称' },
  {
    prop: 'status',
    label: '状态',
    type: 'select',
    placeholder: '请选择状态',
    options: statusOptions,
  },
]

const columns: ColumnConfig[] = [
  { prop: 'id', label: 'ID', width: 80 },
  { prop: 'name', label: '任务名称', minWidth: 150 },
  {
    prop: 'targetType',
    label: '发送范围',
    width: 120,
    render: (row: MassPushTask) => h('span', null, getTargetLabel(row)),
  },
  {
    prop: 'scheduledTime',
    label: '发送时间',
    width: 170,
    render: (row: MassPushTask) => h('span', null, row.scheduledTime || '立即发送'),
  },
  {
    prop: 'status',
    label: '状态',
    width: 100,
    render: (row: MassPushTask) =>
      h(ElTag, { type: getStatusTagType(row.status) as any }, () => getStatusLabel(row.status)),
  },
  {
    prop: 'sentCount',
    label: '发送进度',
    width: 120,
    render: (row: MassPushTask) => h('span', null, `${row.sentCount}/${row.totalCount}`),
  },
  { prop: 'createdAt', label: '创建时间', width: 170, sortable: true },
]

const actions: ActionConfig[] = [
  { label: '详情', type: 'primary', onClick: (row) => handleDetail(row as MassPushTask) },
  {
    label: '暂停',
    type: 'warning',
    onClick: (row) => handlePauseResume(row as MassPushTask),
    visible: (row: MassPushTask) => row.status === 'sending' || row.status === 'pending',
  },
  {
    label: '继续',
    type: 'success',
    onClick: (row) => handlePauseResume(row as MassPushTask),
    visible: (row: MassPushTask) => row.status === 'paused',
  },
  { label: '编辑', type: 'primary', onClick: (row) => handleEdit(row as MassPushTask) },
  { label: '删除', type: 'danger', onClick: (row) => handleDelete(row as MassPushTask) },
]

function getTargetLabel(row: MassPushTask) {
  const opt = targetTypeOptions.find((o) => o.value === row.targetType)
  if (!opt) return row.targetType
  if (row.targetType === 'all') return opt.label
  return `${opt.label}(${row.targetValue})`
}

function getStatusLabel(status: string) {
  return statusOptions.find((o) => o.value === status)?.label ?? status
}

function getStatusTagType(status: string) {
  const map: Record<string, string> = {
    pending: 'info',
    sending: 'warning',
    paused: 'warning',
    completed: 'success',
    failed: 'danger',
  }
  return map[status] ?? 'info'
}

async function handleRequest(params: RequestParams): Promise<RequestResult> {
  try {
    const query: Record<string, any> = {
      page: params.page,
      pageSize: params.pageSize,
    }
    if (params.name) query.name = params.name
    if (params.status) query.status = params.status
    const res = await getMassPushList(query as any)
    return { data: res.data ?? [], total: res.total ?? 0 }
  } catch (e: any) {
    ElMessage.error(e.message || '获取任务列表失败')
    return { data: [], total: 0 }
  }
}

function resetForm() {
  Object.assign(formData, { ...defaultFormData })
}

function handleCreate() {
  dialogTitle.value = '新建任务'
  editingId.value = null
  resetForm()
  dialogVisible.value = true
}

function handleEdit(row: MassPushTask) {
  dialogTitle.value = '编辑任务'
  editingId.value = row.id
  formData.name = row.name
  formData.content = row.content
  formData.targetType = row.targetType
  formData.targetValue = row.targetValue
  formData.enableSchedule = !!row.scheduledTime
  formData.scheduledTime = row.scheduledTime || ''
  dialogVisible.value = true
}

function handleDetail(row: MassPushTask) {
  currentTask.value = row
  detailVisible.value = true
}

async function handlePauseResume(row: MassPushTask) {
  const isPause = row.status === 'sending' || row.status === 'pending'
  const actionText = isPause ? '暂停' : '继续'

  try {
    await ElMessageBox.confirm(`确定${actionText}该任务吗？`, '提示', { type: 'warning' })
    if (isPause) {
      await pauseMassPush(row.id)
    } else {
      await resumeMassPush(row.id)
    }
    ElMessage.success(`${actionText}成功`)
    tableRef.value?.refresh()
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e.message || `${actionText}失败`)
    }
  }
}

async function handleSubmit() {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  const payload: CreateMassPushData = {
    name: formData.name,
    content: formData.content,
    targetType: formData.targetType,
    targetValue: formData.targetType === 'all' ? '' : formData.targetValue,
    scheduledTime: formData.enableSchedule ? formData.scheduledTime : undefined,
  }

  submitting.value = true
  try {
    if (editingId.value !== null) {
      await updateMassPush(editingId.value, payload)
    } else {
      await createMassPush(payload)
    }
    ElMessage.success('操作成功')
    dialogVisible.value = false
    tableRef.value?.refresh()
  } catch (e: any) {
    ElMessage.error(e.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

async function handleDelete(row: MassPushTask) {
  try {
    await ElMessageBox.confirm('确定删除该任务吗？', '提示', { type: 'warning' })
    await deleteMassPush(row.id)
    ElMessage.success('删除成功')
    tableRef.value?.refresh()
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e.message || '删除失败')
    }
  }
}

function handleDialogClose() {
  formRef.value?.resetFields()
}
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.content-preview {
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
}
</style>
