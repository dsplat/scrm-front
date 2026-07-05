<template>
  <div class="page-container">
    <el-row :gutter="20">
      <el-col :span="18">
        <el-card>
          <template #header>对话记录</template>
          <div class="chat-area"><el-empty description="暂无消息" /></div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <template #header>客户信息</template>
          <el-descriptions :column="1">
            <el-descriptions-item label="昵称">—</el-descriptions-item>
            <el-descriptions-item label="渠道">—</el-descriptions-item>
            <el-descriptions-item label="标签">—</el-descriptions-item>
          </el-descriptions>
          <el-button type="primary" style="width:100%;margin-top:12px">AI 分析对话</el-button>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>
<script setup lang="ts"></script>
<style scoped>.chat-area { min-height: 400px; }</style>
