<template>
  <div class="page-container">
    <el-row :gutter="20">
      <el-col :span="16">
        <el-card>
          <template #header>客户详情</template>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="头像"><el-avatar :size="40" /></el-descriptions-item>
            <el-descriptions-item label="昵称">—</el-descriptions-item>
            <el-descriptions-item label="渠道来源">—</el-descriptions-item>
            <el-descriptions-item label="客户阶段">—</el-descriptions-item>
            <el-descriptions-item label="标签">
              <el-tag v-for="t in tags" :key="t" closable>{{ t }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="最后互动">—</el-descriptions-item>
          </el-descriptions>
        </el-card>
        <el-card style="margin-top:20px">
          <template #header>互动记录</template>
          <el-empty description="暂无互动记录" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <template #header>AI 洞察</template>
          <el-button type="primary" @click="generateInsight">生成客户画像分析</el-button>
        </el-card>
        <el-card style="margin-top:20px">
          <template #header>客户旅程</template>
          <el-empty description="暂无旅程数据" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
const tags = ref<string[]>([])
function generateInsight() { ElMessage.info('正在生成客户画像...') }
</script>
