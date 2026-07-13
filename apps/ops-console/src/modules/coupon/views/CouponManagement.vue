<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>优惠券管理</span>
          <div class="header-actions">
            <el-button type="danger" @click="openBatchDelete"> 批量删除 </el-button>
            <el-button type="primary" @click="handleCreate"> 新建优惠券 </el-button>
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
        <el-form-item label="优惠券名称" prop="name">
          <el-input
            v-model="formData.name"
            placeholder="请输入优惠券名称"
            maxlength="50"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="优惠券类型" prop="type">
          <el-select v-model="formData.type" placeholder="请选择优惠券类型" style="width: 100%">
            <el-option
              v-for="opt in typeOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="面额/折扣" prop="value">
          <el-input-number
            v-model="formData.value"
            :min="0.01"
            :max="formData.type === 'discount' ? 99.99 : 999999"
            :precision="2"
            :step="formData.type === 'discount' ? 0.1 : 10"
            style="width: 100%"
          />
          <span class="form-tip">{{
            formData.type === 'discount' ? '折（如9.5折输入9.5）' : '元'
          }}</span>
        </el-form-item>
        <el-form-item label="使用门槛" prop="minAmount">
          <el-input-number
            v-model="formData.minAmount"
            :min="0"
            :precision="2"
            :step="10"
            style="width: 100%"
          />
          <span class="form-tip">元（0表示无门槛）</span>
        </el-form-item>
        <el-form-item label="发放数量" prop="totalCount">
          <el-input-number
            v-model="formData.totalCount"
            :min="1"
            :max="999999"
            :step="1"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="有效期类型" prop="validityType">
          <el-radio-group v-model="formData.validityType">
            <el-radio value="permanent"> 永久有效 </el-radio>
            <el-radio value="period"> 固定期限 </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item
          v-if="formData.validityType === 'period'"
          label="有效期范围"
          prop="validityRange"
        >
          <el-date-picker
            v-model="formData.validityRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="formData.description"
            type="textarea"
            placeholder="请输入描述"
            :rows="3"
            maxlength="500"
            show-word-limit
          />
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

    <el-dialog
      v-model="batchDeleteVisible"
      title="批量删除优惠券"
      width="480px"
      :close-on-click-modal="false"
    >
      <el-form label-width="80px">
        <el-form-item label="优惠券">
          <el-select
            v-model="batchDeleteIds"
            multiple
            filterable
            remote
            :remote-method="searchCouponsForDelete"
            :loading="searchLoading"
            placeholder="输入优惠券名称搜索并选择"
            style="width: 100%"
          >
            <el-option
              v-for="item in searchableCoupons"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="batchDeleteVisible = false"> 取消 </el-button>
        <el-button
          type="danger"
          :disabled="!batchDeleteIds.length"
          :loading="batchDeleting"
          @click="confirmBatchDelete"
        >
          删除选中 ({{ batchDeleteIds.length }})
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, h } from 'vue'
import { useDebounceFn } from '@vueuse/core'
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
  getCouponList,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  batchDeleteCoupons,
  type Coupon,
  type CouponListParams,
  type CreateCouponData,
  type UpdateCouponData,
} from '@/modules/coupon/api/coupon'

defineOptions({ name: 'CouponManagement' })

const tableRef = ref<InstanceType<typeof ProTable>>()
const dialogVisible = ref(false)
const dialogTitle = ref('新建优惠券')
const submitting = ref(false)
const formRef = ref<FormInstance>()
const editingId = ref<number | null>(null)

const batchDeleteVisible = ref(false)
const batchDeleteIds = ref<number[]>([])
const batchDeleting = ref(false)
const searchLoading = ref(false)
const searchableCoupons = ref<Coupon[]>([])

const defaultFormData = {
  name: '',
  type: 'cash' as 'cash' | 'discount' | 'free_shipping',
  value: 0,
  minAmount: 0,
  totalCount: 100,
  validityType: 'permanent' as 'permanent' | 'period',
  validityRange: [] as string[],
  description: '',
  status: 1,
}

const formData = reactive({ ...defaultFormData })

