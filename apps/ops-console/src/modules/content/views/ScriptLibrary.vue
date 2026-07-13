<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>话术库</span>
          <el-button type="primary" @click="handleCreate"> 新建话术 </el-button>
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
      width="680px"
      :close-on-click-modal="false"
      @close="formRef?.resetFields()"
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="80px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="formData.title" placeholder="请输入话术标题" maxlength="100" />
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-input v-model="formData.category" placeholder="请输入分类" maxlength="50" />
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <el-input
            v-model="formData.content"
            type="textarea"
            placeholder="请输入话术内容"
            :rows="6"
            maxlength="2000"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="标签">
          <el-input v-model="formData.tagsText" placeholder="多个标签用逗号分隔" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false"> 取消 </el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit"> 确定 </el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="detailVisible" title="话术详情" size="500px">
      <template v-if="detailData">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="标题">
            {{ detailData.title }}
          </el-descriptions-item>
          <el-descriptions-item label="分类">
            {{ detailData.category }}
          </el-descriptions-item>
          <el-descriptions-item label="标签">
            <el-tag v-for="tag in detailData.tags" :key="tag" style="margin-right: 4px">
              {{ tag }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="使用次数">
            {{ detailData.useCount ?? 0 }}
          </el-descriptions-item>
          <el-descriptions-item label="内容">
            <div style="white-space: pre-wrap">
              {{ detailData.content }}
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ detailData.createdAt }}
          </el-descriptions-item>
        </el-descriptions>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import ProTable from '@/components/common/ProTable/ProTable.vue'
import type {
  ColumnConfig,
  SearchConfig,
  ActionConfig,
  RequestParams,
  RequestResult,
} from '@/components/common/ProTable/ProTable.vue'
import {
  getScriptList,
  createScript,
  updateScript,
  deleteScript,
  type Script,
  type ScriptListParams,
} from '@/modules/content/api/script'

defineOptions({ name: 'ScriptLibrary' })

const tableRef = ref<InstanceType<typeof ProTable>>()
const dialogVisible = ref(false)
const dialogTitle = ref('新建话术')
const submitting = ref(false)
const formRef = ref<FormInstance>()
const detailVisible = ref(false)
const detailData = ref<Script | null>(null)
const editingId = ref<number | null>(null)

const defaultFormData = {
  title: '',
  category: '',
  content: '',
  tagsText: '',
}

const formData = reactive({ ...defaultFormData })

const formRules: FormRules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入话术内容', trigger: 'blur' }],
}

const searchConfig: SearchConfig[] = [
  { prop: 'keyword', label: '关键词', type: 'input', placeholder: '搜索标题/内容' },
  { prop: 'category', label: '分类', type: 'input', placeholder: '请输入分类' },
]

const columns: ColumnConfig[] = [
  { prop: 'id', label: 'ID', width: 80 },
  { prop: 'title', label: '标题', minWidth: 180 },
  { prop: 'category', label: '分类', width: 120 },
  { prop: 'useCount', label: '使用次数', width: 100 },
  { prop: 'createdAt', label: '创建时间', width: 180, sortable: true },
]

const actions: ActionConfig[] = [
  { label: '详情', type: 'primary', onClick: (row) => handleDetail(row as Script) },
  { label: '编辑', type: 'primary', onClick: (row) => handleEdit(row as Script) },
  { label: '删除', type: 'danger', onClick: (row) => handleDelete(row as Script) },
]

async function handleRequest(params: RequestParams): Promise<RequestResult> {
  try {
    const query: ScriptListParams = { page: params.page, pageSize: params.pageSize }
    if (params.keyword) query.keyword = params.keyword
    if (params.category) query.category = params.category
    const res = await getScriptList(query)
    return { data: res.data ?? [], total: res.total ?? 0 }
  } catch (e: any) {
    ElMessage.error(e.message || '获取话术列表失败')
    return { data: [], total: 0 }
  }
}

function handleCreate() {
  dialogTitle.value = '新建话术'
  editingId.value = null
  Object.assign(formData, defaultFormData)
  dialogVisible.value = true
}

function handleEdit(row: Script) {
  dialogTitle.value = '编辑话术'
  editingId.value = row.id
  formData.title = row.title
  formData.category = row.category || ''
  formData.content = row.content
  formData.tagsText = (row.tags ?? []).join(', ')
  dialogVisible.value = true
}

function handleDetail(row: Script) {
  detailData.value = row
  detailVisible.value = true
}

async function handleSubmit() {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  const payload = {
    title: formData.title,
    category: formData.category,
    content: formData.content,
    tags: formData.tagsText
      ? formData.tagsText
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [],
  }

  submitting.value = true
  try {
    if (editingId.value !== null) {
      await updateScript(editingId.value, payload)
    } else {
      await createScript(payload)
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

async function handleDelete(row: Script) {
  try {
    await ElMessageBox.confirm('确定删除该话术吗？', '提示', { type: 'warning' })
    await deleteScript(row.id)
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
