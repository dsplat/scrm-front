<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>问卷表单</span>
          <div class="header-actions">
            <el-button type="primary" @click="handleCreate"> 创建问卷 </el-button>
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
      width="900px"
      :close-on-click-modal="false"
      @close="handleFormClose"
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-form-item label="问卷标题" prop="title">
          <el-input
            v-model="formData.title"
            placeholder="请输入问卷标题"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="问卷描述" prop="description">
          <el-input
            v-model="formData.description"
            type="textarea"
            placeholder="请输入问卷描述"
            :rows="3"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>

        <el-divider content-position="left"> 题目设计 </el-divider>

        <div class="question-toolbar">
          <el-button type="primary" plain size="small" @click="addQuestion('radio')">
            <el-icon><Plus /></el-icon> 单选题
          </el-button>
          <el-button type="primary" plain size="small" @click="addQuestion('checkbox')">
            <el-icon><Plus /></el-icon> 多选题
          </el-button>
          <el-button type="primary" plain size="small" @click="addQuestion('text')">
            <el-icon><Plus /></el-icon> 文本题
          </el-button>
          <el-button type="primary" plain size="small" @click="addQuestion('textarea')">
            <el-icon><Plus /></el-icon> 长文本
          </el-button>
          <el-button type="primary" plain size="small" @click="addQuestion('select')">
            <el-icon><Plus /></el-icon> 下拉选择
          </el-button>
          <span class="question-count">共 {{ formData.questions.length }} 题</span>
        </div>

        <VueDraggable
          v-model="formData.questions"
          :animation="200"
          handle=".drag-handle"
          class="question-list"
          @update="syncSortOrder"
        >
          <div
            v-for="(question, index) in formData.questions"
            :key="question._uid"
            class="question-item"
          >
            <div class="question-item-header">
              <div class="question-item-left">
                <el-icon class="drag-handle">
                  <Rank />
                </el-icon>
                <span class="question-item-index">{{ index + 1 }}.</span>
                <el-tag size="small" :type="getQuestionTagType(question.type)">
                  {{ getQuestionLabel(question.type) }}
                </el-tag>
              </div>
              <div class="question-item-right">
                <el-checkbox v-model="question.required" label="必填" />
                <el-button
                  v-if="formData.questions.length > 1"
                  type="danger"
                  link
                  size="small"
                  :disabled="index === 0"
                  @click="moveQuestion(index, -1)"
                >
                  <el-icon><Top /></el-icon>
                </el-button>
                <el-button
                  v-if="formData.questions.length > 1"
                  type="danger"
                  link
                  size="small"
                  :disabled="index === formData.questions.length - 1"
                  @click="moveQuestion(index, 1)"
                >
                  <el-icon><Bottom /></el-icon>
                </el-button>
                <el-button
                  v-if="formData.questions.length > 1"
                  type="danger"
                  link
                  size="small"
                  @click="removeQuestion(index)"
                >
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </div>

            <el-form-item
              :prop="'questions.' + index + '.title'"
              :rules="[{ required: true, message: '请输入题目标题', trigger: 'blur' }]"
              label="题目标题"
              class="question-title-item"
            >
              <el-input
                v-model="question.title"
                placeholder="请输入题目标题"
                maxlength="200"
                show-word-limit
              />
            </el-form-item>

            <el-form-item
              v-if="question.type === 'text' || question.type === 'textarea'"
              label="提示文字"
            >
              <el-input
                v-model="question.placeholder"
                placeholder="请输入提示文字"
                maxlength="100"
              />
            </el-form-item>

            <el-form-item
              v-if="hasOptions(question.type)"
              label="选项配置"
              :prop="'questions.' + index + '.options'"
              :rules="[{ validator: validateOptions, trigger: 'change' }]"
            >
              <div class="option-list">
                <div
                  v-for="(_opt, optIndex) in question.options"
                  :key="optIndex"
                  class="option-item"
                >
                  <el-input
                    v-model="question.options[optIndex]"
                    :placeholder="'选项' + (optIndex + 1)"
                    maxlength="100"
                    style="flex: 1"
                  />
                  <el-button
                    v-if="question.options.length > 2"
                    type="danger"
                    link
                    size="small"
                    @click="question.options.splice(optIndex, 1)"
                  >
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
                <el-button type="primary" link size="small" @click="question.options.push('')">
                  <el-icon><Plus /></el-icon> 添加选项
                </el-button>
              </div>
            </el-form-item>
          </div>
        </VueDraggable>

        <el-empty
          v-if="formData.questions.length === 0"
          description="请添加题目"
          :image-size="80"
        />
      </el-form>

      <template #footer>
        <el-button @click="formVisible = false"> 取消 </el-button>
        <el-button @click="handlePreview"> 预览 </el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit"> 确定 </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="previewVisible" title="问卷预览" width="700px">
      <div class="preview-container">
        <h2 class="preview-title">
          {{ previewData.title }}
        </h2>
        <p v-if="previewData.description" class="preview-desc">
          {{ previewData.description }}
        </p>
        <el-divider />
        <div
          v-for="(question, index) in previewData.questions"
          :key="index"
          class="preview-question"
        >
          <div class="preview-question-title">
            <span class="preview-question-index">{{ index + 1 }}.</span>
            {{ question.title }}
            <span v-if="question.required" class="preview-required">*</span>
          </div>
          <div class="preview-question-body">
            <el-radio-group v-if="question.type === 'radio'" disabled>
              <el-radio v-for="opt in question.options" :key="opt" :value="opt">
                {{ opt }}
              </el-radio>
            </el-radio-group>
            <el-checkbox-group v-else-if="question.type === 'checkbox'" disabled>
              <el-checkbox v-for="opt in question.options" :key="opt" :value="opt" :label="opt" />
            </el-checkbox-group>
            <el-select
              v-else-if="question.type === 'select'"
              disabled
              placeholder="请选择"
              style="width: 100%"
            >
              <el-option v-for="opt in question.options" :key="opt" :label="opt" :value="opt" />
            </el-select>
            <el-input
              v-else-if="question.type === 'text'"
              disabled
              :placeholder="question.placeholder || '请输入'"
            />
            <el-input
              v-else-if="question.type === 'textarea'"
              disabled
              type="textarea"
              :rows="2"
              :placeholder="question.placeholder || '请输入'"
            />
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="previewVisible = false"> 关闭 </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="responseVisible" title="回收数据" width="1000px">
      <ProTable
        ref="responseTableRef"
        :columns="responseColumns"
        :request="handleResponseRequest"
        :search-config="[]"
      />
      <template #footer>
        <el-button @click="responseVisible = false"> 关闭 </el-button>
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
  ElPopover,
  type FormInstance,
  type FormRules,
  type FormItemRule,
} from 'element-plus'
import { Plus, Delete, Top, Bottom, Rank } from '@element-plus/icons-vue'
import { VueDraggable } from 'vue-draggable-plus'
import ProTable from '@/components/common/ProTable/ProTable.vue'
import type {
  ColumnConfig,
  SearchConfig,
  ActionConfig,
  RequestParams,
  RequestResult,
} from '@/components/common/ProTable/ProTable.vue'
import {
  getSurveyList,
  getSurveyDetail,
  createSurvey,
  updateSurvey,
  deleteSurvey,
  updateSurveyStatus,
  getSurveyResponseList,
  type Survey,
  type SurveyQuestion,
  type SurveyResponse,
  type SurveyListParams,
  type CreateSurveyData,
  type UpdateSurveyData,
  type SurveyResponseListParams,
} from '@/modules/platform/api/survey'

