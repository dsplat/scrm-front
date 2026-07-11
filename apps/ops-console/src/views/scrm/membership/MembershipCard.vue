<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>会员卡/储值卡</span>
          <el-button type="primary" @click="handleCreate">创建卡片</el-button>
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
      width="700px"
      :close-on-click-modal="false"
      @close="handleDialogClose"
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-form-item label="卡片类型" prop="type">
          <el-radio-group v-model="formData.type">
            <el-radio value="membership">会员卡</el-radio>
            <el-radio value="stored_value">储值卡</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="卡片名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入卡片名称" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item label="卡面背景" prop="coverImage">
          <el-upload
            class="cover-uploader"
            :show-file-list="false"
            :before-upload="handleBeforeUpload"
            :http-request="handleUpload"
            accept="image/*"
          >
            <el-image
              v-if="formData.coverImage"
              :src="formData.coverImage"
              fit="cover"
              class="cover-preview"
            />
            <el-icon v-else class="cover-placeholder"><Plus /></el-icon>
          </el-upload>
          <div class="cover-tip">建议尺寸 640×400，支持 JPG/PNG，不超过 2MB</div>
        </el-form-item>
        <el-form-item label="有效期" prop="validityType">
          <el-radio-group v-model="formData.validityType">
            <el-radio value="permanent">永久有效</el-radio>
            <el-radio value="period">固定期限</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="formData.validityType === 'period'" label="有效天数" prop="validityDays">
          <el-input-number v-model="formData.validityDays" :min="1" :max="36500" style="width: 100%" />
        </el-form-item>
        <el-form-item v-if="formData.validityType === 'period'" label="有效期范围" prop="validityRange">
          <el-date-picker
            v-model="formData.validityRange"
            type="daterange"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item v-if="formData.type === 'stored_value'" label="储值金额" prop="storedAmount">
          <el-input-number v-model="formData.storedAmount" :min="0" :precision="2" :step="100" style="width: 100%" />
        </el-form-item>
        <el-form-item label="权益说明" prop="benefits">
          <el-input v-model="formData.benefits" type="textarea" :rows="3" placeholder="请输入权益说明" maxlength="500" show-word-limit />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="formData.description" type="textarea" :rows="2" placeholder="请输入描述" maxlength="200" show-word-limit />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="formData.status">
            <el-radio :value="1">启用</el-radio>
            <el-radio :value="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="卡片详情" width="600px">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="卡片名称">{{ detailData.name }}</el-descriptions-item>
        <el-descriptions-item label="卡片类型">{{ detailData.type === 'membership' ? '会员卡' : '储值卡' }}</el-descriptions-item>
        <el-descriptions-item label="有效期">
          {{ detailData.validityType === 'permanent' ? '永久有效' : `${detailData.validityDays}天` }}
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="detailData.status === 1 ? 'success' : 'danger'">
            {{ detailData.status === 1 ? '启用' : '禁用' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item v-if="detailData.type === 'stored_value'" label="储值金额">
          ¥{{ detailData.storedAmount?.toFixed(2) }}
        </el-descriptions-item>
        <el-descriptions-item label="创建时间" :span="2">{{ detailData.createdAt }}</el-descriptions-item>
        <el-descriptions-item label="卡面背景" :span="2">
          <el-image v-if="detailData.coverImage" :src="detailData.coverImage" fit="cover" style="width: 200px; height: 125px" />
          <span v-else>无</span>
        </el-descriptions-item>
        <el-descriptions-item label="权益说明" :span="2">{{ detailData.benefits || '无' }}</el-descriptions-item>
        <el-descriptions-item label="描述" :span="2">{{ detailData.description || '无' }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, h } from 'vue'
import { ElMessage, ElMessageBox, ElTag, ElImage, Plus } from 'element-plus'
import type { FormInstance, FormRules, UploadRequestOptions } from 'element-plus'
import ProTable from '@/components/common/ProTable/ProTable.vue'
import type { ColumnConfig, SearchConfig, ActionConfig, RequestParams, RequestResult } from '@/components/common/ProTable/ProTable.vue'
import {
  getMembershipCardList,
  getMembershipCardDetail,
  createMembershipCard,
  updateMembershipCard,
  deleteMembershipCard,
  type MembershipCard,
  type MembershipCardListParams,
} from '@/api/scrm/membershipCard'

defineOptions({ name: 'MembershipCard' })

const tableRef = ref<InstanceType<typeof ProTable>>()
const formRef = ref<FormInstance>()
const dialogVisible = ref(false)
const dialogTitle = ref('创建卡片')
const detailVisible = ref(false)
const submitting = ref(false)
const currentCardId = ref<number | null>(null)

const defaultFormData = () => ({
  type: 'membership' as 'membership' | 'stored_value',
  name: '',
  coverImage: '',
  validityType: 'permanent' as 'permanent' | 'period',
  validityDays: 365,
  validityRange: [] as string[],
  storedAmount: 0,
  benefits: '',
  description: '',
  status: 1,
})

const formData = reactive(defaultFormData())
const detailData = reactive<Partial<MembershipCard>>({})

const formRules: FormRules = {
  type: [{ required: true, message: '请选择卡片类型', trigger: 'change' }],
  name: [{ required: true, message: '请输入卡片名称', trigger: 'blur' }],
  validityType: [{ required: true, message: '请选择有效期类型', trigger: 'change' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
}

const searchConfig: SearchConfig[] = [
  { prop: 'name', label: '卡片名称', type: 'input', placeholder: '请输入卡片名称' },
  {
    prop: 'type',
    label: '卡片类型',
    type: 'select',
    placeholder: '请选择类型',
    options: [
      { label: '会员卡', value: 'membership' },
      { label: '储值卡', value: 'stored_value' },
    ],
  },
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
  { prop: 'name', label: '卡片名称', minWidth: 150 },
  {
    prop: 'type',
    label: '卡片类型',
    width: 100,
    render: (row: MembershipCard) =>
      h(ElTag, { type: row.type === 'membership' ? 'primary' : 'warning' }, () =>
        row.type === 'membership' ? '会员卡' : '储值卡',
      ),
  },
  {
    prop: 'coverImage',
    label: '卡面',
    width: 80,
    render: (row: MembershipCard) =>
      row.coverImage
        ? h(ElImage, { src: row.coverImage, style: 'width: 40px; height: 25px', fit: 'cover' })
        : h('span', null, '无'),
  },
  {
    prop: 'validityType',
    label: '有效期',
    width: 120,
    render: (row: MembershipCard) =>
      h('span', null, row.validityType === 'permanent' ? '永久有效' : `${row.validityDays}天`),
  },
  {
    prop: 'storedAmount',
    label: '储值金额',
    width: 120,
    render: (row: MembershipCard) =>
      h('span', null, row.type === 'stored_value' ? `¥${row.storedAmount?.toFixed(2) ?? '0.00'}` : '-'),
  },
  {
    prop: 'status',
    label: '状态',
    width: 80,
    render: (row: MembershipCard) =>
      h(ElTag, { type: row.status === 1 ? 'success' : 'danger' }, () =>
        row.status === 1 ? '启用' : '禁用',
      ),
  },
  { prop: 'createdAt', label: '创建时间', width: 180, sortable: true },
]

const actions: ActionConfig[] = [
  { label: '详情', type: 'primary', onClick: (row) => handleDetail(row as MembershipCard) },
  { label: '编辑', type: 'primary', onClick: (row) => handleEdit(row as MembershipCard) },
  { label: '删除', type: 'danger', onClick: (row) => handleDelete(row as MembershipCard) },
]

function handleBeforeUpload(file: File) {
  const isImage = file.type.startsWith('image/')
  const isLt2M = file.size / 1024 / 1024 < 2
  if (!isImage) {
    ElMessage.error('只能上传图片文件')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('图片大小不能超过 2MB')
    return false
  }
  return true
}

async function handleUpload(options: UploadRequestOptions) {
  const form = new FormData()
  form.append('file', options.file)
  try {
    const res = await fetch('/api/upload', { method: 'POST', body: form })
    const data = await res.json()
    formData.coverImage = data.url ?? data.data?.url ?? ''
    ElMessage.success('上传成功')
  } catch {
    ElMessage.error('上传失败')
  }
}

async function handleRequest(params: RequestParams): Promise<RequestResult> {
  try {
    const query: MembershipCardListParams = {
      page: params.page,
      pageSize: params.pageSize,
    }
    if (params.name) query.name = params.name
    if (params.type) query.type = params.type
    if (params.status !== undefined && params.status !== '') query.status = Number(params.status)
    const res = await getMembershipCardList(query)
    return { data: res.data ?? [], total: res.total ?? 0 }
  } catch (e: any) {
    ElMessage.error(e.message || '获取卡片列表失败')
    return { data: [], total: 0 }
  }
}

function handleCreate() {
  dialogTitle.value = '创建卡片'
  currentCardId.value = null
  Object.assign(formData, defaultFormData())
  dialogVisible.value = true
}

function handleEdit(row: MembershipCard) {
  dialogTitle.value = '编辑卡片'
  currentCardId.value = row.id
  Object.assign(formData, {
    type: row.type,
    name: row.name,
    coverImage: row.coverImage || '',
    validityType: row.validityType,
    validityDays: row.validityDays || 365,
    validityRange: row.validityStart && row.validityEnd ? [row.validityStart, row.validityEnd] : [],
    storedAmount: row.storedAmount || 0,
    benefits: row.benefits || '',
    description: row.description || '',
    status: row.status,
  })
  dialogVisible.value = true
}

async function handleDetail(row: MembershipCard) {
  try {
    const detail = await getMembershipCardDetail(row.id)
    Object.assign(detailData, detail)
    detailVisible.value = true
  } catch (e: any) {
    ElMessage.error(e.message || '获取详情失败')
  }
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
    const payload: Record<string, any> = {
      name: formData.name,
      type: formData.type,
      coverImage: formData.coverImage,
      validityType: formData.validityType,
      benefits: formData.benefits,
      description: formData.description,
      status: formData.status,
    }
    if (formData.validityType === 'period') {
      payload.validityDays = formData.validityDays
      if (formData.validityRange?.length === 2) {
        payload.validityStart = formData.validityRange[0]
        payload.validityEnd = formData.validityRange[1]
      }
    }
    if (formData.type === 'stored_value') {
      payload.storedAmount = formData.storedAmount
    }
    if (currentCardId.value) {
      await updateMembershipCard(currentCardId.value, payload)
    } else {
      await createMembershipCard(payload)
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

async function handleDelete(row: MembershipCard) {
  try {
    await ElMessageBox.confirm('确定删除该卡片吗？', '提示', { type: 'warning' })
    await deleteMembershipCard(row.id)
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

.cover-uploader {
  :deep(.el-upload) {
    border: 1px dashed var(--el-border-color);
    border-radius: 6px;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: var(--el-transition-duration-fast);

    &:hover {
      border-color: var(--el-color-primary);
    }
  }
}

.cover-preview {
  width: 200px;
  height: 125px;
  display: block;
}

.cover-placeholder {
  font-size: 28px;
  color: #8c939d;
  width: 200px;
  height: 125px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-tip {
  font-size: 12px;
  color: #999;
  margin-top: 8px;
}
</style>
