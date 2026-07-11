<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>短信营销</span>
          <el-button type="primary" @click="handleCreate"> 新建模板 </el-button>
        </div>
      </template>

      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="短信模板" name="templates">
          <ProTable
            ref="tableRef"
            :columns="columns"
            :request="handleRequest"
            :search-config="searchConfig"
            :actions="actions"
          />
        </el-tab-pane>
        <el-tab-pane label="发送记录" name="records">
          <ProTable
            ref="recordTableRef"
            :columns="recordColumns"
            :request="handleRecordRequest"
            :search-config="recordSearchConfig"
          />
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="640px"
      :close-on-click-modal="false"
      @close="handleDialogClose"
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-form-item label="模板名称" prop="name">
          <el-input
            v-model="formData.name"
            placeholder="请输入模板名称"
            maxlength="50"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="短信内容" prop="content">
          <el-input
            v-model="formData.content"
            type="textarea"
            placeholder="请输入短信内容"
            :rows="6"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="变量说明">
          <div class="variable-tips">
            <p>支持以下变量占位符，发送时将自动替换为实际值：</p>
            <ul>
              <li><code>{name}</code> - 客户姓名</li>
              <li><code>{phone}</code> - 客户手机号</li>
              <li><code>{company}</code> - 公司名称</li>
              <li><code>{date}</code> - 当前日期</li>
            </ul>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false"> 取消 </el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit"> 确定 </el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="recordDrawerVisible" title="发送记录" size="560px">
      <template v-if="currentRecord">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="模板名称">
            {{ currentRecord.templateName }}
          </el-descriptions-item>
          <el-descriptions-item label="发送时间">
            {{ currentRecord.sentAt || currentRecord.createdAt }}
          </el-descriptions-item>
          <el-descriptions-item label="发送状态">
            <el-tag :type="getRecordStatusTagType(currentRecord.status)">
              {{ getRecordStatusLabel(currentRecord.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="短信内容">
            <div class="content-preview">
              {{ currentRecord.content }}
            </div>
          </el-descriptions-item>
        </el-descriptions>

        <el-divider>发送统计</el-divider>

        <el-row :gutter="16">
          <el-col :span="8">
            <el-statistic title="目标总数" :value="currentRecord.recipientCount" />
          </el-col>
          <el-col :span="8">
            <el-statistic title="成功" :value="currentRecord.successCount" />
          </el-col>
          <el-col :span="8">
            <el-statistic title="失败" :value="currentRecord.failCount" />
          </el-col>
        </el-row>
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
  getSmsTemplateList,
  createSmsTemplate,
  updateSmsTemplate,
  deleteSmsTemplate,
  submitSmsTemplateAudit,
  getSmsSendRecordList,
  type SmsTemplate,
  type SmsTemplateStatus,
  type SmsTemplateListParams,
  type CreateSmsTemplateData,
  type SmsSendRecord,
  type SmsSendRecordStatus,
  type SmsSendRecordListParams,
} from '@/api/scrm/sms'

defineOptions({ name: 'SmsMarketing' })

const activeTab = ref('templates')
const tableRef = ref<InstanceType<typeof ProTable>>()
const recordTableRef = ref<InstanceType<typeof ProTable>>()
const dialogVisible = ref(false)
const dialogTitle = ref('新建模板')
const submitting = ref(false)
const formRef = ref<FormInstance>()
const editingId = ref<number | undefined>(undefined)

const recordDrawerVisible = ref(false)
const currentRecord = ref<SmsSendRecord | null>(null)

const statusOptions: { label: string; value: SmsTemplateStatus }[] = [
  { label: '草稿', value: 'draft' },
  { label: '待审核', value: 'pending' },
  { label: '已通过', value: 'approved' },
  { label: '已拒绝', value: 'rejected' },
]

const recordStatusOptions: { label: string; value: SmsSendRecordStatus }[] = [
  { label: '待发送', value: 'pending' },
  { label: '发送中', value: 'sending' },
  { label: '已完成', value: 'completed' },
  { label: '失败', value: 'failed' },
]

const defaultFormData = {
  name: '',
  content: '',
}

const formData = reactive({ ...defaultFormData })

const formRules: FormRules = {
  name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
  content: [{ required: true, message: '请输入短信内容', trigger: 'blur' }],
}

const searchConfig: SearchConfig[] = [
  { prop: 'name', label: '模板名称', type: 'input', placeholder: '请输入模板名称' },
  {
    prop: 'status',
    label: '审核状态',
    type: 'select',
    placeholder: '请选择状态',
    options: statusOptions,
  },
]

const recordSearchConfig: SearchConfig[] = [
  {
    prop: 'status',
    label: '发送状态',
    type: 'select',
    placeholder: '请选择状态',
    options: recordStatusOptions,
  },
]

const columns: ColumnConfig[] = [
  { prop: 'id', label: 'ID', width: 80 },
  { prop: 'name', label: '模板名称', minWidth: 150 },
  {
    prop: 'content',
    label: '短信内容',
    minWidth: 250,
    showOverflowTooltip: true,
  },
  {
    prop: 'status',
    label: '审核状态',
    width: 100,
    render: (row: SmsTemplate) =>
      h(ElTag, { type: getStatusTagType(row.status) }, () => getStatusLabel(row.status)),
  },
  {
    prop: 'rejectReason',
    label: '拒绝原因',
    minWidth: 150,
    render: (row: SmsTemplate) => h('span', null, row.rejectReason || '-'),
  },
  { prop: 'createdAt', label: '创建时间', width: 170, sortable: true },
]

const recordColumns: ColumnConfig[] = [
  { prop: 'id', label: 'ID', width: 80 },
  { prop: 'templateName', label: '模板名称', minWidth: 150 },
  {
    prop: 'content',
    label: '短信内容',
    minWidth: 200,
    showOverflowTooltip: true,
  },
  {
    prop: 'recipientCount',
    label: '目标数',
    width: 90,
  },
  {
    prop: 'successCount',
    label: '成功数',
    width: 90,
  },
  {
    prop: 'status',
    label: '发送状态',
    width: 100,
    render: (row: SmsSendRecord) =>
      h(ElTag, { type: getRecordStatusTagType(row.status) }, () =>
        getRecordStatusLabel(row.status),
      ),
  },
  { prop: 'createdAt', label: '创建时间', width: 170, sortable: true },
]

const actions: ActionConfig[] = [
  {
    label: '编辑',
    type: 'primary',
    onClick: (row) => handleEdit(row as SmsTemplate),
    visible: (row: SmsTemplate) => row.status === 'draft' || row.status === 'rejected',
  },
  {
    label: '提交审核',
    type: 'success',
    onClick: (row) => handleSubmitAudit(row as SmsTemplate),
    visible: (row: SmsTemplate) => row.status === 'draft' || row.status === 'rejected',
  },
  {
    label: '删除',
    type: 'danger',
    onClick: (row) => handleDelete(row as SmsTemplate),
    visible: (row: SmsTemplate) => row.status !== 'pending',
  },
]

function getStatusLabel(status: SmsTemplateStatus) {
  return statusOptions.find((o) => o.value === status)?.label ?? status
}

function getStatusTagType(
  status: SmsTemplateStatus,
): 'info' | 'success' | 'primary' | 'warning' | 'danger' {
  const map: Record<SmsTemplateStatus, 'info' | 'success' | 'warning' | 'danger'> = {
    draft: 'info',
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
  }
  return map[status] ?? 'info'
}

function getRecordStatusLabel(status: SmsSendRecordStatus) {
  return recordStatusOptions.find((o) => o.value === status)?.label ?? status
}

function getRecordStatusTagType(
  status: SmsSendRecordStatus,
): 'info' | 'success' | 'primary' | 'warning' | 'danger' {
  const map: Record<SmsSendRecordStatus, 'info' | 'warning' | 'success' | 'danger'> = {
    pending: 'info',
    sending: 'warning',
    completed: 'success',
    failed: 'danger',
  }
  return map[status] ?? 'info'
}

function handleTabChange() {
  if (activeTab.value === 'templates') {
    tableRef.value?.refresh()
  } else {
    recordTableRef.value?.refresh()
  }
}

async function handleRequest(params: RequestParams): Promise<RequestResult> {
  try {
    const query: SmsTemplateListParams = {
      page: params.page,
      pageSize: params.pageSize,
    }
    if (params.name) query.name = params.name
    if (params.status) query.status = params.status
    const res = await getSmsTemplateList(query)
    return { data: res.data ?? [], total: res.total ?? 0 }
  } catch (e: any) {
    ElMessage.error(e.message || '获取模板列表失败')
    return { data: [], total: 0 }
  }
}

async function handleRecordRequest(params: RequestParams): Promise<RequestResult> {
  try {
    const query: SmsSendRecordListParams = {
      page: params.page,
      pageSize: params.pageSize,
    }
    if (params.status) query.status = params.status
    const res = await getSmsSendRecordList(query)
    return { data: res.data ?? [], total: res.total ?? 0 }
  } catch (e: any) {
    ElMessage.error(e.message || '获取发送记录失败')
    return { data: [], total: 0 }
  }
}

function resetForm() {
  Object.assign(formData, { ...defaultFormData })
}

function handleCreate() {
  dialogTitle.value = '新建模板'
  editingId.value = undefined
  resetForm()
  dialogVisible.value = true
}

function handleEdit(row: SmsTemplate) {
  dialogTitle.value = '编辑模板'
  editingId.value = row.id
  formData.name = row.name
  formData.content = row.content
  dialogVisible.value = true
}

async function handleSubmitAudit(row: SmsTemplate) {
  try {
    await ElMessageBox.confirm('确定提交审核吗？提交后将无法编辑。', '提示', { type: 'warning' })
    await submitSmsTemplateAudit(row.id)
    ElMessage.success('提交审核成功')
    tableRef.value?.refresh()
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e.message || '提交审核失败')
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

  const payload: CreateSmsTemplateData = {
    name: formData.name,
    content: formData.content,
  }

  submitting.value = true
  try {
    if (editingId.value !== undefined) {
      await updateSmsTemplate(editingId.value, payload)
    } else {
      await createSmsTemplate(payload)
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

async function handleDelete(row: SmsTemplate) {
  try {
    await ElMessageBox.confirm('确定删除该模板吗？', '提示', { type: 'warning' })
    await deleteSmsTemplate(row.id)
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

.variable-tips {
  background-color: var(--el-fill-color-light);
  border-radius: 6px;
  padding: 12px 16px;
  width: 100%;
}

.variable-tips p {
  margin: 0 0 8px;
  color: var(--el-text-color-regular);
  font-size: 13px;
}

.variable-tips ul {
  margin: 0;
  padding-left: 20px;
}

.variable-tips li {
  color: var(--el-text-color-regular);
  font-size: 13px;
  line-height: 1.8;
}

.variable-tips code {
  background-color: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}

.content-preview {
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
}
</style>
