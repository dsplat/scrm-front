<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>抽奖活动</span>
          <div class="header-actions">
            <el-button type="primary" @click="handleCreate">新建活动</el-button>
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
      width="800px"
      :close-on-click-modal="false"
      @close="handleFormClose"
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
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

        <el-divider content-position="left">奖品配置</el-divider>

        <div v-for="(prize, index) in formData.prizes" :key="index" class="prize-item">
          <div class="prize-item-header">
            <span class="prize-item-title">奖品 {{ index + 1 }}</span>
            <el-button
              v-if="formData.prizes.length > 1"
              type="danger"
              link
              @click="removePrize(index)"
            >
              <el-icon><Delete /></el-icon> 删除
            </el-button>
          </div>
          <el-form-item
            :prop="'prizes.' + index + '.name'"
            :rules="[{ required: true, message: '请输入奖品名称', trigger: 'blur' }]"
            label="奖品名称"
          >
            <el-input
              v-model="prize.name"
              placeholder="请输入奖品名称"
              maxlength="30"
              show-word-limit
            />
          </el-form-item>
          <el-form-item :prop="'prizes.' + index + '.imageUrl'" label="奖品图片">
            <div class="prize-image-upload">
              <el-upload
                :show-file-list="false"
                :before-upload="handleBeforeUpload"
                :http-request="(options: any) => handlePrizeImageUpload(options, index)"
                accept="image/*"
              >
                <div v-if="prize.imageUrl" class="prize-image-preview">
                  <el-image :src="prize.imageUrl" fit="contain" class="prize-image" />
                  <div class="prize-image-overlay">
                    <el-icon><Edit /></el-icon>
                  </div>
                </div>
                <div v-else class="prize-image-placeholder">
                  <el-icon :size="24"><Plus /></el-icon>
                  <span>上传图片</span>
                </div>
              </el-upload>
              <span class="form-tip">建议尺寸 200×200，支持 jpg/png</span>
            </div>
          </el-form-item>
          <el-form-item
            :prop="'prizes.' + index + '.probability'"
            :rules="[
              { required: true, message: '请输入中奖概率', trigger: 'blur' },
              { validator: validateProbability, trigger: 'blur' },
            ]"
            label="中奖概率"
          >
            <el-input-number
              v-model="prize.probability"
              :min="0"
              :max="100"
              :precision="2"
              :step="1"
              style="width: 200px"
            />
            <span class="form-tip">%</span>
          </el-form-item>
          <el-form-item
            :prop="'prizes.' + index + '.quantity'"
            :rules="[
              { required: true, message: '请输入奖品数量', trigger: 'blur' },
              { validator: validateQuantity, trigger: 'blur' },
            ]"
            label="奖品数量"
          >
            <el-input-number
              v-model="prize.quantity"
              :min="1"
              :max="999999"
              :step="1"
              style="width: 200px"
            />
            <span class="form-tip">份</span>
          </el-form-item>
        </div>

        <el-form-item>
          <el-button type="primary" plain @click="addPrize">
            <el-icon><Plus /></el-icon> 添加奖品
          </el-button>
          <span
            v-if="totalProbability > 0"
            class="probability-total"
            :class="{ 'probability-error': totalProbability > 100 }"
          >
            总概率：{{ totalProbability }}%
          </span>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="winnerVisible" title="中奖记录" width="900px">
      <ProTable
        ref="winnerTableRef"
        :columns="winnerColumns"
        :request="handleWinnerRequest"
        :search-config="winnerSearchConfig"
      />
      <template #footer>
        <el-button @click="winnerVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, h, nextTick } from 'vue'
import {
  ElMessage,
  ElMessageBox,
  ElTag,
  type FormInstance,
  type FormRules,
  type UploadRequestOptions,
} from 'element-plus'
import { Edit, Plus, Delete } from '@element-plus/icons-vue'
import ProTable from '@/components/common/ProTable/ProTable.vue'
import type {
  ColumnConfig,
  SearchConfig,
  ActionConfig,
  RequestParams,
  RequestResult,
} from '@/components/common/ProTable/ProTable.vue'
import {
  getLotteryCampaignList,
  getLotteryCampaignDetail,
  createLotteryCampaign,
  updateLotteryCampaign,
  deleteLotteryCampaign,
  updateLotteryCampaignStatus,
  uploadLotteryPrizeImage,
  getLotteryWinnerList,
  type LotteryCampaign,
  type LotteryCampaignListParams,
  type CreateLotteryCampaignData,
  type UpdateLotteryCampaignData,
  type LotteryWinnerListParams,
} from '@/api/scrm/lottery'

defineOptions({ name: 'LotteryCampaign' })

const tableRef = ref<InstanceType<typeof ProTable>>()
const formVisible = ref(false)
const formTitle = ref('新建活动')
const submitting = ref(false)
const formRef = ref<FormInstance>()
const editingId = ref<number | null>(null)

