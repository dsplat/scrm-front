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
