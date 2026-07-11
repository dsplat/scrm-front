<template>
  <div class="page-container">
    <el-card>
      <template #header><span>图表组件示例</span></template>
      <el-row :gutter="20">
        <el-col :span="8"><BarChart :data="barData" title="柱状图示例" /></el-col>
        <el-col :span="8"><LineChart :data="lineData" title="折线图示例" /></el-col>
        <el-col :span="8"><PieChart :data="pieData" title="饼图示例" /></el-col>
      </el-row>
    </el-card>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { BarChart, LineChart, PieChart } from '@/components/common/Charts'
const barData = ref([{ name: '一月', value: 120 }, { name: '二月', value: 200 }, { name: '三月', value: 150 }, { name: '四月', value: 80 }, { name: '五月', value: 170 }])
const lineData = ref([{ name: '周一', value: 120 }, { name: '周二', value: 200 }, { name: '周三', value: 150 }, { name: '周四', value: 80 }, { name: '周五', value: 170 }])
const pieData = ref([{ name: '直接访问', value: 335 }, { name: '邮件营销', value: 310 }, { name: '联盟广告', value: 234 }, { name: '视频广告', value: 135 }, { name: '搜索引擎', value: 548 }])
</script>