defineOptions({ name: 'SurveyForm' })

const tableRef = ref<InstanceType<typeof ProTable>>()
const formVisible = ref(false)
const formTitle = ref('创建问卷')
const submitting = ref(false)
const formRef = ref<FormInstance>()
const editingId = ref<number | null>(null)

const previewVisible = ref(false)
const previewData = reactive<{ title: string; description: string; questions: SurveyQuestion[] }>({
  title: '',
  description: '',
  questions: [],
})

const responseVisible = ref(false)
const responseTableRef = ref<InstanceType<typeof ProTable>>()
const currentResponseSurveyId = ref<number | null>(null)
const currentResponseQuestions = ref<SurveyQuestion[]>([])

const questionUid = ref(0)

interface QuestionForm {
  _uid: number
  type: SurveyQuestion['type']
  title: string
  required: boolean
  options: string[]
  placeholder: string
  sortOrder: number
}

const defaultQuestion = (type: SurveyQuestion['type']): QuestionForm => ({
  _uid: ++questionUid.value,
  type,
  title: '',
  required: false,
  options: hasOptions(type) ? ['', ''] : [],
  placeholder: '',
  sortOrder: 0,
})

const formData: { title: string; description: string; questions: QuestionForm[] } = reactive({
  title: '',
  description: '',
  questions: [defaultQuestion('radio')],
})

