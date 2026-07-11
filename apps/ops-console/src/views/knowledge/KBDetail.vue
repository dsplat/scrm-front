<template>
  <div class="page-container">
    <el-card
      ><template #header>知识库详情</template>
      <el-tabs
        ><el-tab-pane label="文档列表"><el-empty /></el-tab-pane>
        <el-tab-pane label="上传文档"
          ><el-upload drag
            ><el-icon><Upload /></el-icon>
            <div>拖拽文件到此处</div></el-upload
          ></el-tab-pane
        >
        <el-tab-pane label="搜索测试"
          ><el-input placeholder="输入关键词测试"
            ><template #append><el-button>搜索</el-button></template></el-input
          ></el-tab-pane
        ></el-tabs
      >
    </el-card>
  </div>
</template>
<script setup lang="ts"></script>