const winnerVisible = ref(false)
const winnerTableRef = ref<InstanceType<typeof ProTable>>()
const currentWinnerCampaignId = ref<number | null>(null)

interface PrizeForm {
  name: string
  imageUrl: string
  probability: number
  quantity: number
  sortOrder: number
}

const defaultPrize = (): PrizeForm => ({
  name: '',
  imageUrl: '',
  probability: 10,
  quantity: 100,
  sortOrder: 0,
})

const defaultFormData = {
  name: '',
  description: '',
  timeRange: [] as string[],
  prizes: [defaultPrize()] as PrizeForm[],
}

const formData = reactive({ ...defaultFormData, prizes: [defaultPrize()] })

const totalProbability = computed(() => {
  return formData.prizes.reduce((sum, p) => sum + (p.probability || 0), 0)
})

const validateProbability = (_rule: any, value: number, callback: (error?: Error) => void) => {
  if (value === undefined || value === null || value < 0) {
    callback(new Error('概率不能小于0'))
  } else if (value > 100) {
    callback(new Error('概率不能大于100'))
  } else {
    callback()
  }
}

const validateQuantity = (_rule: any, value: number, callback: (error?: Error) => void) => {
  if (!value || value < 1) {
    callback(new Error('奖品数量至少为1'))
  } else {
    callback()
  }
}

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
}

const statusOptions = [
  { label: '未开始', value: 'pending' },
  { label: '进行中', value: 'active' },
  { label: '已结束', value: 'ended' },
  { label: '已停用', value: 'disabled' },
]

function getStatusLabel(status?: string) {
  return statusOptions.find((o) => o.value === status)?.label ?? status ?? '-'
}

function getStatusTagType(status?: string) {
  const map: Record<string, string> = {
    pending: 'info',
    active: 'success',
    ended: 'danger',
    disabled: 'warning',
  }
  return (map[status ?? ''] ?? 'info') as any
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
    render: (row: LotteryCampaign) =>
      h(ElTag, { type: getStatusTagType(row.status) }, () => getStatusLabel(row.status)),
  },
  {
    prop: 'prizeCount',
    label: '奖品总数',
    width: 100,
    render: (row: LotteryCampaign) => h('span', null, row.prizeCount ?? 0),
  },
  {
    prop: 'participantCount',
    label: '参与人数',
    width: 100,
    render: (row: LotteryCampaign) => h('span', null, row.participantCount ?? 0),
  },
  { prop: 'startTime', label: '开始时间', width: 170, sortable: true },
  { prop: 'endTime', label: '结束时间', width: 170 },
  { prop: 'createdAt', label: '创建时间', width: 170, sortable: true },
]

const actions: ActionConfig[] = [
  { label: '编辑', type: 'primary', onClick: (row) => handleEdit(row as LotteryCampaign) },
  {
    label: '中奖记录',
    type: 'primary',
    onClick: (row) => handleViewWinners(row as LotteryCampaign),
  },
  {
    label: '启用',
    type: 'success',
    onClick: (row) => handleStatusChange(row as LotteryCampaign, 'active'),
    visible: (row) => (row as LotteryCampaign).status === 'disabled',
  },
  {
    label: '停用',
    type: 'warning',
    onClick: (row) => handleStatusChange(row as LotteryCampaign, 'disabled'),
    visible: (row) =>
      (row as LotteryCampaign).status === 'active' || (row as LotteryCampaign).status === 'pending',
  },
  { label: '删除', type: 'danger', onClick: (row) => handleDelete(row as LotteryCampaign) },
]

const winnerSearchConfig: SearchConfig[] = []

const winnerColumns: ColumnConfig[] = [
  { prop: 'id', label: 'ID', width: 80 },
  { prop: 'winnerName', label: '中奖者', minWidth: 120 },
  { prop: 'winnerPhone', label: '手机号', width: 130 },
  { prop: 'prizeName', label: '奖品名称', minWidth: 120 },
  { prop: 'winTime', label: '中奖时间', width: 170 },
]

async function handleRequest(params: RequestParams): Promise<RequestResult> {
  try {
    const query: LotteryCampaignListParams = {
      page: params.page,
      pageSize: params.pageSize,
    }
    if (params.name) query.name = params.name
    if (params.status) query.status = params.status
    const res = await getLotteryCampaignList(query)
    return { data: res.data ?? [], total: res.total ?? 0 }
  } catch (e: any) {
    ElMessage.error(e.message || '获取活动列表失败')
    return { data: [], total: 0 }
  }
}

function resetForm() {
  Object.assign(formData, {
    name: '',
    description: '',
    timeRange: [],
    prizes: [defaultPrize()],
  })
}

function handleCreate() {
  formTitle.value = '新建活动'
  editingId.value = null
  resetForm()
  formVisible.value = true
}