const formRules: FormRules = {
  title: [{ required: true, message: '请输入问卷标题', trigger: 'blur' }],
}

function getQuestionLabel(type: string) {
  const map: Record<string, string> = {
    radio: '单选',
    checkbox: '多选',
    text: '文本',
    textarea: '长文本',
    select: '下拉',
  }
  return map[type] ?? type
}

function getQuestionTagType(type: string) {
  const map: Record<string, 'primary' | 'success' | 'info' | 'warning' | 'danger'> = {
    radio: 'primary',
    checkbox: 'success',
    text: 'info',
    textarea: 'warning',
    select: 'danger',
  }
  return map[type] ?? 'info'
}

function hasOptions(type: string): boolean {
  return type === 'radio' || type === 'checkbox' || type === 'select'
}

function validateOptions(_rule: FormItemRule, value: string[], callback: (error?: Error) => void) {
  if (!value || value.length < 2) {
    callback(new Error('至少需要2个选项'))
  } else if (value.some((v) => !v.trim())) {
    callback(new Error('选项不能为空'))
  } else {
    callback()
  }
}

function addQuestion(type: SurveyQuestion['type']) {
  const q = defaultQuestion(type)
  q.sortOrder = formData.questions.length
  formData.questions.push(q)
}

function removeQuestion(index: number) {
  formData.questions.splice(index, 1)
}

function moveQuestion(index: number, direction: number) {
  const target = index + direction
  if (target < 0 || target >= formData.questions.length) return
  const temp = formData.questions[index]
  formData.questions.splice(index, 1)
  formData.questions.splice(target, 0, temp)
  formData.questions.forEach((q, i) => (q.sortOrder = i))
}

function syncSortOrder() {
  formData.questions.forEach((q, i) => (q.sortOrder = i))
}

const statusOptions = [
  { label: '草稿', value: 'draft' },
  { label: '进行中', value: 'active' },
  { label: '已关闭', value: 'closed' },
]

function getStatusLabel(status?: string) {
  return statusOptions.find((o) => o.value === status)?.label ?? status ?? '-'
}

function getStatusTagType(status?: string) {
  const map: Record<string, string> = { draft: 'info', active: 'success', closed: 'danger' }
  return (map[status ?? ''] ?? 'info') as 'info' | 'success' | 'danger'
}

