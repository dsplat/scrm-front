<template>
  <div class="page-container">
    <el-card>
      <template #header> 规则编辑器 </template>
      <el-form label-width="120px">
        <el-form-item label="规则名称">
          <el-input v-model="name" />
        </el-form-item>
        <el-form-item label="触发条件">
          <el-select v-model="trigger">
            <el-option label="客户加入" value="customer_joined" /><el-option
              label="标签变化"
              value="tag_changed"
            /><el-option label="定时触发" value="scheduled" />
          </el-select>
        </el-form-item>
        <el-form-item label="动作链">
          <div
            style="
              width: 100%;
              min-height: 200px;
              border: 1px dashed #dcdfe6;
              border-radius: 4px;
              padding: 12px;
            "
          >
            <el-empty description="拖拽添加动作节点" />
          </div>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving" @click="handleSave"> 保存规则 </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { http } from '@scrm/shared'

const route = useRoute()
const router = useRouter()
const ruleId = route.params.id as string
const name = ref('')
const trigger = ref('customer_joined')
const saving = ref(false)

async function loadRule() {
  if (!ruleId || ruleId === 'new') return
  try {
    const res = (await http.get(`/scrm/automations/${ruleId}`)) as any
    const data = res?.data ?? res
    if (data) {
      name.value = data.name ?? ''
      trigger.value = data.trigger ?? 'customer_joined'
    }
  } catch {
    ElMessage.error('加载规则失败')
  }
}

async function handleSave() {
  if (!name.value) {
    ElMessage.warning('请输入规则名称')
    return
  }
  saving.value = true
  try {
    const payload = { name: name.value, trigger: trigger.value }
    if (ruleId && ruleId !== 'new') {
      await http.put(`/scrm/automations/${ruleId}`, payload)
      ElMessage.success('规则已保存')
    } else {
      await http.post('/scrm/automations', payload)
      ElMessage.success('规则已创建')
      router.push('/automations')
    }
  } catch {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(loadRule)
</script>
<template>
  <div class="page-container">
    <el-card
      ><template #header>规则编辑器</template>
      <el-form label-width="120px">
        <el-form-item label="规则名称"><el-input v-model="name" /></el-form-item>
        <el-form-item label="触发条件"
          ><el-select v-model="trigger"
            ><el-option label="客户加入" value="customer_joined" /><el-option
              label="标签变化"
              value="tag_changed" /><el-option label="定时触发" value="scheduled" /></el-select
        ></el-form-item>
        <el-form-item label="动作链"
          ><div
            style="
              width: 100%;
              min-height: 200px;
              border: 1px dashed #dcdfe6;
              border-radius: 4px;
              padding: 12px;
            "
          >
            <el-empty description="拖拽添加动作节点" /></div
        ></el-form-item>
        <el-form-item
          ><el-button type="primary" :loading="saving" @click="handleSave"
            >保存规则</el-button
          ></el-form-item
        >
      </el-form></el-card
    >
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { http } from '@scrm/shared'

const route = useRoute()
const router = useRouter()
const ruleId = route.params.id as string
const name = ref('')
const trigger = ref('customer_joined')
const saving = ref(false)

async function loadRule() {
  if (!ruleId || ruleId === 'new') return
  try {
    const res = (await http.get(`/scrm/automation-rules/${ruleId}`)) as any
    const data = res?.data ?? res
    if (data) {
      name.value = data.name ?? ''
      trigger.value = data.trigger ?? 'customer_joined'
    }
  } catch {
    ElMessage.error('加载规则失败')
  }
}

async function handleSave() {
  if (!name.value) {
    ElMessage.warning('请输入规则名称')
    return
  }
  saving.value = true
  try {
    const payload = { name: name.value, trigger: trigger.value }
    if (ruleId && ruleId !== 'new') {
      await http.put(`/scrm/automation-rules/${ruleId}`, payload)
      ElMessage.success('规则已保存')
    } else {
      await http.post('/scrm/automation-rules', payload)
      ElMessage.success('规则已创建')
      router.push('/automations')
    }
  } catch {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(loadRule)
</script>
<template>
  <div class="page-container">
    <el-card
      ><template #header>规则编辑器</template>
      <el-form label-width="120px">
        <el-form-item label="规则名称"><el-input v-model="name" /></el-form-item>
        <el-form-item label="触发条件"
          ><el-select v-model="trigger"
            ><el-option label="客户加入" value="customer_joined" /><el-option
              label="标签变化"
              value="tag_changed" /><el-option label="定时触发" value="scheduled" /></el-select
        ></el-form-item>
        <el-form-item label="动作链"
          ><div
            style="
              width: 100%;
              min-height: 200px;
              border: 1px dashed #dcdfe6;
              border-radius: 4px;
              padding: 12px;
            "
          >
            <el-empty description="拖拽添加动作节点" /></div
        ></el-form-item>
        <el-form-item><el-button type="primary">保存规则</el-button></el-form-item>
      </el-form></el-card
    >
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
const name = ref('')
const trigger = ref('customer_joined')
</script>
