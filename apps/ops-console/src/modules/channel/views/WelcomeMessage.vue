<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>欢迎语管理</span>
          <el-button type="primary" @click="handleCreate"> 新建欢迎语 </el-button>
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
      width="720px"
      :close-on-click-modal="false"
      @close="handleDialogClose"
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-form-item label="欢迎语名称" prop="name">
          <el-input
            v-model="formData.name"
            placeholder="请输入欢迎语名称"
            maxlength="50"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="触发条件" prop="triggerType">
          <el-select
            v-model="formData.triggerType"
            placeholder="请选择触发条件"
            style="width: 100%"
          >
            <el-option
              v-for="opt in triggerTypeOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="formData.triggerType === 'keyword'" label="关键词" prop="triggerValue">
          <el-input
            v-model="formData.triggerValue"
            placeholder="请输入触发关键词"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
        <el-form-item v-if="formData.triggerType === 'qr_code'" label="渠道码" prop="triggerValue">
          <el-input
            v-model="formData.triggerValue"
            placeholder="请输入关联渠道码ID"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="欢迎语内容" prop="content">
          <el-input
            v-model="formData.content"
            type="textarea"
            placeholder="请输入欢迎语文本内容"
            :rows="4"
            maxlength="1000"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="素材配置">
          <div class="materials-section">
            <div v-for="(item, index) in formData.materials" :key="index" class="material-item">
              <div class="material-header">
                <el-select
                  v-model="item.type"
                  placeholder="素材类型"
                  style="width: 140px"
                  @change="handleMaterialTypeChange(index)"
                >
                  <el-option label="文本" value="text" />
                  <el-option label="图片" value="image" />
                  <el-option label="链接" value="link" />
                  <el-option label="小程序" value="miniprogram" />
                </el-select>
                <el-button type="danger" link @click="removeMaterial(index)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>

              <div v-if="item.type === 'text'" class="material-body">
                <el-input
                  v-model="item.content"
                  type="textarea"
                  placeholder="请输入附加文本"
                  :rows="2"
                  maxlength="500"
                  show-word-limit
                />
              </div>

              <div v-if="item.type === 'image'" class="material-body">
                <el-upload
                  :show-file-list="false"
                  :before-upload="(file: File) => handleBeforeUpload(file, index)"
                  :http-request="(option: any) => handleImageUpload(option, index)"
                  accept="image/*"
                >
                  <div v-if="item.url" class="image-preview">
                    <el-image :src="item.url" fit="contain" class="preview-image" />
                    <div class="image-overlay">
                      <el-icon><Edit /></el-icon>
                    </div>
                  </div>
                  <div v-else class="image-placeholder">
                    <el-icon :size="24">
                      <Plus />
                    </el-icon>
                    <span>上传图片</span>
                  </div>
                </el-upload>
                <span class="form-tip">支持 jpg/png/gif/webp，最大 2MB</span>
              </div>

              <div v-if="item.type === 'link'" class="material-body">
                <el-input
                  v-model="item.title"
                  placeholder="链接标题"
                  maxlength="100"
                  style="margin-bottom: 8px"
                />
                <el-input
                  v-model="item.url"
                  placeholder="链接地址（https://...）"
                  maxlength="500"
                />
              </div>

              <div v-if="item.type === 'miniprogram'" class="material-body">
                <el-input
                  v-model="item.title"
                  placeholder="小程序名称"
                  maxlength="50"
                  style="margin-bottom: 8px"
                />
                <el-input
                  v-model="item.url"
                  placeholder="小程序页面路径"
                  maxlength="500"
                  style="margin-bottom: 8px"
                />
                <el-upload
                  :show-file-list="false"
                  :before-upload="(file: File) => handleThumbBeforeUpload(file, index)"
                  :http-request="(option: any) => handleThumbUpload(option, index)"
                  accept="image/*"
                >
                  <div v-if="item.thumbUrl" class="thumb-preview">
                    <el-image :src="item.thumbUrl" fit="contain" class="thumb-image" />
                  </div>
                  <el-button v-else size="small"> 上传小程序封面 </el-button>
                </el-upload>
              </div>
            </div>
            <el-button type="primary" plain style="width: 100%" @click="addMaterial">
              <el-icon><Plus /></el-icon> 添加素材
            </el-button>
          </div>
        </el-form-item>

        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="formData.status">
            <el-radio :value="1"> 启用 </el-radio>
            <el-radio :value="0"> 禁用 </el-radio>
          </el-radio-group>
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
import { ref, reactive, h } from 'vue'
import {
  ElMessage,
  ElMessageBox,
  ElTag,
  type FormInstance,
  type FormRules,
  type UploadRequestOptions,
} from 'element-plus'
import ProTable from '@/components/common/ProTable/ProTable.vue'
import type {
  ColumnConfig,
  SearchConfig,
  ActionConfig,
  RequestParams,
  RequestResult,
} from '@/components/common/ProTable/ProTable.vue'
import {
  getWelcomeMessageList,
  createWelcomeMessage,
  updateWelcomeMessage,
  deleteWelcomeMessage,
  type WelcomeMessage,
  type WelcomeMaterial,
  type WelcomeMessageListParams,
  type CreateWelcomeMessageData,
  type UpdateWelcomeMessageData,
} from '@/modules/channel/api/welcome'
import { uploadImage } from '@/api/common/upload'

