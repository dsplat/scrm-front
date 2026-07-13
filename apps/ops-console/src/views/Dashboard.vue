<template>
  <div class="dashboard">
    <el-row :gutter="20">
      <el-col v-for="card in statCards" :key="card.title" :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-title">
            {{ card.title }}
          </div>
          <div class="stat-value">
            {{ card.value }}
          </div>
          <div class="stat-trend" :class="card.trend >= 0 ? 'up' : 'down'">
            <el-icon v-if="card.trend >= 0">
              <Top />
            </el-icon>
            <el-icon v-else>
              <Bottom />
            </el-icon>
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
                <el-radio-button value="7d"> 近7天 </el-radio-button>
                <el-radio-button value="30d"> 近30天 </el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div ref="trendChartRef" class="chart-container" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never">
          <template #header> 渠道来源分布 </template>
          <div ref="pieChartRef" class="chart-container" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import { Top, Bottom } from '@element-plus/icons-vue'
import { http } from '@scrm/shared'

const trendRange = ref<'7d' | '30d'>('7d')
const trendChartRef = ref<HTMLElement>()
const pieChartRef = ref<HTMLElement>()
let trendChart: echarts.ECharts | null = null
let pieChart: echarts.ECharts | null = null

// 缓存图表数据，用于切换 range 时复用
let trendData: { dates: string[]; newCustomers: number[]; messages: number[] } | null = null

const statCards = ref([
  { title: '今日新增客户', value: '—', trend: 0 },
  { title: '活跃社群', value: '—', trend: 0 },
  { title: '今日消息量', value: '—', trend: 0 },
  { title: '自动化执行', value: '—', trend: 0 },
])

async function fetchDashboardData() {
  try {
    const res = (await http.get('/scrm/dashboards/overview')) as any
    // 兼容两种返回: res 本身是数据，或 res.data 是数据
    const data = res?.data ?? res
    if (!data) return
    statCards.value = [
      {
        title: '今日新增客户',
        value: String(data.customer?.new ?? 0),
        trend: data.customer?.trend ?? 0,
      },
      {
        title: '活跃社群',
        value: String(data.channel?.total_channels ?? 0),
        trend: data.channel?.trend ?? 0,
      },
      { title: '今日消息量', value: String(data.ai?.total_calls ?? 0), trend: data.ai?.trend ?? 0 },
      {
        title: '自动化执行',
        value: String(data.staff?.total_deals ?? 0),
        trend: data.staff?.trend ?? 0,
      },
    ]
  } catch {
    // API 失败时保持默认值
  }
}

async function fetchTrendData() {
  try {
    const res = (await http.get(`/scrm/dashboards/trend?range=${trendRange.value}`)) as any
    const data = res?.data ?? res
    if (data?.dates) {
      trendData = {
        dates: data.dates,
        newCustomers: data.new_customers ?? data.newCustomers ?? [],
        messages: data.messages ?? [],
      }
    }
  } catch {
    // 失败时使用空数据
    trendData = null
  }
}

async function fetchPieData() {
  try {
    const res = (await http.get('/scrm/dashboards/channels-distribution')) as any
    const data = res?.data ?? res
    if (Array.isArray(data) && data.length > 0) {
      return data
    }
  } catch {
    // ignore
  }
  return null
}

function initTrendChart() {
  if (!trendChartRef.value) return
  trendChart = echarts.init(trendChartRef.value)
  updateTrendChart()
}

function updateTrendChart() {
  if (!trendChart) return
  const days = trendRange.value === '7d' ? 7 : 30

  // 如果有 API 数据则使用，否则显示空图表
  const dates =
    trendData?.dates ??
    Array.from({ length: days }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (days - 1 - i))
      return `${d.getMonth() + 1}/${d.getDate()}`
    })
  const newCustomers = trendData?.newCustomers ?? Array.from({ length: days }, () => 0)
  const messages = trendData?.messages ?? Array.from({ length: days }, () => 0)

  trendChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['新增客户', '消息量'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: dates, boundaryGap: false },
    yAxis: { type: 'value' },
    series: [
      { name: '新增客户', type: 'line', smooth: true, areaStyle: {}, data: newCustomers },
      { name: '消息量', type: 'line', smooth: true, data: messages },
    ],
  })
}

function initPieChart() {
  if (!pieChartRef.value) return
  pieChart = echarts.init(pieChartRef.value)
  // 先渲染空图表，后续由 fetchPieData 更新
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
        data: [],
      },
    ],
  })
}

async function loadChartData() {
  await fetchTrendData()
  updateTrendChart()

  const pieData = await fetchPieData()
  if (pieData && pieChart) {
    pieChart.setOption({
      series: [{ data: pieData }],
    })
  }
}

function handleResize() {
  trendChart?.resize()
  pieChart?.resize()
}

watch(trendRange, async () => {
  await fetchTrendData()
  updateTrendChart()
})

onMounted(async () => {
  await nextTick()
  initTrendChart()
  initPieChart()
  window.addEventListener('resize', handleResize)
  await Promise.all([fetchDashboardData(), loadChartData()])
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
