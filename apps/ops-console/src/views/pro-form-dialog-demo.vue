<template>
  <div class="page-container">
    <el-card>
      <template #header><span>ProFormDialog 示例</span></template>
      <el-button type="primary" @click="visible = true">打开弹窗</el-button>
      <ProFormDialog v-model="visible" title="示例表单" :fields="fields" :on-submit="handleSubmit" />
    </el-card>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import ProFormDialog from '@/components/common/ProFormDialog/ProFormDialog.vue'
const visible = ref(false)
const fields = [
  { prop: 'name', label: '名称', type: 'input', required: true },
  { prop: 'desc', label: '描述', type: 'textarea' },
]
const handleSubmit = async (data: any) => { console.log('submit', data) }
</script>