defineOptions({ name: 'WelcomeMessage' })

const tableRef = ref<InstanceType<typeof ProTable>>()
const dialogVisible = ref(false)
const dialogTitle = ref('新建欢迎语')
const submitting = ref(false)
const formRef = ref<FormInstance>()
const editingId = ref<number | null>(null)

const defaultMaterial = (): WelcomeMaterial => ({
  type: 'text',
  content: '',
  title: '',
  url: '',
  thumbUrl: '',
})

const defaultFormData = {
  name: '',
  triggerType: 'new_friend' as 'new_friend' | 'keyword' | 'qr_code',
  triggerValue: '',
  content: '',
  materials: [] as WelcomeMaterial[],
  status: 1,
}

const formData = reactive({ ...defaultFormData, materials: [] as WelcomeMaterial[] })

const formRules: FormRules = {
  name: [{ required: true, message: '请输入欢迎语名称', trigger: 'blur' }],
  triggerType: [{ required: true, message: '请选择触发条件', trigger: 'change' }],
  triggerValue: [
    {
      validator: (_rule: FormRules[string], val: string, callback: (error?: Error) => void) => {
        if (formData.triggerType !== 'new_friend' && !val?.trim()) {
          callback(new Error('请输入触发值'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
  content: [{ required: true, message: '请输入欢迎语内容', trigger: 'blur' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
}

const triggerTypeOptions = [
  { label: '新好友添加', value: 'new_friend' },
  { label: '关键词触发', value: 'keyword' },
  { label: '渠道码触发', value: 'qr_code' },
]

function getTriggerTypeLabel(type: string) {
  return triggerTypeOptions.find((o) => o.value === type)?.label ?? type
}

function getTriggerTypeTagType(type: string) {
  const map: Record<string, string> = { new_friend: 'success', keyword: 'warning', qr_code: 'info' }
  return map[type] ?? 'info'
}

function getContentPreview(content: string, materials: WelcomeMaterial[]) {
  const parts: string[] = []
  if (content) parts.push(content.slice(0, 30) + (content.length > 30 ? '...' : ''))
  if (materials?.length) {
    const count = materials.length
    parts.push(`[${count}个素材]`)
  }
  return parts.join(' ') || '-'
}

const searchConfig: SearchConfig[] = [
  { prop: 'name', label: '欢迎语名称', type: 'input', placeholder: '请输入欢迎语名称' },
  {
    prop: 'triggerType',
    label: '触发条件',
    type: 'select',
    placeholder: '请选择触发条件',
    options: triggerTypeOptions,
  },
]

const columns: ColumnConfig[] = [
  { prop: 'id', label: 'ID', width: 80 },
  { prop: 'name', label: '欢迎语名称', minWidth: 150 },
  {
    prop: 'triggerType',
    label: '触发条件',
    width: 130,
    render: (row: WelcomeMessage) =>
      h(ElTag, { type: getTriggerTypeTagType(row.triggerType) as any }, () =>
        getTriggerTypeLabel(row.triggerType),
      ),
  },
  {
    prop: 'triggerValue',
    label: '触发值',
    width: 120,
    render: (row: WelcomeMessage) => h('span', null, row.triggerValue || '-'),
  },
  {
    prop: 'content',
    label: '内容',
    minWidth: 200,
    showOverflowTooltip: true,
    render: (row: WelcomeMessage) => h('span', null, getContentPreview(row.content, row.materials)),
  },
  {
    prop: 'status',
    label: '状态',
    width: 80,
    render: (row: WelcomeMessage) =>
      h(ElTag, { type: row.status === 1 ? 'success' : 'danger' }, () =>
        row.status === 1 ? '启用' : '禁用',
      ),
  },
  { prop: 'createdAt', label: '创建时间', width: 170, sortable: true },
]

const actions: ActionConfig[] = [
  { label: '编辑', type: 'primary', onClick: (row) => handleEdit(row as WelcomeMessage) },
  { label: '删除', type: 'danger', onClick: (row) => handleDelete(row as WelcomeMessage) },
]

async function handleRequest(params: RequestParams): Promise<RequestResult> {
  try {
    const query: WelcomeMessageListParams = {
      page: params.page,
      pageSize: params.pageSize,
    }
    if (params.name) query.name = params.name
    if (params.triggerType) query.triggerType = params.triggerType
    const res = await getWelcomeMessageList(query)
    return { data: res.data ?? [], total: res.total ?? 0 }
  } catch (e: any) {
    ElMessage.error(e.message || '获取欢迎语列表失败')
    return { data: [], total: 0 }
  }
}

function resetForm() {
  Object.assign(formData, {
    ...defaultFormData,
    triggerValue: '',
    materials: [],
  })
}

function handleCreate() {
  dialogTitle.value = '新建欢迎语'
  editingId.value = null
  resetForm()
  dialogVisible.value = true
}

function handleEdit(row: WelcomeMessage) {
  dialogTitle.value = '编辑欢迎语'
  editingId.value = row.id
  formData.name = row.name
  formData.triggerType = row.triggerType
  formData.triggerValue = row.triggerValue || ''
  formData.content = row.content
  formData.materials = (row.materials || []).map((m) => ({ ...m }))
  formData.status = row.status
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  const payload: CreateWelcomeMessageData = {
    name: formData.name,
    triggerType: formData.triggerType,
    content: formData.content,
    status: formData.status,
  }
  if (formData.triggerType !== 'new_friend' && formData.triggerValue) {
    payload.triggerValue = formData.triggerValue
  }
  if (formData.materials.length > 0) {
    payload.materials = formData.materials.map((m) => {
      const item: WelcomeMaterial = { type: m.type, content: m.content || '' }
      if (m.title) item.title = m.title
      if (m.url) item.url = m.url
      if (m.thumbUrl) item.thumbUrl = m.thumbUrl
      return item
    })
  }

  submitting.value = true
  try {
    if (editingId.value !== null) {
      await updateWelcomeMessage(editingId.value, payload as UpdateWelcomeMessageData)
    } else {
      await createWelcomeMessage(payload)
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

async function handleDelete(row: WelcomeMessage) {
  try {
    await ElMessageBox.confirm('确定删除该欢迎语吗？', '提示', { type: 'warning' })
    await deleteWelcomeMessage(row.id)
    ElMessage.success('删除成功')
    tableRef.value?.refresh()
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e.message || '删除失败')
    }
  }
}

function addMaterial() {
  formData.materials.push(defaultMaterial())
}

function removeMaterial(index: number) {
  formData.materials.splice(index, 1)
}

function handleMaterialTypeChange(index: number) {
  const item = formData.materials[index]
  item.content = ''
  item.title = ''
  item.url = ''
  item.thumbUrl = ''
}

function handleBeforeUpload(file: File, _index: number): boolean {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    ElMessage.error('只能上传 JPG/PNG/GIF/WEBP 格式的图片')
    return false
  }
  if (file.size > 2 * 1024 * 1024) {
    ElMessage.error('图片大小不能超过 2MB')
    return false
  }
  return true
}

async function handleImageUpload(option: UploadRequestOptions, index: number) {
  try {
    const result = await uploadImage(option.file as File)
    formData.materials[index].url = result.url
    formData.materials[index].content = result.url
  } catch (e: any) {
    ElMessage.error(e.message || '图片上传失败')
  }
}

function handleThumbBeforeUpload(file: File, _index: number): boolean {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    ElMessage.error('只能上传 JPG/PNG/GIF/WEBP 格式的图片')
    return false
  }
  if (file.size > 2 * 1024 * 1024) {
    ElMessage.error('图片大小不能超过 2MB')
    return false
  }
  return true
}

async function handleThumbUpload(option: UploadRequestOptions, index: number) {
  try {
    const result = await uploadImage(option.file as File)
    formData.materials[index].thumbUrl = result.url
  } catch (e: any) {
    ElMessage.error(e.message || '图片上传失败')
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

.form-tip {
  margin-left: 8px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  white-space: nowrap;
}

.materials-section {
  width: 100%;
}

.material-item {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;
  background-color: var(--el-fill-color-blank);
}

.material-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.material-body {
  margin-top: 8px;
}

.image-placeholder {
  width: 120px;
  height: 120px;
  border: 1px dashed var(--el-border-color);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: var(--el-text-color-secondary);
  cursor: pointer;
}

.image-placeholder:hover {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
}

.image-preview {
  width: 120px;
  height: 120px;
  border-radius: 6px;
  overflow: hidden;
  position: relative;
}

.preview-image {
  width: 100%;
  height: 100%;
}

.image-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  opacity: 0;
  transition: opacity 0.2s;
}

.image-preview:hover .image-overlay {
  opacity: 1;
}

.thumb-preview {
  width: 80px;
  height: 80px;
  border-radius: 4px;
  overflow: hidden;
}

.thumb-image {
  width: 100%;
  height: 100%;
}
</style>
