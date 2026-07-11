<template>
  <div class="dashboard">
    <el-row :gutter="20">
      <el-col :span="6" v-for="card in statCards" :key="card.title">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-title">{{ card.title }}</div>
          <div class="stat-value">{{ card.value }}</div>
          <div class="stat-trend" :class="card.trend >= 0 ? 'up' : 'down'">
            <el-icon v-if="card.trend >= 0"><Top /></el-icon>
            <el-icon v-else><Bottom /></el-icon>
            {{ Math.abs(card.trend) }}% vs 昨日
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="16">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>客户增长趋势</span>
              <el-radio-group v-model="trendRange" size="small">
                <el-radio-button value="7d">近7天</el-radio-button>
                <el-radio-button value="30d">近30天</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div ref="trendChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never">
          <template #header>渠道来源分布</template>
          <div ref="pieChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import { Top, Bottom } from '@element-plus/icons-vue'

const trendRange = ref<'7d' | '30d'>('7d')
const trendChartRef = ref<HTMLElement>()
const pieChartRef = ref<HTMLElement>()
let trendChart: echarts.ECharts | null = null
let pieChart: echarts.ECharts | null = null

const statCards = ref([
  { title: '今日新增客户', value: '—', trend: 0 },
  { title: '活跃社群', value: '—', trend: 0 },
  { title: '今日消息量', value: '—', trend: 0 },
  { title: '自动化执行', value: '—', trend: 0 },
])

function initTrendChart() {
  if (!trendChartRef.value) return
  trendChart = echarts.init(trendChartRef.value)
  updateTrendChart()
}

function updateTrendChart() {
  if (!trendChart) return
  const days = trendRange.value === '7d' ? 7 : 30
  const dates = Array.from({ length: days }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (days - 1 - i))
    return `${d.getMonth() + 1}/${d.getDate()}`
  })
  trendChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['新增客户', '消息量'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: dates, boundaryGap: false },
    yAxis: { type: 'value' },
    series: [
      {
        name: '新增客户',
        type: 'line',
        smooth: true,
        areaStyle: {},
        data: Array.from({ length: days }, () => Math.floor(Math.random() * 50 + 10)),
      },
      {
        name: '消息量',
        type: 'line',
        smooth: true,
        data: Array.from({ length: days }, () => Math.floor(Math.random() * 200 + 50)),
      },
    ],
  })
}

function initPieChart() {
  if (!pieChartRef.value) return
  pieChart = echarts.init(pieChartRef.value)
  pieChart.setOption({
    tooltip: { trigger: 'item' },
    legend: { bottom: '5%' },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
        data: [
          { value: 1048, name: '微信公众号' },
          { value: 735, name: '企业微信' },
          { value: 580, name: '小程序' },
          { value: 484, name: '其他' },
        ],
      },
    ],
  })
}

function handleResize() {
  trendChart?.resize()
  pieChart?.resize()
}

watch(trendRange, () => updateTrendChart())

onMounted(async () => {
  await nextTick()
  initTrendChart()
  initPieChart()
  window.addEventListener('resize', handleResize)
  // TODO: fetch real data from useDashboardOverview()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  trendChart?.dispose()
  pieChart?.dispose()
})
</script>

<style scoped lang="scss">
.dashboard {
  .stat-card {
    .stat-title {
      font-size: 13px;
      color: #909399;
    }
    .stat-value {
      font-size: 28px;
      font-weight: 600;
      color: #303133;
      margin: 8px 0;
    }
    .stat-trend {
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 4px;
      &.up {
        color: #67c23a;
      }
      &.down {
        color: #f56c6c;
      }
    }
  }
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .chart-container {
    height: 300px;
  }
}
</style>
