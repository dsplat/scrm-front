<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>商品管理</span>
          <div class="header-actions">
            <el-button type="primary" @click="handleCreate"> 新建商品 </el-button>
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
      v-model="dialogVisible"
      :title="dialogTitle"
      width="640px"
      :close-on-click-modal="false"
      @close="handleDialogClose"
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-form-item label="商品名称" prop="name">
          <el-input
            v-model="formData.name"
            placeholder="请输入商品名称"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="商品图片" prop="image">
          <el-upload
            class="image-uploader"
            :show-file-list="false"
            :before-upload="beforeImageUpload"
            :http-request="handleImageUpload"
            accept="image/jpeg,image/png,image/gif,image/webp"
          >
            <el-image
              v-if="formData.image"
              :src="formData.image"
              fit="cover"
              class="preview-image"
            />
            <el-icon v-else class="upload-placeholder">
              <Plus />
            </el-icon>
          </el-upload>
        </el-form-item>
        <el-form-item label="价格" prop="price">
          <el-input-number
            v-model="formData.price"
            :min="0.01"
            :max="999999"
            :precision="2"
            :step="1"
            style="width: 100%"
          />
          <span class="form-tip">元</span>
        </el-form-item>
        <el-form-item label="库存" prop="stock">
          <el-input-number
            v-model="formData.stock"
            :min="0"
            :max="999999"
            :step="1"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-select v-model="formData.category" placeholder="请选择分类" style="width: 100%">
            <el-option
              v-for="opt in categoryOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="formData.status">
            <el-radio :value="1"> 上架 </el-radio>
            <el-radio :value="0"> 下架 </el-radio>
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
  ElImage,
  ElSwitch,
  type FormInstance,
  type FormRules,
  type UploadRequestOptions,
} from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import ProTable from '@/components/common/ProTable/ProTable.vue'
import type {
  ColumnConfig,
  SearchConfig,
  ActionConfig,
  RequestParams,
  RequestResult,
} from '@/components/common/ProTable/ProTable.vue'
import { uploadImage } from '@/api/common/upload'
import {
  getProductList,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductStatus,
  type Product,
  type ProductListParams,
  type CreateProductData,
  type UpdateProductData,
} from '@/modules/product/api/product'

defineOptions({ name: 'ProductManagement' })

const tableRef = ref<InstanceType<typeof ProTable>>()
const dialogVisible = ref(false)
const dialogTitle = ref('新建商品')
const submitting = ref(false)
const formRef = ref<FormInstance>()
const editingId = ref<number | null>(null)

const categoryOptions = [
  { label: '数码', value: '数码' },
  { label: '服饰', value: '服饰' },
  { label: '食品', value: '食品' },
  { label: '家居', value: '家居' },
  { label: '美妆', value: '美妆' },
  { label: '其他', value: '其他' },
]

const defaultFormData = {
  name: '',
  image: '',
  price: 0,
  stock: 0,
  category: '',
  status: 1,
}

const formData = reactive({ ...defaultFormData })

