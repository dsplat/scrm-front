<template>
  <div class="page-container">
    <el-card class="filter-card">
      <div class="filter-bar">
        <div class="filter-item">
          <span class="filter-label">时间范围</span>
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            :shortcuts="dateShortcuts"
            @change="loadFunnelData"
          />
        </div>
        <div class="filter-item">
          <span class="filter-label">活动筛选</span>
          <el-select
            v-model="selectedCampaignId"
            placeholder="全部活动"
            clearable
            style="width: 200px"
            @change="loadFunnelData"
          >
            <el-option
              v-for="item in campaignOptions"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </div>
      </div>
    </el-card>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col v-for="card in summaryCards" :key="card.title" :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-title">
            {{ card.title }}
          </div>
          <div class="stat-value">
            {{ card.value }}
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card style="margin-top: 20px">
      <template #header>
        <span>转化漏斗</span>
      </template>
      <div v-if="funnelData" class="funnel-chart-wrapper">
        <BaseChart :data="funnelChartData" :options="funnelChartOptions" height="400px" />
      </div>
      <el-empty v-else-if="!loading" description="暂无数据" />
    </el-card>

    <el-card style="margin-top: 20px">
      <template #header>
        <span>各阶段转化详情</span>
      </template>
      <el-table v-loading="loading" :data="funnelData?.stages ?? []" stripe>
        <el-table-column type="index" width="60" label="序号" />
        <el-table-column label="阶段名称" prop="name" min-width="150" />
        <el-table-column label="人数" prop="count" width="120">
          <template #default="{ row }">
            {{ row.count.toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="转化率" width="120">
          <template #default="{ row }">
            <span :class="getConversionRateClass(row.conversionRate)">
              {{ row.conversionRate.toFixed(1) }}%
            </span>
          </template>
        </el-table-column>
        <el-table-column label="流失人数" width="120">
          <template #default="{ row, $index }">
            <template v-if="$index > 0">
              {{ ((funnelData?.stages?.[$index - 1]?.count ?? 0) - row.count).toLocaleString() }}
            </template>
            <span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column label="流失率" width="120">
          <template #default="{ $index }">
            <template v-if="$index > 0">
              <span class="rate-danger"> {{ getChurnRate($index) }}% </span>
            </template>
            <span v-else>—</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { EChartsOption } from 'echarts'
import BaseChart from '@/components/common/Charts/BaseChart.vue'
import {
  getFunnelData,
  getCampaignOptions,
  type FunnelData,
  type FunnelStage,
  type CampaignOption,
} from '@/api/scrm/analytics'

defineOptions({ name: 'FunnelAnalysis' })

const loading = ref(false)
const dateRange = ref<[string, string] | null>(null)
const selectedCampaignId = ref<number | undefined>(undefined)
const campaignOptions = ref<CampaignOption[]>([])
const funnelData = ref<FunnelData | null>(null)

let funnelRequestId = 0

function createDateRange(days: number) {
  const end = new Date()
  const start = new Date()
  start.setTime(start.getTime() - days * 24 * 3600 * 1000)
  return [start, end]
}

const dateShortcuts = [
  { text: '最近7天', value: () => createDateRange(7) },
  { text: '最近30天', value: () => createDateRange(30) },
  { text: '最近90天', value: () => createDateRange(90) },
]

const summaryCards = computed(() => [
  {
    title: '总访问人数',
    value: funnelData.value?.totalVisitors?.toLocaleString() ?? '—',
  },
  {
    title: '最终转化人数',
    value: funnelData.value?.stages?.length
      ? funnelData.value.stages[funnelData.value.stages.length - 1].count.toLocaleString()
      : '—',
  },
  {
    title: '整体转化率',
    value:
      funnelData.value?.overallConversionRate != null
        ? `${funnelData.value.overallConversionRate.toFixed(1)}%`
        : '—',
  },
  {
    title: '转化阶段数',
    value: funnelData.value?.stages?.length?.toString() ?? '—',
  },
])

const funnelChartData = computed(
  () =>
    funnelData.value?.stages?.map((stage: FunnelStage) => ({
      name: stage.name,
      value: stage.count,
    })) ?? [],
)

const funnelChartOptions = computed<EChartsOption>(() => ({
  tooltip: {
    trigger: 'item',
    formatter: '{b}: {c} 人 ({d}%)',
  },
  series: [
    {
      type: 'funnel',
      left: '10%',
      top: 20,
      bottom: 20,
      width: '80%',
      min: 0,
      max: funnelData.value?.totalVisitors || 100,
      minSize: '0%',
      maxSize: '100%',
      sort: 'descending',
      gap: 2,
      label: {
        show: true,
        position: 'inside',
        formatter: '{b}\n{c} 人',
      },
      labelLine: {
        length: 10,
        lineStyle: {
          width: 1,
          type: 'solid',
        },
      },
      itemStyle: {
        borderColor: '#fff',
        borderWidth: 1,
      },
      emphasis: {
        label: {
          fontSize: 16,
        },
      },
      data: funnelChartData.value,
    },
  ],
}))

function getConversionRateClass(rate: number): string {
  if (rate >= 80) return 'rate-high'
  if (rate >= 50) return 'rate-medium'
  return 'rate-low'
}

function getChurnRate(index: number): string {
  const stages = funnelData.value?.stages
  if (!stages || index <= 0 || index >= stages.length) return '—'
  const prevRate = stages[index - 1].conversionRate
  const currentRate = stages[index].conversionRate
  if (prevRate === 0) return currentRate === 0 ? '0.0' : '100.0'
  return ((1 - currentRate / prevRate) * 100).toFixed(1)
}

async function loadFunnelData() {
  const reqId = ++funnelRequestId
  loading.value = true
  try {
    const data = await getFunnelData({
      startDate: dateRange.value?.[0],
      endDate: dateRange.value?.[1],
      campaignId: selectedCampaignId.value,
    })
    if (reqId !== funnelRequestId) return
    funnelData.value = data
  } catch {
    if (reqId !== funnelRequestId) return
    ElMessage.error('加载漏斗数据失败')
    funnelData.value = null
  } finally {
    if (reqId === funnelRequestId) {
      loading.value = false
    }
  }
}

async function loadCampaignOptions() {
  try {
    campaignOptions.value = await getCampaignOptions()
  } catch {
    campaignOptions.value = []
  }
}

onMounted(() => {
  loadCampaignOptions()
  loadFunnelData()
})
</script>

<style scoped lang="scss">
.page-container {
  .filter-card {
    .filter-bar {
      display: flex;
      align-items: center;
      gap: 24px;
    }

    .filter-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .filter-label {
      font-size: 14px;
      color: #606266;
      white-space: nowrap;
    }
  }

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
  }

  .funnel-chart-wrapper {
    min-height: 400px;
  }

  .rate-high {
    color: #67c23a;
    font-weight: 600;
  }

  .rate-medium {
    color: #e6a23c;
    font-weight: 600;
  }

  .rate-low {
    color: #f56c6c;
    font-weight: 600;
  }

  .rate-danger {
    color: #f56c6c;
  }
}
</style>
