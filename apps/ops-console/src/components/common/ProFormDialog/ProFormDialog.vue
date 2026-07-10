<template>
  <el-dialog
    v-model="dialogVisible"
    :title="title"
    :width="width"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      :label-width="labelWidth"
    >
      <el-form-item
        v-for="field in fields"
        :key="field.prop"
        :label="field.label"
        :prop="field.prop"
      >
        <el-input
          v-if="field.type === 'input'"
          v-model="formData[field.prop]"
          :placeholder="field.placeholder"
          :disabled="field.disabled"
          :maxlength="field.maxlength"
          show-word-limit
        />
        <el-input
          v-else-if="field.type === 'textarea'"
          v-model="formData[field.prop]"
          type="textarea"
          :placeholder="field.placeholder"
          :disabled="field.disabled"
          :rows="field.rows ?? 3"
          :maxlength="field.maxlength"
          show-word-limit
        />
        <el-select
          v-else-if="field.type === 'select'"
          v-model="formData[field.prop]"
          :placeholder="field.placeholder"
          :disabled="field.disabled"
          clearable
          style="width: 100%"
        >
          <el-option
            v-for="opt in field.options"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
        <el-date-picker
          v-else-if="field.type === 'date-picker'"
          v-model="formData[field.prop]"
          :type="field.dateType ?? 'date'"
          :placeholder="field.placeholder"
          :disabled="field.disabled"
          :format="field.format"
          :value-format="field.valueFormat ?? 'YYYY-MM-DD'"
          style="width: 100%"
        />
        <el-radio-group
          v-else-if="field.type === 'radio'"
          v-model="formData[field.prop]"
          :disabled="field.disabled"
        >
          <el-radio
            v-for="opt in field.options"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </el-radio>
        </el-radio-group>
        <el-switch
          v-else-if="field.type === 'switch'"
          v-model="formData[field.prop]"
          :disabled="field.disabled"
        />
        <el-input-number
          v-else-if="field.type === 'number'"
          v-model="formData[field.prop]"
          :min="field.min"
          :max="field.max"
          :step="field.step ?? 1"
          :disabled="field.disabled"
          style="width: 100%"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        {{ submitText }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
// ProFormDialog — 通用表单弹窗组件
import { ref, computed, watch, reactive, type FormInstance, type FormRules } from 'vue'
import { ElMessage } from 'element-plus'

export interface FieldOption {
  label: string
  value: any
}

export interface FieldConfig {
  prop: string
  label: string
  type: 'input' | 'textarea' | 'select' | 'date-picker' | 'radio' | 'switch' | 'number'
  placeholder?: string
  disabled?: boolean
  required?: boolean
  rules?: any[]
  // textarea
  rows?: number
  // input / textarea
  maxlength?: number
  // select / radio
  options?: FieldOption[]
  // date-picker
  dateType?: 'date' | 'datetime' | 'daterange' | 'datetimerange'
  format?: string
  valueFormat?: string
  // number
  min?: number
  max?: number
  step?: number
}

interface Props {
  modelValue: boolean
  title: string
  width?: string
  fields: FieldConfig[]
  labelWidth?: string
  submitText?: string
  initialData?: Record<string, any>
  onSubmit: (data: Record<string, any>) => Promise<void>
}

const props = withDefaults(defineProps<Props>(), {
  width: '600px',
  labelWidth: '100px',
  submitText: '确定',
  initialData: () => ({})
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: []
}>()

const formRef = ref<FormInstance>()
const submitting = ref(false)
const formData = reactive<Record<string, any>>({})

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const formRules = computed<FormRules>(() => {
  const rules: FormRules = {}
  props.fields.forEach(field => {
    const fieldRules: any[] = []
    if (field.required) {
      fieldRules.push({ required: true, message: `请输入${field.label}`, trigger: field.type === 'input' || field.type === 'textarea' ? 'blur' : 'change' })
    }
    if (field.rules?.length) {
      fieldRules.push(...field.rules)
    }
    if (fieldRules.length) {
      rules[field.prop] = fieldRules
    }
  })
  return rules
})

function initFormData() {
  props.fields.forEach(field => {
    formData[field.prop] = props.initialData?.[field.prop] ?? getDefaultValue(field)
  })
}

function getDefaultValue(field: FieldConfig): any {
  if (field.type === 'switch') return false
  if (field.type === 'number') return field.min ?? 0
  return ''
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
    await props.onSubmit({ ...formData })
    ElMessage.success('操作成功')
    dialogVisible.value = false
    emit('success')
  } catch (err: any) {
    ElMessage.error(err?.message ?? '操作失败')
  } finally {
    submitting.value = false
  }
}

function handleClose() {
  formRef.value?.resetFields()
}

watch(() => props.modelValue, (val) => {
  if (val) {
    initFormData()
  }
})

watch(() => props.initialData, () => {
  if (props.modelValue) {
    initFormData()
  }
}, { deep: true })
</script>
