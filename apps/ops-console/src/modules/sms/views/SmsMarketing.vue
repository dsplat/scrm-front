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
            ref="templateTableRef"
            :columns="templateColumns"
            :request="handleRequest"
            :search-config="templateSearchConfig"
            :actions="templateActions"
          />
        </el-tab-pane>
        <el-tab-pane label="发送记录" name="records">
          <ProTable
            ref="recordTableRef"
            :columns="recordColumns"
            :request="handleRecordRequest"
            :search-config="recordSearchConfig"
            :actions="recordActions"
            :immediate="false"
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
            maxlength="30"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="短信内容" prop="content">
          <el-input
            v-model="formData.content"
            type="textarea"
            placeholder="请输入短信内容"
            :rows="5"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="变量说明">
          <el-input
            v-model="formData.variables"
            type="textarea"
            placeholder="请说明模板中使用的变量占位符，例如：{name} - 客户姓名"
            :rows="3"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false"> 取消 </el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit"> 确定 </el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="recordDrawerVisible" title="发送详情" size="480px">
      <el-descriptions v-if="currentRecord" :column="1" border>
        <el-descriptions-item label="模板名称">
          {{ currentRecord.templateName }}
        </el-descriptions-item>
        <el-descriptions-item label="手机号">
          {{ maskPhone(currentRecord.phone) }}
        </el-descriptions-item>
        <el-descriptions-item label="短信内容">
          {{ currentRecord.content }}
        </el-descriptions-item>
        <el-descriptions-item label="发送状态">
          <el-tag
            :type="
              currentRecord.status === 'success'
                ? 'success'
                : currentRecord.status === 'failed'
                  ? 'danger'
                  : 'warning'
            "
          >
            {{ recordStatusMap[currentRecord.status] }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item v-if="currentRecord.failReason" label="失败原因">
          {{ currentRecord.failReason }}
        </el-descriptions-item>
        <el-descriptions-item label="发送时间">
          {{ currentRecord.sentAt }}
        </el-descriptions-item>
      </el-descriptions>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, h } from 'vue'
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
  getSmsRecordList,
  type SmsTemplate,
  type SmsTemplateStatus,
  type SmsRecord,
} from '@/modules/sms/api/sms'

defineOptions({ name: 'SmsMarketing' })

function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone
  return phone.slice(0, 3) + '****' + phone.slice(-4)
}

const statusMap: Record<SmsTemplateStatus, string> = {
  draft: '草稿',
  pending: '待审核',
  approved: '已通过',
  rejected: '已拒绝',
}

const statusTypeMap: Record<SmsTemplateStatus, 'info' | 'warning' | 'success' | 'danger'> = {
  draft: 'info',
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
}

const recordStatusMap: Record<SmsRecord['status'], string> = {
  sending: '发送中',
  success: '成功',
  failed: '失败',
}

const activeTab = ref('templates')
const dialogVisible = ref(false)
const dialogType = ref<'create' | 'edit'>('create')
const editingId = ref<number>()
const submitting = ref(false)
const formRef = ref<FormInstance>()
const templateTableRef = ref<InstanceType<typeof ProTable>>()
const recordTableRef = ref<InstanceType<typeof ProTable>>()
const recordDrawerVisible = ref(false)
const currentRecord = ref<SmsRecord | null>(null)

const formData = reactive({
  name: '',
  content: '',
  variables: '',
})

const formRules: FormRules = {
  name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
  content: [{ required: true, message: '请输入短信内容', trigger: 'blur' }],
}

const dialogTitle = computed(() => (dialogType.value === 'create' ? '新建模板' : '编辑模板'))

const templateSearchConfig: SearchConfig[] = [
  { prop: 'name', label: '模板名称', type: 'input', placeholder: '请输入模板名称' },
  {
    prop: 'status',
    label: '审核状态',
    type: 'select',
    placeholder: '请选择状态',
    options: [
      { label: '草稿', value: 'draft' },
      { label: '待审核', value: 'pending' },
      { label: '已通过', value: 'approved' },
      { label: '已拒绝', value: 'rejected' },
    ],
  },
]

const templateColumns: ColumnConfig[] = [
  { prop: 'name', label: '模板名称', minWidth: 150 },
  { prop: 'content', label: '短信内容', minWidth: 250 },
  {
    prop: 'status',
    label: '审核状态',
    width: 100,
    render: (row: SmsTemplate) =>
      h(ElTag, { type: statusTypeMap[row.status] }, () => statusMap[row.status]),
  },
  { prop: 'createdAt', label: '创建时间', width: 180 },
]

