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
            @change="loadData"
          />
        </div>
        <div class="filter-item">
          <span class="filter-label">风险等级</span>
          <el-select
            v-model="selectedRiskLevel"
            placeholder="全部等级"
            clearable
            style="width: 150px"
            @change="loadChurnCustomers"
          >
            <el-option label="高风险" value="high" />
            <el-option label="中风险" value="medium" />
            <el-option label="低风险" value="low" />
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
          <div class="stat-value" :class="card.class">
            {{ card.value }}
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card style="margin-top: 20px">
      <template #header>
        <span>流失趋势</span>
      </template>
      <div v-loading="trendLoading" class="chart-wrapper">
        <LineChart
          v-if="trendData.length > 0"
          :data="trendData"
          :options="trendChartOptions"
          height="400px"
          :area="true"
        />
        <el-empty v-else-if="!trendLoading" description="暂无趋势数据" />
      </div>
    </el-card>

    <el-card style="margin-top: 20px">
      <template #header>
        <div class="card-header">
          <span>高风险客户列表</span>
          <el-tag type="danger" size="small"> 共 {{ customerTotal }} 位客户 </el-tag>
        </div>
      </template>
      <el-table
        v-loading="customerLoading"
        :data="churnCustomers"
        stripe
        highlight-current-row
        @row-click="handleCustomerClick"
      >
        <el-table-column type="index" width="60" label="序号" />
        <el-table-column label="客户名称" prop="customerName" min-width="120">
          <template #default="{ row }">
            <div class="customer-info">
              <el-avatar :size="32" :src="row.avatar">
                {{ row.customerName?.charAt(0) }}
              </el-avatar>
              <span class="customer-name">{{ row.customerName }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="手机号码" prop="phone" width="130">
          <template #default="{ row }">
            {{ maskPhone(row.phone) }}
          </template>
        </el-table-column>
        <el-table-column label="风险等级" prop="riskLevel" width="100">
          <template #default="{ row }">
            <el-tag :type="getRiskTagType(row.riskLevel)" size="small">
              {{ getRiskLabel(row.riskLevel) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="流失概率" prop="churnProbability" width="100">
          <template #default="{ row }">
            <span :class="getProbabilityClass(row.churnProbability)">
              {{ (row.churnProbability * 100).toFixed(1) }}%
            </span>
          </template>
        </el-table-column>
        <el-table-column label="最近活跃" prop="lastActiveAt" width="120" />
        <el-table-column label="累计消费" prop="totalSpent" width="120">
          <template #default="{ row }"> ¥{{ row.totalSpent?.toLocaleString() }} </template>
        </el-table-column>
        <el-table-column
          label="流失原因"
          prop="churnReason"
          min-width="150"
          show-overflow-tooltip
        />
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click.stop="handleViewDetail(row)">
              查看详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div v-if="customerTotal > 0" class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="customerTotal"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadChurnCustomers"
          @current-change="loadChurnCustomers"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { EChartsOption } from 'echarts'
import LineChart from '@/components/common/Charts/LineChart.vue'
import {
  getChurnAlertSummary,
  getChurnTrend,
  getChurnCustomerList,
  type ChurnAlertSummary,
  type ChurnCustomer,
  type ChurnCustomerListParams,
} from '@/api/scrm/analytics'

defineOptions({ name: 'ChurnAlert' })

const router = useRouter()

const loading = ref(false)
const trendLoading = ref(false)
const customerLoading = ref(false)
const dateRange = ref<[string, string] | null>(null)
const selectedRiskLevel = ref<string>('')
const currentPage = ref(1)
const pageSize = ref(10)
const customerTotal = ref(0)

const summaryData = ref<ChurnAlertSummary | null>(null)
const trendData = ref<{ name: string; value: number }[]>([])
const churnCustomers = ref<ChurnCustomer[]>([])

let requestId = 0

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
    title: '高风险客户数',
    value: summaryData.value?.highRiskCount?.toLocaleString() ?? '—',
    class: 'text-danger',
  },
  {
    title: '流失率',
    value:
      summaryData.value?.churnRate != null ? `${summaryData.value.churnRate.toFixed(1)}%` : '—',
    class: 'text-warning',
  },
  {
    title: '预警客户数',
    value: summaryData.value?.alertCount?.toLocaleString() ?? '—',
    class: 'text-info',
  },
  {
    title: '挽回成功率',
    value:
      summaryData.value?.recoveryRate != null
        ? `${summaryData.value.recoveryRate.toFixed(1)}%`
        : '—',
    class: 'text-success',
  },
])