async function handleEdit(row: LotteryCampaign) {
  try {
    const detail = await getLotteryCampaignDetail(row.id)
    formTitle.value = '编辑活动'
    editingId.value = row.id
    formData.name = detail.name
    formData.description = detail.description || ''
    formData.timeRange =
      detail.startTime && detail.endTime ? [detail.startTime, detail.endTime] : []
    formData.prizes = detail.prizes?.length
      ? detail.prizes.map((p) => ({
          name: p.name,
          imageUrl: p.imageUrl || '',
          probability: p.probability,
          quantity: p.quantity,
          sortOrder: p.sortOrder,
        }))
      : [defaultPrize()]
    formVisible.value = true
  } catch (e: any) {
    ElMessage.error(e.message || '获取活动详情失败')
  }
}

function addPrize() {
  const newPrize = defaultPrize()
  newPrize.sortOrder = formData.prizes.length
  formData.prizes.push(newPrize)
}

function removePrize(index: number) {
  formData.prizes.splice(index, 1)
}

async function handleStatusChange(row: LotteryCampaign, status: 'active' | 'disabled') {
  const label = status === 'active' ? '启用' : '停用'
  try {
    await ElMessageBox.confirm(`确定${label}该活动吗？`, '提示', { type: 'warning' })
    await updateLotteryCampaignStatus(row.id, status)
    ElMessage.success(`活动已${label}`)
    tableRef.value?.refresh()
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e.message || `${label}失败`)
    }
  }
}

async function handleDelete(row: LotteryCampaign) {
  try {
    await ElMessageBox.confirm('确定删除该活动吗？', '提示', { type: 'warning' })
    await deleteLotteryCampaign(row.id)
    ElMessage.success('删除成功')
    tableRef.value?.refresh()
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e.message || '删除失败')
    }
  }
}

function handleViewWinners(row: LotteryCampaign) {
  currentWinnerCampaignId.value = row.id
  winnerVisible.value = true
  nextTick(() => {
    winnerTableRef.value?.refresh()
  })
}

async function handleWinnerRequest(params: RequestParams): Promise<RequestResult> {
  if (!currentWinnerCampaignId.value) {
    return { data: [], total: 0 }
  }
  try {
    const query: LotteryWinnerListParams = {
      page: params.page,
      pageSize: params.pageSize,
      campaignId: currentWinnerCampaignId.value,
    }
    const res = await getLotteryWinnerList(query)
    return { data: res.data ?? [], total: res.total ?? 0 }
  } catch (e: any) {
    ElMessage.error(e.message || '获取中奖记录失败')
    return { data: [], total: 0 }
  }
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

async function handlePrizeImageUpload(options: UploadRequestOptions, index: number) {
  try {
    const url = await uploadLotteryPrizeImage(options.file as File)
    formData.prizes[index].imageUrl = url
    ElMessage.success('图片上传成功')
  } catch (e: any) {
    ElMessage.error(e.message || '图片上传失败')
  }
}

async function handleSubmit() {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  if (formData.prizes.length === 0) {
    ElMessage.warning('请至少添加一个奖品')
    return
  }

  if (totalProbability.value > 100) {
    ElMessage.warning('奖品总概率不能超过100%')
    return
  }

  const prizes = formData.prizes.map((p, i) => ({
    name: p.name,
    imageUrl: p.imageUrl,
    probability: p.probability,
    quantity: p.quantity,
    sortOrder: i,
  }))

  const basePayload = {
    name: formData.name,
    description: formData.description || undefined,
    startTime: formData.timeRange[0],
    endTime: formData.timeRange[1],
    prizes,
  }

  submitting.value = true
  try {
    if (editingId.value !== null) {
      await updateLotteryCampaign(editingId.value, basePayload as UpdateLotteryCampaignData)
    } else {
      await createLotteryCampaign(basePayload as CreateLotteryCampaignData)
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

.form-tip {
  margin-left: 8px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  white-space: nowrap;
}

.prize-item {
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  background-color: var(--el-fill-color-blank);
}

.prize-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.prize-item-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.prize-image-upload {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.prize-image-preview {
  position: relative;
  width: 100px;
  height: 100px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--el-border-color);
}

.prize-image {
  width: 100%;
  height: 100%;
}

.prize-image-overlay {
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

.prize-image-preview:hover .prize-image-overlay {
  opacity: 1;
}

.prize-image-placeholder {
  width: 100px;
  height: 100px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: 1px dashed var(--el-border-color);
  border-radius: 6px;
  color: var(--el-text-color-secondary);
  cursor: pointer;
  transition: border-color 0.2s;
}

.prize-image-placeholder:hover {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
}

.probability-total {
  margin-left: 16px;
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.probability-error {
  color: var(--el-color-danger);
  font-weight: 600;
}
</style>