const formRules: FormRules = {
  name: [{ required: true, message: '请输入商品名称', trigger: 'blur' }],
  image: [{ required: true, message: '请上传商品图片', trigger: 'change' }],
  price: [
    { required: true, message: '请输入价格', trigger: 'blur' },
    {
      validator: (_rule: FormRules[string], val: number, callback: (error?: Error) => void) => {
        if (val === undefined || val === null || val <= 0) {
          callback(new Error('价格必须大于0'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
  stock: [{ required: true, message: '请输入库存', trigger: 'blur' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
}

function getCategoryLabel(value: string) {
  return categoryOptions.find((o) => o.value === value)?.label ?? value
}

function beforeImageUpload(file: File) {
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!allowed.includes(file.type)) {
    ElMessage.error('只能上传 JPG/PNG/GIF/WEBP 格式的图片')
    return false
  }
  if (file.size > 2 * 1024 * 1024) {
    ElMessage.error('图片大小不能超过 2MB')
    return false
  }
  return true
}

async function handleImageUpload(options: UploadRequestOptions) {
  try {
    const res = await uploadImage(options.file as File)
    formData.image = res.url
  } catch (e: any) {
    ElMessage.error(e.message || '上传失败')
  }
}

const searchConfig: SearchConfig[] = [
  { prop: 'name', label: '商品名称', type: 'input', placeholder: '请输入商品名称' },
  {
    prop: 'category',
    label: '分类',
    type: 'select',
    placeholder: '请选择分类',
    options: categoryOptions,
  },
]

const columns: ColumnConfig[] = [
  { prop: 'id', label: 'ID', width: 80 },
  { prop: 'name', label: '商品名称', minWidth: 150 },
  {
    prop: 'image',
    label: '图片',
    width: 80,
    render: (row: Product) =>
      row.image
        ? h(ElImage, {
            src: row.image,
            fit: 'cover',
            style: 'width:48px;height:48px;border-radius:4px',
          })
        : h('span', { style: 'color:var(--el-text-color-secondary)' }, '暂无'),
  },
  {
    prop: 'price',
    label: '价格',
    width: 100,
    render: (row: Product) => h('span', null, `¥${row.price?.toFixed(2) ?? '0.00'}`),
  },
  { prop: 'stock', label: '库存', width: 80 },
  {
    prop: 'category',
    label: '分类',
    width: 100,
    render: (row: Product) => h(ElTag, null, () => getCategoryLabel(row.category)),
  },
  {
    prop: 'status',
    label: '上下架',
    width: 100,
    render: (row: Product) =>
      h(ElSwitch, {
        modelValue: row.status === 1,
        'onUpdate:modelValue': (val: string | number | boolean) => handleToggleStatus(row, !!val),
        activeText: '上架',
        inactiveText: '下架',
        inlinePrompt: true,
      }),
  },
  { prop: 'createdAt', label: '创建时间', width: 170, sortable: true },
]

const actions: ActionConfig[] = [
  { label: '编辑', type: 'primary', onClick: (row) => handleEdit(row as Product) },
  { label: '删除', type: 'danger', onClick: (row) => handleDelete(row as Product) },
]

async function handleRequest(params: RequestParams): Promise<RequestResult> {
  try {
    const query: ProductListParams = {
      page: params.page,
      pageSize: params.pageSize,
    }
    if (params.name) query.name = params.name
    if (params.category) query.category = params.category
    const res = await getProductList(query)
    return { data: res.data ?? [], total: res.total ?? 0 }
  } catch (e: any) {
    ElMessage.error(e.message || '获取商品列表失败')
    return { data: [], total: 0 }
  }
}

function resetForm() {
  Object.assign(formData, { ...defaultFormData })
}

function handleCreate() {
  dialogTitle.value = '新建商品'
  editingId.value = null
  resetForm()
  dialogVisible.value = true
}

function handleEdit(row: Product) {
  dialogTitle.value = '编辑商品'
  editingId.value = row.id
  formData.name = row.name
  formData.image = row.image
  formData.price = row.price
  formData.stock = row.stock
  formData.category = row.category
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

  const payload: CreateProductData = {
    name: formData.name,
    image: formData.image,
    price: formData.price,
    stock: formData.stock,
    category: formData.category,
    status: formData.status,
  }

  submitting.value = true
  try {
    if (editingId.value !== null) {
      await updateProduct(editingId.value, payload as UpdateProductData)
    } else {
      await createProduct(payload)
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

async function handleDelete(row: Product) {
  try {
    await ElMessageBox.confirm('确定删除该商品吗？', '提示', { type: 'warning' })
    await deleteProduct(row.id)
    ElMessage.success('删除成功')
    tableRef.value?.refresh()
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e.message || '删除失败')
    }
  }
}

async function handleToggleStatus(row: Product, val: boolean) {
  const newStatus = val ? 1 : 0
  try {
    await updateProductStatus(row.id, newStatus)
    row.status = newStatus
    ElMessage.success(val ? '已上架' : '已下架')
  } catch (e: any) {
    ElMessage.error(e.message || '操作失败')
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

.image-uploader :deep(.el-upload) {
  border: 1px dashed var(--el-border-color);
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.3s;
}

.image-uploader :deep(.el-upload:hover) {
  border-color: var(--el-color-primary);
}

.preview-image {
  width: 120px;
  height: 120px;
}

.upload-placeholder {
  font-size: 28px;
  color: var(--el-text-color-secondary);
}
</style>
