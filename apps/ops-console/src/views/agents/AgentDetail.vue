<template>
  <div class="page-container">
    <el-card>
      <template #header>Agent 配置</template>
      <el-form :model="form" label-width="120px">
        <el-form-item label="名称"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="角色">
          <el-select v-model="form.role">
            <el-option label="客服 Agent" value="customer_service" />
            <el-option label="客户洞察 Agent" value="customer_insight" />
            <el-option label="数据分析 Agent" value="data_analysis" />
            <el-option label="营销策划 Agent" value="marketing_planning" />
          </el-select>
        </el-form-item>
        <el-form-item label="交互模式">
          <el-radio-group v-model="form.mode">
            <el-radio value="auto">全自动</el-radio>
            <el-radio value="semi">半自动</el-radio>
            <el-radio value="manual">手动确认</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="模型"><el-input v-model="form.model" /></el-form-item>
        <el-form-item><el-button type="primary">保存</el-button></el-form-item>
      </el-form>
    </el-card>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
const form = ref({ name: '', role: 'customer_service', mode: 'semi', model: 'gpt-4' })
</script>
