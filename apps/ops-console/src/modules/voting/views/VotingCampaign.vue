<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>投票活动</span>
          <div class="header-actions">
            <el-button type="primary" @click="handleCreate"> 新建投票 </el-button>
          </div>
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
      v-model="formVisible"
      :title="formTitle"
      width="700px"
      :close-on-click-modal="false"
      @close="handleFormClose"
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-form-item label="投票标题" prop="title">
          <el-input
            v-model="formData.title"
            placeholder="请输入投票标题"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="投票时间" prop="timeRange">
          <el-date-picker
            v-model="formData.timeRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>

        <el-divider content-position="left"> 投票选项 </el-divider>

        <div v-for="(option, index) in formData.options" :key="index" class="option-item">
          <div class="option-item-header">
            <span class="option-item-title">选项 {{ index + 1 }}</span>
            <el-button
              v-if="formData.options.length > 2"
              type="danger"
              link
              @click="removeOption(index)"
            >
              <el-icon><Delete /></el-icon> 删除
            </el-button>
          </div>
          <el-form-item
            :prop="'options.' + index + '.title'"
            :rules="[{ required: true, message: '请输入选项内容', trigger: 'blur' }]"
            label="选项内容"
          >
            <el-input
              v-model="option.title"
              placeholder="请输入选项内容"
              maxlength="50"
              show-word-limit
            />
          </el-form-item>
        </div>

        <el-form-item>
          <el-button type="primary" plain @click="addOption">
            <el-icon><Plus /></el-icon> 添加选项
          </el-button>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="formVisible = false"> 取消 </el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit"> 确定 </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="resultVisible" title="投票结果" width="700px">
      <div v-if="resultData.length > 0" class="result-content">
        <el-radio-group v-model="chartType" class="chart-type-switch">
          <el-radio-button value="bar"> 柱状图 </el-radio-button>
          <el-radio-button value="pie"> 饼图 </el-radio-button>
        </el-radio-group>
        <BarChart v-if="chartType === 'bar'" :data="chartData" height="350px" />
        <PieChart v-else :data="chartData" height="350px" />
        <el-table :data="resultData" border class="result-table">
          <el-table-column prop="title" label="选项" />
          <el-table-column prop="voteCount" label="得票数" width="120" sortable />
          <el-table-column label="占比" width="120">
            <template #default="{ row }">
              {{ totalVotes > 0 ? ((row.voteCount / totalVotes) * 100).toFixed(1) : 0 }}%
            </template>
          </el-table-column>
        </el-table>
      </div>
      <el-empty v-else description="暂无投票数据" />
      <template #footer>
        <el-button @click="resultVisible = false"> 关闭 </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, h } from 'vue'
import { ElMessage, ElMessageBox, ElTag, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Delete } from '@element-plus/icons-vue'
import ProTable from '@/components/common/ProTable/ProTable.vue'
import { BarChart, PieChart } from '@/components/common/Charts'
import type {
  ColumnConfig,
  SearchConfig,
  ActionConfig,
  RequestParams,
  RequestResult,
} from '@/components/common/ProTable/ProTable.vue'
import {
  getVotingCampaignList,
  getVotingCampaignDetail,
  createVotingCampaign,
  updateVotingCampaign,
  deleteVotingCampaign,
  updateVotingCampaignStatus,
  getVotingResults,
  type VotingCampaign,
  type VotingCampaignListParams,
  type CreateVotingCampaignData,
  type VotingOptionResult,
} from '@/modules/voting/api/voting'

defineOptions({ name: 'VotingCampaign' })

const tableRef = ref<InstanceType<typeof ProTable>>()
const formVisible = ref(false)
const formTitle = ref('新建投票')
const submitting = ref(false)
const formRef = ref<FormInstance>()
const editingId = ref<number | null>(null)

const resultVisible = ref(false)
const resultData = ref<VotingOptionResult[]>([])
const chartType = ref<'bar' | 'pie'>('bar')

const chartData = computed(() =>
  resultData.value.map((item) => ({ name: item.title, value: item.voteCount })),
)

const totalVotes = computed(() => resultData.value.reduce((sum, item) => sum + item.voteCount, 0))

interface OptionForm {
  title: string
  sortOrder: number
}

const defaultOption = (): OptionForm => ({
  title: '',
  sortOrder: 0,
})

interface FormData {
  title: string
  timeRange: string[]
  options: OptionForm[]
}

const formData = reactive<FormData>({
  title: '',
  timeRange: [],
  options: [defaultOption(), defaultOption()],
})

const formRules: FormRules = {
  title: [{ required: true, message: '请输入投票标题', trigger: 'blur' }],
  timeRange: [
    {
      validator: (_rule: FormRules[string], value: string[], callback: (error?: Error) => void) => {
        if (!value || value.length !== 2) {
          callback(new Error('请选择投票时间'))
        } else {
          callback()
        }
      },
      trigger: 'change',
    },
  ],
}

const statusOptions = [
  { label: '草稿', value: 'draft' },
  { label: '进行中', value: 'active' },
  { label: '已结束', value: 'ended' },
  { label: '已停用', value: 'disabled' },
]

function getStatusLabel(status?: string) {
  return statusOptions.find((o) => o.value === status)?.label ?? status ?? '-'
}

function getStatusTagType(status?: string): 'info' | 'success' | 'danger' | 'warning' {
  const map: Record<string, 'info' | 'success' | 'danger' | 'warning'> = {
    draft: 'info',
    active: 'success',
    ended: 'danger',
    disabled: 'warning',
  }
  return map[status ?? ''] ?? 'info'
}

