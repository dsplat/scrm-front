<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>裂变活动</span>
          <div class="header-actions">
            <el-button type="primary" @click="handleCreate"> 新建活动 </el-button>
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
      width="720px"
      :close-on-click-modal="false"
      @close="handleFormClose"
    >
      <el-steps :active="currentStep" finish-status="success" align-center class="form-steps">
        <el-step title="基础信息" />
        <el-step title="裂变规则" />
        <el-step title="奖励设置" />
        <el-step title="活动海报" />
      </el-steps>

      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
        class="step-form"
      >
        <div v-show="currentStep === 0">
          <el-form-item label="活动名称" prop="name">
            <el-input
              v-model="formData.name"
              placeholder="请输入活动名称"
              maxlength="50"
              show-word-limit
            />
          </el-form-item>
          <el-form-item label="活动时间" prop="timeRange">
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
          <el-form-item label="活动描述" prop="description">
            <el-input
              v-model="formData.description"
              type="textarea"
              placeholder="请输入活动描述"
              :rows="3"
              maxlength="500"
              show-word-limit
            />
          </el-form-item>
        </div>

        <div v-show="currentStep === 1">
          <el-form-item label="裂变类型" prop="fissionType">
            <el-radio-group v-model="formData.fissionType">
              <el-radio value="single"> 单级裂变 </el-radio>
              <el-radio value="multi"> 多级裂变 </el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="目标人数" prop="targetCount">
            <el-input-number
              v-model="formData.targetCount"
              :min="1"
              :max="99999"
              :step="1"
              style="width: 100%"
            />
            <span class="form-tip">每个用户需邀请的目标人数</span>
          </el-form-item>
          <el-form-item label="分享标题" prop="shareTitle">
            <el-input
              v-model="formData.shareTitle"
              placeholder="请输入分享标题"
              maxlength="30"
              show-word-limit
            />
          </el-form-item>
          <el-form-item label="分享描述" prop="shareDesc">
            <el-input
              v-model="formData.shareDesc"
              type="textarea"
              placeholder="请输入分享描述"
              :rows="2"
              maxlength="100"
              show-word-limit
            />
          </el-form-item>
        </div>

        <div v-show="currentStep === 2">
          <el-form-item label="奖励类型" prop="rewardType">
            <el-select
              v-model="formData.rewardType"
              placeholder="请选择奖励类型"
              style="width: 100%"
            >
              <el-option
                v-for="opt in rewardTypeOptions"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="奖励名称" prop="rewardName">
            <el-input
              v-model="formData.rewardName"
              placeholder="请输入奖励名称"
              maxlength="50"
              show-word-limit
            />
          </el-form-item>
          <el-form-item label="奖励价值" prop="rewardValue">
            <el-input-number
              v-model="formData.rewardValue"
              :min="0.01"
              :max="999999"
              :precision="2"
              :step="1"
              style="width: 100%"
            />
            <span class="form-tip">{{ formData.rewardType === 'points' ? '积分' : '元' }}</span>
          </el-form-item>
        </div>

        <div v-show="currentStep === 3">
          <el-form-item label="活动海报" prop="posterUrl">
            <div class="poster-upload">
              <el-upload
                :show-file-list="false"
                :before-upload="handleBeforeUpload"
                :http-request="handlePosterUpload"
                accept="image/*"
              >
                <div v-if="formData.posterUrl" class="poster-preview">
                  <el-image :src="formData.posterUrl" fit="contain" class="poster-image" />
                  <div class="poster-overlay">
                    <el-icon><Edit /></el-icon>
                  </div>
                </div>
                <div v-else class="poster-placeholder">
                  <el-icon :size="28">
                    <Plus />
                  </el-icon>
                  <span>上传海报</span>
                </div>
              </el-upload>
              <span class="form-tip">建议尺寸 750×1334，支持 jpg/png 格式</span>
            </div>
          </el-form-item>
        </div>
      </el-form>

      <template #footer>
        <el-button v-if="currentStep > 0" @click="currentStep--"> 上一步 </el-button>
        <el-button @click="formVisible = false"> 取消 </el-button>
        <el-button v-if="currentStep < 3" type="primary" @click="handleNextStep">
          下一步
        </el-button>
        <el-button v-else type="primary" :loading="submitting" @click="handleSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="活动详情" width="640px">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="活动名称" :span="2">
          {{ detailData?.name }}
        </el-descriptions-item>
        <el-descriptions-item label="活动状态">
          <el-tag :type="getStatusTagType(detailData?.status)">
            {{ getStatusLabel(detailData?.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="裂变类型">
          {{ detailData?.fissionType === 'single' ? '单级裂变' : '多级裂变' }}
        </el-descriptions-item>
        <el-descriptions-item label="开始时间">
          {{ detailData?.startTime }}
        </el-descriptions-item>
        <el-descriptions-item label="结束时间">
          {{ detailData?.endTime }}
        </el-descriptions-item>
        <el-descriptions-item label="参与人数">
          {{ detailData?.participantCount ?? 0 }}
        </el-descriptions-item>
        <el-descriptions-item label="分享次数">
          {{ detailData?.shareCount ?? 0 }}
        </el-descriptions-item>
        <el-descriptions-item label="转化人数">
          {{ detailData?.convertCount ?? 0 }}
        </el-descriptions-item>
        <el-descriptions-item label="目标人数">
          {{ detailData?.targetCount }}
        </el-descriptions-item>
        <el-descriptions-item label="奖励类型">
          {{ getRewardTypeLabel(detailData?.rewardType) }}
        </el-descriptions-item>
        <el-descriptions-item label="奖励名称" :span="2">
          {{ detailData?.rewardName }}
        </el-descriptions-item>
        <el-descriptions-item label="奖励价值">
          {{ detailData?.rewardValue }}{{ detailData?.rewardType === 'points' ? '积分' : '元' }}
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">
          {{ detailData?.createdAt }}
        </el-descriptions-item>
        <el-descriptions-item label="活动描述" :span="2">
          {{ detailData?.description || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="分享标题" :span="2">
          {{ detailData?.shareTitle || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="分享描述" :span="2">
          {{ detailData?.shareDesc || '-' }}
        </el-descriptions-item>
      </el-descriptions>
      <div v-if="detailData?.posterUrl" class="detail-poster">
        <div class="detail-poster-label">活动海报</div>
        <el-image :src="detailData.posterUrl" fit="contain" class="detail-poster-image" />
      </div>
      <template #footer>
        <el-button @click="detailVisible = false"> 关闭 </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, h } from 'vue'
import {
  ElMessage,
  ElMessageBox,
  ElTag,
  type FormInstance,
  type FormRules,
  type UploadRequestOptions,
} from 'element-plus'
import { Edit, Plus } from '@element-plus/icons-vue'
import ProTable from '@/components/common/ProTable/ProTable.vue'
import type {
  ColumnConfig,
  SearchConfig,
  ActionConfig,
  RequestParams,
  RequestResult,
} from '@/components/common/ProTable/ProTable.vue'
import {
  getFissionCampaignList,
  getFissionCampaignDetail,
  createFissionCampaign,
  updateFissionCampaign,
  deleteFissionCampaign,
  updateFissionCampaignStatus,
  uploadFissionPoster,
  type FissionCampaign,
  type FissionCampaignListParams,
  type CreateFissionCampaignData,
  type UpdateFissionCampaignData,
} from '@/api/scrm/fission'

defineOptions({ name: 'FissionCampaign' })

const tableRef = ref<InstanceType<typeof ProTable>>()
const formVisible = ref(false)
const formTitle = ref('新建活动')
const submitting = ref(false)
const formRef = ref<FormInstance>()
const editingId = ref<number | null>(null)
const currentStep = ref(0)
const posterUploading = ref(false)

const detailVisible = ref(false)
const detailData = ref<FissionCampaign | null>(null)

const defaultFormData = {
  name: '',
  description: '',
  timeRange: [] as string[],
  fissionType: 'single' as 'single' | 'multi',
  targetCount: 5,
  shareTitle: '',
  shareDesc: '',
  rewardType: 'coupon' as 'coupon' | 'points' | 'custom',
  rewardName: '',
  rewardValue: 10,
  posterUrl: '',
}

const formData = reactive({ ...defaultFormData })

const formRules: FormRules = {
  name: [{ required: true, message: '请输入活动名称', trigger: 'blur' }],
  timeRange: [
    {
      validator: (_rule: FormRules[string], value: string[], callback: (error?: Error) => void) => {
        if (!value || value.length !== 2) {
          callback(new Error('请选择活动时间'))
        } else {
          callback()
        }
      },
      trigger: 'change',
    },
  ],
  fissionType: [{ required: true, message: '请选择裂变类型', trigger: 'change' }],
  targetCount: [
    { required: true, message: '请输入目标人数', trigger: 'blur' },
    {
      validator: (_rule: FormRules[string], val: number, callback: (error?: Error) => void) => {
        if (!val || val < 1) {
          callback(new Error('目标人数至少为1'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
  rewardType: [{ required: true, message: '请选择奖励类型', trigger: 'change' }],
  rewardName: [{ required: true, message: '请输入奖励名称', trigger: 'blur' }],
  rewardValue: [
    { required: true, message: '请输入奖励价值', trigger: 'blur' },
    {
      validator: (_rule: FormRules[string], val: number, callback: (error?: Error) => void) => {
        if (val === undefined || val === null || val <= 0) {
          callback(new Error('奖励价值必须大于0'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
}

const statusOptions = [
  { label: '未开始', value: 'pending' },
  { label: '进行中', value: 'active' },
  { label: '已结束', value: 'ended' },
]

const rewardTypeOptions = [
  { label: '优惠券', value: 'coupon' },
  { label: '积分', value: 'points' },
  { label: '自定义', value: 'custom' },
]

function getStatusLabel(status?: string) {
  return statusOptions.find((o) => o.value === status)?.label ?? status ?? '-'
}

function getStatusTagType(status?: string) {
  const map: Record<string, string> = { pending: 'info', active: 'success', ended: 'danger' }
  return (map[status ?? ''] ?? 'info') as any
}

function getRewardTypeLabel(type?: string) {
  return rewardTypeOptions.find((o) => o.value === type)?.label ?? type ?? '-'
}

const searchConfig: SearchConfig[] = [
  { prop: 'name', label: '活动名称', type: 'input', placeholder: '请输入活动名称' },
  {
    prop: 'status',
    label: '活动状态',
    type: 'select',
    placeholder: '请选择活动状态',
    options: statusOptions,
  },
]

const columns: ColumnConfig[] = [
  { prop: 'id', label: 'ID', width: 80 },
  { prop: 'name', label: '活动名称', minWidth: 160 },
  {
    prop: 'status',
    label: '状态',
    width: 100,
    render: (row: FissionCampaign) =>
      h(ElTag, { type: getStatusTagType(row.status) }, () => getStatusLabel(row.status)),
  },
  {
    prop: 'participantCount',
    label: '参与人数',
    width: 100,
    render: (row: FissionCampaign) => h('span', null, row.participantCount ?? 0),
  },
  {
    prop: 'fissionType',
    label: '裂变类型',
    width: 100,
    render: (row: FissionCampaign) =>
      h('span', null, row.fissionType === 'single' ? '单级裂变' : '多级裂变'),
  },
  {
    prop: 'rewardType',
    label: '奖励类型',
    width: 100,
    render: (row: FissionCampaign) => h('span', null, getRewardTypeLabel(row.rewardType)),
  },
  { prop: 'startTime', label: '开始时间', width: 170, sortable: true },
  { prop: 'endTime', label: '结束时间', width: 170 },
  { prop: 'createdAt', label: '创建时间', width: 170, sortable: true },
]

const actions: ActionConfig[] = [
  { label: '查看', type: 'primary', onClick: (row) => handleDetail(row as FissionCampaign) },
  { label: '编辑', type: 'primary', onClick: (row) => handleEdit(row as FissionCampaign) },
  {
    label: '开始',
    type: 'success',
    onClick: (row) => handleStatusChange(row as FissionCampaign, 'active'),
    visible: (row) => (row as FissionCampaign).status === 'pending',
  },
  {
    label: '结束',
    type: 'warning',
    onClick: (row) => handleStatusChange(row as FissionCampaign, 'ended'),
    visible: (row) => (row as FissionCampaign).status === 'active',
  },
  { label: '删除', type: 'danger', onClick: (row) => handleDelete(row as FissionCampaign) },
]

async function handleRequest(params: RequestParams): Promise<RequestResult> {
  try {
    const query: FissionCampaignListParams = {
      page: params.page,
      pageSize: params.pageSize,
    }
    if (params.name) query.name = params.name
    if (params.status) query.status = params.status
    const res = await getFissionCampaignList(query)
    return { data: res.data ?? [], total: res.total ?? 0 }
  } catch (e: any) {
    ElMessage.error(e.message || '获取活动列表失败')
    return { data: [], total: 0 }
  }
}

function resetForm() {
  Object.assign(formData, { ...defaultFormData, timeRange: [] })
  currentStep.value = 0
}

function handleCreate() {
  formTitle.value = '新建活动'
  editingId.value = null
  resetForm()
  formVisible.value = true
}

function handleEdit(row: FissionCampaign) {
  formTitle.value = '编辑活动'
  editingId.value = row.id
  formData.name = row.name
  formData.description = row.description || ''
  formData.timeRange = row.startTime && row.endTime ? [row.startTime, row.endTime] : []
  formData.fissionType = row.fissionType
  formData.targetCount = row.targetCount
  formData.shareTitle = row.shareTitle || ''
  formData.shareDesc = row.shareDesc || ''
  formData.rewardType = row.rewardType
  formData.rewardName = row.rewardName || ''
  formData.rewardValue = row.rewardValue
  formData.posterUrl = row.posterUrl || ''
  currentStep.value = 0
  formVisible.value = true
}

async function handleDetail(row: FissionCampaign) {
  try {
    detailData.value = await getFissionCampaignDetail(row.id)
    detailVisible.value = true
  } catch (e: any) {
    ElMessage.error(e.message || '获取活动详情失败')
  }
}

async function handleStatusChange(row: FissionCampaign, status: 'active' | 'ended') {
  const label = status === 'active' ? '开始' : '结束'
  try {
    await ElMessageBox.confirm(`确定${label}该活动吗？`, '提示', { type: 'warning' })
    await updateFissionCampaignStatus(row.id, status)
    ElMessage.success(`活动已${label}`)
    tableRef.value?.refresh()
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e.message || `${label}失败`)
    }
  }
}

async function handleDelete(row: FissionCampaign) {
  try {
    await ElMessageBox.confirm('确定删除该活动吗？', '提示', { type: 'warning' })
    await deleteFissionCampaign(row.id)
    ElMessage.success('删除成功')
    tableRef.value?.refresh()
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e.message || '删除失败')
    }
  }
}

async function handleNextStep() {
  if (!formRef.value) return
  const fieldsToValidate = getStepFields(currentStep.value)
  try {
    await formRef.value.validateField(fieldsToValidate)
    currentStep.value++
  } catch {
    // validation failed
  }
}

function getStepFields(step: number): string[] {
  const stepFields: Record<number, string[]> = {
    0: ['name', 'timeRange'],
    1: ['fissionType', 'targetCount'],
    2: ['rewardType', 'rewardName', 'rewardValue'],
    3: [],
  }
  return stepFields[step] ?? []
}

function handleBeforeUpload(file: File) {
  const isImage = file.type.startsWith('image/')
  const isLt5M = file.size / 1024 / 1024 < 5
  if (!isImage) {
    ElMessage.error('只能上传图片文件')
    return false
  }
  if (!isLt5M) {
    ElMessage.error('图片大小不能超过5MB')
    return false
  }
  return true
}

async function handlePosterUpload(options: UploadRequestOptions) {
  posterUploading.value = true
  try {
    const url = await uploadFissionPoster(options.file as File)
    formData.posterUrl = url
    ElMessage.success('海报上传成功')
  } catch (e: any) {
    ElMessage.error(e.message || '海报上传失败')
  } finally {
    posterUploading.value = false
  }
}

async function handleSubmit() {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  const basePayload = {
    name: formData.name,
    description: formData.description || undefined,
    startTime: formData.timeRange[0],
    endTime: formData.timeRange[1],
    fissionType: formData.fissionType,
    targetCount: formData.targetCount,
    rewardType: formData.rewardType,
    rewardName: formData.rewardName,
    rewardValue: formData.rewardValue,
    posterUrl: formData.posterUrl || undefined,
    shareTitle: formData.shareTitle || undefined,
    shareDesc: formData.shareDesc || undefined,
  }

  submitting.value = true
  try {
    if (editingId.value !== null) {
      await updateFissionCampaign(editingId.value, basePayload as UpdateFissionCampaignData)
    } else {
      await createFissionCampaign(basePayload as CreateFissionCampaignData)
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
  currentStep.value = 0
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

.form-tip {
  margin-left: 8px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  white-space: nowrap;
}

.form-steps {
  margin-bottom: 24px;
}

.step-form {
  min-height: 260px;
}

.poster-upload {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.poster-preview {
  position: relative;
  width: 150px;
  height: 200px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--el-border-color);
}

.poster-image {
  width: 100%;
  height: 100%;
}

.poster-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  color: #fff;
  opacity: 0;
  transition: opacity 0.2s;
}

.poster-preview:hover .poster-overlay {
  opacity: 1;
}

.poster-placeholder {
  width: 150px;
  height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px dashed var(--el-border-color);
  border-radius: 6px;
  color: var(--el-text-color-secondary);
  cursor: pointer;
  transition: border-color 0.2s;
}

.poster-placeholder:hover {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
}

.detail-poster {
  margin-top: 16px;
}

.detail-poster-label {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
}

.detail-poster-image {
  max-width: 300px;
  max-height: 400px;
  border-radius: 6px;
  border: 1px solid var(--el-border-color);
}
</style>
