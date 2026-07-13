<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>定时触达</span>
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
      width="600px"
      :close-on-click-modal="false"
      @close="formRef?.resetFields()"
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-form-item label="任务名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入任务名称" maxlength="50" />
        </el-form-item>
        <el-form-item label="渠道类型" prop="channelType">
          <el-select v-model="formData.channelType" placeholder="请选择渠道" style="width: 100%">
            <el-option label="微信" value="wechat" />
            <el-option label="企业微信" value="wechat_work" />
            <el-option label="短信" value="sms" />
          </el-select>
        </el-form-item>
        <el-form-item label="目标类型" prop="targetType">
          <el-select v-model="formData.targetType" placeholder="请选择目标" style="width: 100%">
            <el-option label="全部客户" value="all_customers" />
            <el-option label="标签客户" value="tagged_customers" />
            <el-option label="社群成员" value="community_members" />
          </el-select>
        </el-form-item>
        <el-form-item label="定时发送" prop="scheduledAt">
          <el-date-picker
            v-model="formData.scheduledAt"
            type="datetime"
            placeholder="选择发送时间"
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
  </div>
</template>

<script setup lang="ts">
import { ref, h, reactive } from 'vue'
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
  getScheduledReachList,
  createScheduledReach,
  updateScheduledReach,
  deleteScheduledReach,
  executeScheduledReach,
  type ScheduledReach,
  type ScheduledReachListParams,
} from '@/modules/marketing/api/scheduledReach'

defineOptions({ name: 'ScheduledReach' })

const tableRef = ref<InstanceType<typeof ProTable>>()
const dialogVisible = ref(false)
const dialogTitle = ref('新建任务')
const submitting = ref(false)
const formRef = ref<FormInstance>()
const editingId = ref<number | null>(null)

const defaultFormData = {
  name: '',
  channelType: '',
  targetType: '',
  scheduledAt: '',
}

const formData = reactive({ ...defaultFormData })

const formRules: FormRules = {
  name: [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
  channelType: [{ required: true, message: '请选择渠道类型', trigger: 'change' }],
  targetType: [{ required: true, message: '请选择目标类型', trigger: 'change' }],
}

const statusMap: Record<number, { label: string; type: string }> = {
  0: { label: '待执行', type: 'info' },
  1: { label: '执行中', type: 'warning' },
  2: { label: '已完成', type: 'success' },
  3: { label: '已取消', type: 'danger' },
}

const searchConfig: SearchConfig[] = [
  { prop: 'name', label: '任务名称', type: 'input', placeholder: '请输入任务名称' },
  {
    prop: 'status',
    label: '状态',
    type: 'select',
    placeholder: '请选择',
    options: Object.entries(statusMap).map(([k, v]) => ({ label: v.label, value: k })),
  },
]

const columns: ColumnConfig[] = [
  { prop: 'id', label: 'ID', width: 80 },
  { prop: 'name', label: '任务名称', minWidth: 150 },
  { prop: 'channelType', label: '渠道', width: 100 },
  { prop: 'targetType', label: '目标类型', width: 120 },
  {
    prop: 'sentCount',
    label: '发送/目标',
    width: 120,
    render: (row: ScheduledReach) =>
      h('span', null, `${row.sentCount ?? 0}/${row.targetCount ?? 0}`),
  },
  { prop: 'scheduledAt', label: '定时发送', width: 180 },
  {
    prop: 'status',
    label: '状态',
    width: 90,
    render: (row: ScheduledReach) => {
      const s = statusMap[row.status] ?? { label: '未知', type: 'info' }
      return h(ElTag, { type: s.type as any }, () => s.label)
    },
  },
  { prop: 'createdAt', label: '创建时间', width: 180, sortable: true },
]

const actions: ActionConfig[] = [
  {
    label: '执行',
    type: 'success',
    onClick: (row) => handleExecute(row as ScheduledReach),
  },
  { label: '编辑', type: 'primary', onClick: (row) => handleEdit(row as ScheduledReach) },
  { label: '删除', type: 'danger', onClick: (row) => handleDelete(row as ScheduledReach) },
]

async function handleRequest(params: RequestParams): Promise<RequestResult> {
  try {
    const query: ScheduledReachListParams = { page: params.page, pageSize: params.pageSize }
    if (params.name) query.name = params.name
    if (params.status !== undefined) query.status = Number(params.status)
    const res = await getScheduledReachList(query)
    return { data: res.data ?? [], total: res.total ?? 0 }
  } catch (e: any) {
    ElMessage.error(e.message || '获取定时触达列表失败')
    return { data: [], total: 0 }
  }
}

function handleCreate() {
  dialogTitle.value = '新建任务'
  editingId.value = null
  Object.assign(formData, defaultFormData)
  dialogVisible.value = true
}

function handleEdit(row: ScheduledReach) {
  dialogTitle.value = '编辑任务'
  editingId.value = row.id
  formData.name = row.name
  formData.channelType = row.channelType
  formData.targetType = row.targetType
  formData.scheduledAt = row.scheduledAt || ''
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  submitting.value = true
  try {
    if (editingId.value !== null) {
      await updateScheduledReach(editingId.value, formData)
    } else {
      await createScheduledReach(formData)
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

async function handleExecute(row: ScheduledReach) {
  try {
    await ElMessageBox.confirm('确定立即执行该触达任务吗？', '提示', { type: 'warning' })
    await executeScheduledReach(row.id)
    ElMessage.success('任务已提交执行')
    tableRef.value?.refresh()
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e.message || '执行失败')
    }
  }
}

async function handleDelete(row: ScheduledReach) {
  try {
    await ElMessageBox.confirm('确定删除该任务吗？', '提示', { type: 'warning' })
    await deleteScheduledReach(row.id)
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