const searchConfig: SearchConfig[] = [
  { prop: 'title', label: '投票标题', type: 'input', placeholder: '请输入投票标题' },
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
  { prop: 'title', label: '投票名称', minWidth: 180 },
  {
    prop: 'status',
    label: '状态',
    width: 100,
    render: (row: VotingCampaign) =>
      h(ElTag, { type: getStatusTagType(row.status) }, () => getStatusLabel(row.status)),
  },
  {
    prop: 'totalVotes',
    label: '总票数',
    width: 100,
    render: (row: VotingCampaign) => h('span', null, row.totalVotes ?? 0),
  },
  { prop: 'startTime', label: '开始时间', width: 170, sortable: true },
  { prop: 'endTime', label: '结束时间', width: 170 },
  { prop: 'createdAt', label: '创建时间', width: 170, sortable: true },
]

const actions: ActionConfig[] = [
  { label: '编辑', type: 'primary', onClick: (row) => handleEdit(row as VotingCampaign) },
  {
    label: '查看结果',
    type: 'primary',
    onClick: (row) => handleViewResults(row as VotingCampaign),
  },
  {
    label: '启用',
    type: 'success',
    onClick: (row) => handleStatusChange(row as VotingCampaign, 'active'),
    visible: (row) => (row as VotingCampaign).status === 'disabled',
  },
  {
    label: '停用',
    type: 'warning',
    onClick: (row) => handleStatusChange(row as VotingCampaign, 'disabled'),
    visible: (row) =>
      (row as VotingCampaign).status === 'active' || (row as VotingCampaign).status === 'draft',
  },
  { label: '删除', type: 'danger', onClick: (row) => handleDelete(row as VotingCampaign) },
]

async function handleRequest(params: RequestParams): Promise<RequestResult> {
  try {
    const query: VotingCampaignListParams = {
      page: params.page,
      pageSize: params.pageSize,
    }
    if (params.title) query.title = params.title
    if (params.status) query.status = params.status
    const res = await getVotingCampaignList(query)
    return { data: res.data ?? [], total: res.total ?? 0 }
  } catch (e: any) {
    ElMessage.error(e.message || '获取投票列表失败')
    return { data: [], total: 0 }
  }
}

function resetForm() {
  Object.assign(formData, {
    title: '',
    timeRange: [],
    options: [defaultOption(), defaultOption()],
  })
}

function handleCreate() {
  formTitle.value = '新建投票'
  editingId.value = null
  resetForm()
  formVisible.value = true
}

async function handleEdit(row: VotingCampaign) {
  try {
    const detail = await getVotingCampaignDetail(row.id)
    formTitle.value = '编辑投票'
    editingId.value = row.id
    formData.title = detail.title
    formData.timeRange =
      detail.startTime && detail.endTime ? [detail.startTime, detail.endTime] : []
    formData.options = detail.options?.length
      ? detail.options.map((o) => ({
          title: o.title,
          sortOrder: o.sortOrder,
        }))
      : [defaultOption(), defaultOption()]
    formVisible.value = true
  } catch (e: any) {
    ElMessage.error(e.message || '获取投票详情失败')
  }
}

function addOption() {
  const newOption = defaultOption()
  newOption.sortOrder = formData.options.length
  formData.options.push(newOption)
}

function removeOption(index: number) {
  if (formData.options.length <= 2) return
  formData.options.splice(index, 1)
}

async function handleStatusChange(row: VotingCampaign, status: 'active' | 'disabled') {
  const label = status === 'active' ? '启用' : '停用'
  try {
    await ElMessageBox.confirm(`确定${label}该投票活动吗？`, '提示', { type: 'warning' })
    await updateVotingCampaignStatus(row.id, status)
    ElMessage.success(`投票活动已${label}`)
    tableRef.value?.refresh()
  } catch (e: any) {
    handleActionError(e, `${label}失败`)
  }
}

async function handleDelete(row: VotingCampaign) {
  try {
    await ElMessageBox.confirm('确定删除该投票活动吗？', '提示', { type: 'warning' })
    await deleteVotingCampaign(row.id)
    ElMessage.success('删除成功')
    tableRef.value?.refresh()
  } catch (e: any) {
    handleActionError(e, '删除失败')
  }
}

function handleActionError(e: unknown, fallbackMessage: string) {
  if (e !== 'cancel') {
    ElMessage.error((e as Error).message || fallbackMessage)
  }
}

async function handleViewResults(row: VotingCampaign) {
  try {
    resultData.value = await getVotingResults(row.id)
    chartType.value = 'bar'
    resultVisible.value = true
  } catch (e: any) {
    ElMessage.error(e.message || '获取投票结果失败')
  }
}

async function handleSubmit() {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  if (formData.options.length < 2) {
    ElMessage.warning('请至少添加两个投票选项')
    return
  }

  if (!formData.timeRange || formData.timeRange.length !== 2) {
    ElMessage.warning('请选择投票时间')
    return
  }

  const options = formData.options.map((o, i) => ({
    title: o.title,
    sortOrder: i,
  }))

  const basePayload: CreateVotingCampaignData = {
    title: formData.title,
    startTime: formData.timeRange[0],
    endTime: formData.timeRange[1],
    options,
  }

  submitting.value = true
  try {
    if (editingId.value !== null) {
      await updateVotingCampaign(editingId.value, basePayload)
    } else {
      await createVotingCampaign(basePayload)
    }
    ElMessage.success('操作成功')
    formVisible.value = false
    tableRef.value?.refresh()
  } catch (e: any) {
    ElMessage.error(e.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

function handleFormClose() {
  formRef.value?.resetFields()
}
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.option-item {
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  background-color: var(--el-fill-color-blank);
}

.option-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.option-item-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.chart-type-switch {
  margin-bottom: 16px;
}

.result-table {
  margin-top: 16px;
}
</style>