const templateActions: ActionConfig[] = [
  {
    label: '编辑',
    onClick: (row: SmsTemplate) => handleEdit(row),
    visible: (row: SmsTemplate) => row.status === 'draft' || row.status === 'rejected',
  },
  {
    label: '提交审核',
    type: 'success',
    onClick: (row: SmsTemplate) => handleAudit(row),
    visible: (row: SmsTemplate) => row.status === 'draft' || row.status === 'rejected',
  },
  {
    label: '删除',
    type: 'danger',
    onClick: (row: SmsTemplate) => handleDelete(row),
    visible: (row: SmsTemplate) => row.status === 'draft' || row.status === 'rejected',
  },
]

const recordSearchConfig: SearchConfig[] = [
  { prop: 'templateName', label: '模板名称', type: 'input', placeholder: '请输入模板名称' },
  {
    prop: 'status',
    label: '发送状态',
    type: 'select',
    placeholder: '请选择状态',
    options: [
      { label: '发送中', value: 'sending' },
      { label: '成功', value: 'success' },
      { label: '失败', value: 'failed' },
    ],
  },
]

const recordColumns: ColumnConfig[] = [
  { prop: 'templateName', label: '模板名称', minWidth: 150 },
  {
    prop: 'phone',
    label: '手机号',
    width: 140,
    render: (row: SmsRecord) => h('span', maskPhone(row.phone)),
  },
  { prop: 'content', label: '短信内容', minWidth: 200 },
  {
    prop: 'status',
    label: '发送状态',
    width: 100,
    render: (row: SmsRecord) =>
      h(
        ElTag,
        {
          type:
            row.status === 'success' ? 'success' : row.status === 'failed' ? 'danger' : 'warning',
        },
        () => recordStatusMap[row.status],
      ),
  },
  { prop: 'sentAt', label: '发送时间', width: 180 },
]

const recordActions: ActionConfig[] = [
  {
    label: '查看详情',
    onClick: (row: SmsRecord) => {
      currentRecord.value = row
      recordDrawerVisible.value = true
    },
  },
]

function handleTabChange(tab: string) {
  if (tab === 'records') {
    recordTableRef.value?.fetchData()
  }
}

async function handleRequest(params: RequestParams): Promise<RequestResult> {
  return getSmsTemplateList({
    page: params.page,
    pageSize: params.pageSize,
    name: params.name || undefined,
    status: params.status || undefined,
  })
}

async function handleRecordRequest(params: RequestParams): Promise<RequestResult> {
  return getSmsRecordList({
    page: params.page,
    pageSize: params.pageSize,
    templateName: params.templateName || undefined,
    status: params.status || undefined,
  })
}

function resetForm() {
  formData.name = ''
  formData.content = ''
  formData.variables = ''
}

function handleCreate() {
  dialogType.value = 'create'
  editingId.value = undefined
  resetForm()
  dialogVisible.value = true
}

function handleEdit(row: SmsTemplate) {
  dialogType.value = 'edit'
  editingId.value = row.id
  Object.assign(formData, {
    name: row.name,
    content: row.content,
    variables: row.variables,
  })
  dialogVisible.value = true
}

function handleDialogClose() {
  formRef.value?.resetFields()
  resetForm()
}

async function handleSubmit() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  submitting.value = true
  try {
    if (dialogType.value === 'create') {
      await createSmsTemplate(formData)
      ElMessage.success('创建成功')
    } else {
      await updateSmsTemplate(editingId.value!, formData)
      ElMessage.success('更新成功')
    }
    dialogVisible.value = false
    templateTableRef.value?.refresh()
  } catch (error: any) {
    ElMessage.error(error?.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

async function handleDelete(row: SmsTemplate) {
  try {
    await ElMessageBox.confirm('确认删除该模板？', '提示', { type: 'warning' })
    await deleteSmsTemplate(row.id)
    ElMessage.success('删除成功')
    templateTableRef.value?.refresh()
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e?.message || '删除失败')
    }
  }
}

async function handleAudit(row: SmsTemplate) {
  try {
    await ElMessageBox.confirm('确认提交审核？', '提示', { type: 'info' })
    await submitSmsTemplateAudit(row.id)
    ElMessage.success('已提交审核')
    templateTableRef.value?.refresh()
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e?.message || '提交审核失败')
    }
  }
}
</script>