function maskPhone(phone?: string): string {
  if (!phone || phone.length < 7) return phone ?? '-'
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

const searchConfig: SearchConfig[] = [
  { prop: 'title', label: '问卷标题', type: 'input', placeholder: '请输入问卷标题' },
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
  { prop: 'title', label: '问卷标题', minWidth: 200 },
  {
    prop: 'status',
    label: '状态',
    width: 100,
    render: (row: Survey) =>
      h(ElTag, { type: getStatusTagType(row.status) }, () => getStatusLabel(row.status)),
  },
  { prop: 'questionCount', label: '题目数', width: 80 },
  {
    prop: 'responseCount',
    label: '回收数',
    width: 80,
    render: (row: Survey) => h('span', null, row.responseCount ?? 0),
  },
  { prop: 'createdAt', label: '创建时间', width: 170, sortable: true },
]

const actions: ActionConfig[] = [
  { label: '编辑', type: 'primary', onClick: (row) => handleEdit(row as Survey) },
  { label: '回收数据', type: 'primary', onClick: (row) => handleViewResponses(row as Survey) },
  {
    label: '发布',
    type: 'success',
    onClick: (row) => handleStatusChange(row as Survey, 'active'),
    visible: (row) => (row as Survey).status === 'draft',
  },
  {
    label: '关闭',
    type: 'warning',
    onClick: (row) => handleStatusChange(row as Survey, 'closed'),
    visible: (row) => (row as Survey).status === 'active',
  },
  { label: '删除', type: 'danger', onClick: (row) => handleDelete(row as Survey) },
]

function getAnswerText(row: SurveyResponse, question: SurveyQuestion): string {
  const answers = row.answers || {}
  const value = question.id != null ? answers[question.id] : undefined
  if (value === undefined || value === null) return '-'
  if (Array.isArray(value)) return value.join('、')
  return String(value)
}

const responseColumns = computed<ColumnConfig[]>(() => {
  const base: ColumnConfig[] = [
    { prop: 'id', label: 'ID', width: 80 },
    { prop: 'respondentName', label: '提交人', width: 120 },
    {
      prop: 'respondentPhone',
      label: '手机号',
      width: 130,
      render: (row: SurveyResponse) => h('span', null, maskPhone(row.respondentPhone)),
    },
  ]
  const questionCols: ColumnConfig[] = currentResponseQuestions.value.map((q) => ({
    prop: `answer_${q.id ?? q.title}`,
    label: q.title,
    minWidth: 150,
    showOverflowTooltip: true,
    render: (row: SurveyResponse) => h('span', null, getAnswerText(row, q)),
  }))
  const suffix: ColumnConfig[] = [{ prop: 'submittedAt', label: '提交时间', width: 170 }]
  if (currentResponseQuestions.value.length > 3) {
    suffix.push({
      prop: '_answers',
      label: '全部答案',
      width: 100,
      fixed: 'right' as const,
      render: (row: SurveyResponse) => {
        const items = currentResponseQuestions.value.map((q) =>
          h('div', { style: 'margin-bottom:6px' }, [
            h('strong', null, `${q.title}：`),
            h('span', null, getAnswerText(row as SurveyResponse, q)),
          ]),
        )
        return h(
          ElPopover,
          { placement: 'left', width: 360, trigger: 'click' },
          {
            default: () => h('div', { style: 'max-height:400px;overflow-y:auto' }, items),
            reference: () => h(ElTag, { type: 'primary', style: 'cursor:pointer' }, () => '查看'),
          },
        )
      },
    })
  }
  return [...base, ...questionCols, ...suffix]
})

async function handleRequest(params: RequestParams): Promise<RequestResult> {
  try {
    const query: SurveyListParams = {
      page: params.page,
      pageSize: params.pageSize,
    }
    if (params.title) query.title = params.title
    if (params.status) query.status = params.status
    const res = await getSurveyList(query)
    return { data: res.data ?? [], total: res.total ?? 0 }
  } catch (e: any) {
    ElMessage.error(e.message || '获取问卷列表失败')
    return { data: [], total: 0 }
  }
}

function resetForm() {
  Object.assign(formData, {
    title: '',
    description: '',
    questions: [defaultQuestion('radio')],
  })
}

function handleCreate() {
  formTitle.value = '创建问卷'
  editingId.value = null
  resetForm()
  formVisible.value = true
}

async function handleEdit(row: Survey) {
  try {
    const detail = await getSurveyDetail(row.id)
    formTitle.value = '编辑问卷'
    editingId.value = row.id
    formData.title = detail.title
    formData.description = detail.description || ''
    formData.questions = detail.questions?.length
      ? detail.questions.map((q) => ({
          _uid: ++questionUid.value,
          type: q.type,
          title: q.title,
          required: q.required,
          options: q.options?.length ? [...q.options] : ['', ''],
          placeholder: q.placeholder || '',
          sortOrder: q.sortOrder,
        }))
      : [defaultQuestion('radio')]
    formVisible.value = true
  } catch (e: any) {
    ElMessage.error(e.message || '获取问卷详情失败')
  }
}

function handlePreview() {
  previewData.title = formData.title || '未命名问卷'
  previewData.description = formData.description
  previewData.questions = formData.questions.map((q) => ({
    type: q.type,
    title: q.title || '未填写题目',
    required: q.required,
    options: q.options,
    placeholder: q.placeholder,
    sortOrder: q.sortOrder,
  }))
  previewVisible.value = true
}

async function handleStatusChange(row: Survey, status: 'active' | 'closed') {
  const label = status === 'active' ? '发布' : '关闭'
  try {
    await ElMessageBox.confirm(`确定${label}该问卷吗？`, '提示', { type: 'warning' })
    await updateSurveyStatus(row.id, status)
    ElMessage.success(`问卷已${label}`)
    tableRef.value?.refresh()
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e.message || `${label}失败`)
    }
  }
}

