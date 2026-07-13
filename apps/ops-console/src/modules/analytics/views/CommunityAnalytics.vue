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
            @change="loadAll"
          />
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

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>社群活跃度排行</span>
          </template>
          <BarChart :data="rankChartData" :options="rankChartOptions" height="400px" horizontal />
          <el-empty v-if="!rankLoading && rankData.length === 0" description="暂无数据" />
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>活跃度变化趋势</span>
          </template>
          <LineChart :data="trendChartData" :options="trendChartOptions" height="400px" area />
          <el-empty v-if="!trendLoading && trendData.length === 0" description="暂无数据" />
        </el-card>
      </el-col>
    </el-row>

    <el-card style="margin-top: 20px">
      <template #header>
        <div class="table-header">
          <span>社群列表</span>
          <el-input
            v-model="keyword"
            placeholder="搜索社群名称"
            clearable
            style="width: 240px"
            @clear="loadCommunityList"
            @keyup.enter="loadCommunityList"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
      </template>
      <el-table v-loading="listLoading" :data="communityList" stripe>
        <el-table-column type="index" width="60" label="序号" />
        <el-table-column label="社群名称" prop="name" min-width="180" />
        <el-table-column label="成员人数" prop="memberCount" width="120">
          <template #default="{ row }">
            {{ row.memberCount.toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="活跃度评分" prop="activityScore" width="140">
          <template #default="{ row }">
            <span :class="getScoreClass(row.activityScore)">
              {{ row.activityScore.toFixed(1) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="负责人" prop="owner" width="120" />
        <el-table-column label="创建时间" prop="createdAt" width="180" />
      </el-table>
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="loadCommunityList"
          @current-change="loadCommunityList"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import type { EChartsOption } from 'echarts'
import { BarChart, LineChart } from '@/components/common/Charts'
import {
  getCommunityRank,
  getCommunityTrend,
  getCommunityList,
  type CommunityRankItem,
  type CommunityTrendItem,
  type CommunityInfo,
} from '@/modules/analytics/api/analytics'

defineOptions({ name: 'CommunityAnalytics' })

const rankLoading = ref(false)
const trendLoading = ref(false)
const listLoading = ref(false)
const dateRange = ref<[string, string] | null>(null)
const rankData = ref<CommunityRankItem[]>([])
const trendData = ref<CommunityTrendItem[]>([])
const communityList = ref<CommunityInfo[]>([])
const keyword = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

let rankRequestId = 0
let trendRequestId = 0

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
    title: '社群总数',
    value: total.value ? total.value.toLocaleString() : '—',
  },
  {
    title: '平均活跃度',
    value:
      rankData.value.length > 0
        ? (
            rankData.value.reduce((sum, item) => sum + item.activityScore, 0) /
            rankData.value.length
          ).toFixed(1)
        : '—',
  },
  {
    title: '总成员数',
    value:
      rankData.value.length > 0
        ? rankData.value.reduce((sum, item) => sum + item.memberCount, 0).toLocaleString()
        : '—',
  },
  {
    title: '最高活跃度',
    value:
      rankData.value.length > 0
        ? Math.max(...rankData.value.map((item) => item.activityScore)).toFixed(1)
        : '—',
  },
])

const rankChartData = computed(() =>
  [...rankData.value]
    .sort((a, b) => a.activityScore - b.activityScore)
    .map((item) => ({
      name: item.name,
      value: item.activityScore,
    })),
)

const rankChartOptions = computed<EChartsOption>(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    formatter: '{b}: {c} 分',
  },
  grid: { left: '3%', right: '8%', bottom: '3%', containLabel: true },
}))

const trendChartData = computed(() =>
  trendData.value.map((item) => ({
    name: item.date,
    value: item.score,
  })),
)

const trendChartOptions = computed<EChartsOption>(() => ({
  tooltip: {
    trigger: 'axis',
    formatter: '{b}: {c} 分',
  },
  grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
}))

function getScoreClass(score: number): string {
  if (score >= 80) return 'score-high'
  if (score >= 50) return 'score-medium'
  return 'score-low'
}

async function loadRankData() {
  const reqId = ++rankRequestId
  rankLoading.value = true
  try {
    const data = await getCommunityRank({
      startDate: dateRange.value?.[0],
      endDate: dateRange.value?.[1],
    })
    if (reqId !== rankRequestId) return
    rankData.value = data
  } catch {
    if (reqId !== rankRequestId) return
    ElMessage.error('加载社群排行数据失败')
    rankData.value = []
  } finally {
    if (reqId === rankRequestId) {
      rankLoading.value = false
    }
  }
}

async function loadTrendData() {
  const reqId = ++trendRequestId
  trendLoading.value = true
  try {
    const data = await getCommunityTrend({
      startDate: dateRange.value?.[0],
      endDate: dateRange.value?.[1],
    })
    if (reqId !== trendRequestId) return
    trendData.value = data
  } catch {
    if (reqId !== trendRequestId) return
    ElMessage.error('加载活跃度趋势数据失败')
    trendData.value = []
  } finally {
    if (reqId === trendRequestId) {
      trendLoading.value = false
    }
  }
}

async function loadCommunityList() {
  listLoading.value = true
  try {
    const result = await getCommunityList({
      page: currentPage.value,
      pageSize: pageSize.value,
      keyword: keyword.value || undefined,
    })
    communityList.value = result.data
    total.value = result.total
  } catch {
    ElMessage.error('加载社群列表失败')
    communityList.value = []
    total.value = 0
  } finally {
    listLoading.value = false
  }
}

function loadAll() {
  currentPage.value = 1
  loadRankData()
  loadTrendData()
  loadCommunityList()
}

onMounted(() => {
  loadAll()
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

  .table-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .pagination-wrapper {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }

  .score-high {
    color: #67c23a;
    font-weight: 600;
  }

  .score-medium {
    color: #e6a23c;
    font-weight: 600;
  }

  .score-low {
    color: #f56c6c;
    font-weight: 600;
  }
}
</style>