const formRules: FormRules = {
  name: [{ required: true, message: '请输入优惠券名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择优惠券类型', trigger: 'change' }],
  value: [
    { required: true, message: '请输入面额/折扣', trigger: 'blur' },
    {
      validator: (_rule: FormRules[string], val: number, callback: (error?: Error) => void) => {
        if (val === undefined || val === null || val <= 0) {
          callback(new Error('面额/折扣必须大于0'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
  totalCount: [
    { required: true, message: '请输入发放数量', trigger: 'blur' },
    {
      validator: (_rule: FormRules[string], val: number, callback: (error?: Error) => void) => {
        if (!val || val < 1) {
          callback(new Error('发放数量至少为1'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
  validityType: [{ required: true, message: '请选择有效期类型', trigger: 'change' }],
  validityRange: [
    {
      validator: (_rule: FormRules[string], value: string[], callback: (error?: Error) => void) => {
        if (formData.validityType === 'period' && (!value || value.length !== 2)) {
          callback(new Error('请选择有效期范围'))
        } else {
          callback()
        }
      },
      trigger: 'change',
    },
  ],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
}

const typeOptions = [
  { label: '满减券', value: 'cash' },
  { label: '折扣券', value: 'discount' },
  { label: '包邮券', value: 'free_shipping' },
]

function getTypeLabel(type: string) {
  return typeOptions.find((o) => o.value === type)?.label ?? type
}

function getTypeTagType(type: string) {
  const map: Record<string, string> = {
    cash: 'danger',
    discount: 'warning',
    free_shipping: 'success',
  }
  return map[type] ?? 'info'
}

function formatValue(row: Coupon) {
  if (row.type === 'discount') return `${row.value}折`
  if (row.type === 'free_shipping') return '包邮'
  return `¥${row.value?.toFixed(2) ?? '0.00'}`
}

const searchConfig: SearchConfig[] = [
  { prop: 'name', label: '优惠券名称', type: 'input', placeholder: '请输入优惠券名称' },
  {
    prop: 'type',
    label: '优惠券类型',
    type: 'select',
    placeholder: '请选择优惠券类型',
    options: typeOptions,
  },
]

const columns: ColumnConfig[] = [
  { prop: 'id', label: 'ID', width: 80 },
  { prop: 'name', label: '优惠券名称', minWidth: 150 },
  {
    prop: 'type',
    label: '类型',
    width: 100,
    render: (row: Coupon) =>
      h(ElTag, { type: getTypeTagType(row.type) as any }, () => getTypeLabel(row.type)),
  },
  {
    prop: 'value',
    label: '面额/折扣',
    width: 110,
    render: (row: Coupon) => h('span', null, formatValue(row)),
  },
  {
    prop: 'minAmount',
    label: '使用门槛',
    width: 110,
    render: (row: Coupon) =>
      h('span', null, row.minAmount > 0 ? `满¥${row.minAmount.toFixed(2)}` : '无门槛'),
  },
  {
    prop: 'totalCount',
    label: '发放/已用',
    width: 110,
    render: (row: Coupon) => h('span', null, `${row.totalCount}/${row.usedCount}`),
  },
  {
    prop: 'validityType',
    label: '有效期',
    width: 180,
    render: (row: Coupon) =>
      h(
        'span',
        null,
        row.validityType === 'permanent'
          ? '永久有效'
          : `${row.validityStart} 至 ${row.validityEnd}`,
      ),
  },
  {
    prop: 'status',
    label: '状态',
    width: 80,
    render: (row: Coupon) =>
      h(ElTag, { type: row.status === 1 ? 'success' : 'danger' }, () =>
        row.status === 1 ? '启用' : '禁用',
      ),
  },
  { prop: 'createdAt', label: '创建时间', width: 170, sortable: true },
]

const actions: ActionConfig[] = [
  { label: '编辑', type: 'primary', onClick: (row) => handleEdit(row as Coupon) },
  { label: '删除', type: 'danger', onClick: (row) => handleDelete(row as Coupon) },
]

async function handleRequest(params: RequestParams): Promise<RequestResult> {
  try {
    const query: CouponListParams = {
      page: params.page,
      pageSize: params.pageSize,
    }
    if (params.name) query.name = params.name
    if (params.type) query.type = params.type
    const res = await getCouponList(query)
    return { data: res.data ?? [], total: res.total ?? 0 }
  } catch (e: any) {
    ElMessage.error(e.message || '获取优惠券列表失败')
    return { data: [], total: 0 }
  }
}

function resetForm() {
  Object.assign(formData, { ...defaultFormData, validityRange: [...defaultFormData.validityRange] })
}

function handleCreate() {
  dialogTitle.value = '新建优惠券'
  editingId.value = null
  resetForm()
  dialogVisible.value = true
}

function handleEdit(row: Coupon) {
  dialogTitle.value = '编辑优惠券'
  editingId.value = row.id
  formData.name = row.name
  formData.type = row.type
  formData.value = row.value
  formData.minAmount = row.minAmount || 0
  formData.totalCount = row.totalCount
  formData.validityType = row.validityType
  formData.validityRange =
    row.validityStart && row.validityEnd ? [row.validityStart, row.validityEnd] : []
  formData.description = row.description || ''
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

  const basePayload = {
    name: formData.name,
    type: formData.type,
    value: formData.value,
    minAmount: formData.minAmount ?? undefined,
    totalCount: formData.totalCount,
    validityType: formData.validityType,
    description: formData.description || undefined,
    status: formData.status,
  }

  if (formData.validityType === 'period' && formData.validityRange?.length === 2) {
    Object.assign(basePayload, {
      validityStart: formData.validityRange[0],
      validityEnd: formData.validityRange[1],
    })
  }

  submitting.value = true
  try {
    if (editingId.value !== null) {
      await updateCoupon(editingId.value, basePayload as UpdateCouponData)
    } else {
      await createCoupon(basePayload as CreateCouponData)
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

async function handleDelete(row: Coupon) {
  try {
    await ElMessageBox.confirm('确定删除该优惠券吗？', '提示', { type: 'warning' })
    await deleteCoupon(row.id)
    ElMessage.success('删除成功')
    tableRef.value?.refresh()
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e.message || '删除失败')
    }
  }
}

function openBatchDelete() {
  batchDeleteIds.value = []
  searchableCoupons.value = []
  batchDeleteVisible.value = true
}

async function doSearchCouponsForDelete(query: string) {
  if (!query) {
    searchableCoupons.value = []
    return
  }
  searchLoading.value = true
  try {
    const res = await getCouponList({ page: 1, pageSize: 50, name: query })
    searchableCoupons.value = res.data ?? []
  } catch {
    searchableCoupons.value = []
  } finally {
    searchLoading.value = false
  }
}

const searchCouponsForDelete = useDebounceFn(doSearchCouponsForDelete, 300)

async function confirmBatchDelete() {
  if (!batchDeleteIds.value.length) return
  try {
    await ElMessageBox.confirm(
      `确定删除选中的 ${batchDeleteIds.value.length} 张优惠券吗？`,
      '提示',
      { type: 'warning' },
    )
    batchDeleting.value = true
    await batchDeleteCoupons(batchDeleteIds.value)
    ElMessage.success('批量删除成功')
    batchDeleteVisible.value = false
    batchDeleteIds.value = []
    tableRef.value?.refresh()
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e.message || '批量删除失败')
    }
  } finally {
    batchDeleting.value = false
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
</style>