const trendChartOptions = computed<EChartsOption>(() => ({
  tooltip: {
    trigger: 'axis',
    formatter: (params: unknown) => {
      const items = params as { name: string; value: number }[]
      if (!Array.isArray(items) || items.length === 0) return ''
      return `${items[0].name}<br/>流失客户数: ${items[0].value}`
    },
  },
  grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
  xAxis: {
    type: 'category',
    boundaryGap: false,
  },
  yAxis: {
    type: 'value',
    name: '流失客户数',
  },
}))

function maskPhone(phone?: string): string {
  if (!phone) return '—'
  if (phone.length < 7) return phone
  return phone.slice(0, 3) + '****' + phone.slice(-4)
}

function getRiskTagType(level: string): 'danger' | 'warning' | 'info' {
  if (level === 'high') return 'danger'
  if (level === 'medium') return 'warning'
  return 'info'
}

function getRiskLabel(level: string): string {
  if (level === 'high') return '高风险'
  if (level === 'medium') return '中风险'
  return '低风险'
}

function getProbabilityClass(probability: number): string {
  if (probability >= 0.7) return 'text-danger'
  if (probability >= 0.4) return 'text-warning'
  return 'text-info'
}

async function loadSummary() {
  const reqId = ++requestId
  loading.value = true
  try {
    const data = await getChurnAlertSummary({
      startDate: dateRange.value?.[0],
      endDate: dateRange.value?.[1],
    })
    if (reqId !== requestId) return
    summaryData.value = data
  } catch {
    if (reqId !== requestId) return
    ElMessage.error('加载概览数据失败')
    summaryData.value = null
  } finally {
    if (reqId === requestId) {
      loading.value = false
    }
  }
}

async function loadTrend() {
  const reqId = ++requestId
  trendLoading.value = true
  try {
    const data = await getChurnTrend({
      startDate: dateRange.value?.[0],
      endDate: dateRange.value?.[1],
    })
    if (reqId !== requestId) return
    trendData.value = data.map((item) => ({
      name: item.date,
      value: item.count,
    }))
  } catch {
    if (reqId !== requestId) return
    ElMessage.error('加载趋势数据失败')
    trendData.value = []
  } finally {
    if (reqId === requestId) {
      trendLoading.value = false
    }
  }
}

async function loadChurnCustomers() {
  const reqId = ++requestId
  customerLoading.value = true
  try {
    const params: ChurnCustomerListParams = {
      page: currentPage.value,
      pageSize: pageSize.value,
      startDate: dateRange.value?.[0],
      endDate: dateRange.value?.[1],
      riskLevel: selectedRiskLevel.value || undefined,
    }
    const result = await getChurnCustomerList(params)
    if (reqId !== requestId) return
    churnCustomers.value = result.data
    customerTotal.value = result.total
  } catch {
    if (reqId !== requestId) return
    ElMessage.error('加载客户列表失败')
    churnCustomers.value = []
    customerTotal.value = 0
  } finally {
    if (reqId === requestId) {
      customerLoading.value = false
    }
  }
}

function loadData() {
  loadSummary()
  loadTrend()
  loadChurnCustomers()
}

function handleCustomerClick(row: ChurnCustomer) {
  router.push({
    name: 'CustomerProfile',
    params: { id: row.customerId },
  })
}

function handleViewDetail(row: ChurnCustomer) {
  router.push({
    name: 'CustomerProfile',
    params: { id: row.customerId },
  })
}

onMounted(() => {
  loadData()
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

  .chart-wrapper {
    min-height: 400px;
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .customer-info {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .customer-name {
    font-weight: 500;
  }

  .pagination-wrapper {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }

  .text-danger {
    color: #f56c6c;
    font-weight: 600;
  }

  .text-warning {
    color: #e6a23c;
    font-weight: 600;
  }

  .text-info {
    color: #409eff;
    font-weight: 600;
  }

  .text-success {
    color: #67c23a;
    font-weight: 600;
  }
}
</style>