async function handleDelete(row: Survey) {
  try {
    await ElMessageBox.confirm('确定删除该问卷吗？', '提示', { type: 'warning' })
    await deleteSurvey(row.id)
    ElMessage.success('删除成功')
    tableRef.value?.refresh()
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e.message || '删除失败')
    }
  }
}

async function handleViewResponses(row: Survey) {
  currentResponseSurveyId.value = row.id
  responseVisible.value = true
  try {
    const detail = await getSurveyDetail(row.id)
    currentResponseQuestions.value = detail.questions || []
  } catch {
    currentResponseQuestions.value = []
  }
  nextTick(() => {
    responseTableRef.value?.refresh()
  })
}

async function handleResponseRequest(params: RequestParams): Promise<RequestResult> {
  if (!currentResponseSurveyId.value) {
    return { data: [], total: 0 }
  }
  try {
    const query: SurveyResponseListParams = {
      page: params.page,
      pageSize: params.pageSize,
      surveyId: currentResponseSurveyId.value,
    }
    const res = await getSurveyResponseList(query)
    return { data: res.data ?? [], total: res.total ?? 0 }
  } catch (e: any) {
    ElMessage.error(e.message || '获取回收数据失败')
    return { data: [], total: 0 }
  }
}

async function handleSubmit() {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  if (formData.questions.length === 0) {
    ElMessage.warning('请至少添加一个题目')
    return
  }

  for (let i = 0; i < formData.questions.length; i++) {
    const q = formData.questions[i]
    if (!q.title.trim()) {
      ElMessage.warning(`第${i + 1}题标题不能为空`)
      return
    }
    if (hasOptions(q.type) && q.options.some((o) => !o.trim())) {
      ElMessage.warning(`第${i + 1}题存在空选项`)
      return
    }
  }

  const questions = formData.questions.map((q, i) => ({
    type: q.type,
    title: q.title,
    required: q.required,
    options: hasOptions(q.type) ? q.options.filter((o) => o.trim()) : undefined,
    placeholder: q.placeholder || undefined,
    sortOrder: i,
  }))

  const basePayload = {
    title: formData.title,
    description: formData.description || undefined,
    questions,
  }

  submitting.value = true
  try {
    if (editingId.value !== null) {
      await updateSurvey(editingId.value, basePayload as UpdateSurveyData)
    } else {
      await createSurvey(basePayload as CreateSurveyData)
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
  resetForm()
  formRef.value?.clearValidate()
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

.question-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 16px;
}

.question-count {
  margin-left: auto;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.question-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.question-item {
  padding: 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  background-color: var(--el-fill-color-blank);
}

.question-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.question-item-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.drag-handle {
  cursor: grab;
  color: var(--el-text-color-secondary);
  font-size: 16px;
}

.drag-handle:active {
  cursor: grabbing;
}

.question-item-index {
  font-weight: 600;
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.question-item-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.question-title-item {
  margin-bottom: 12px;
}

.option-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.preview-container {
  max-height: 60vh;
  overflow-y: auto;
  padding: 0 16px;
}

.preview-title {
  text-align: center;
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 8px;
}

.preview-desc {
  text-align: center;
  color: var(--el-text-color-secondary);
  margin: 0;
}

.preview-question {
  margin-bottom: 20px;
}

.preview-question-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
  color: var(--el-text-color-primary);
}

.preview-question-index {
  margin-right: 4px;
}

.preview-required {
  color: var(--el-color-danger);
  margin-left: 2px;
}

.preview-question-body {
  padding-left: 20px;
}
</style>
