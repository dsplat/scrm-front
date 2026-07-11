<template>
  <div class="page-container">
    <el-card class="filter-card">
      <div class="filter-bar">
        <div class="filter-item">
          <span class="filter-label">选择客户</span>
          <el-select
            v-model="selectedCustomerId"
            filterable
            remote
            :remote-method="searchCustomers"
            :loading="customerSearchLoading"
            placeholder="请输入客户名称搜索"
            style="width: 280px"
            @change="handleCustomerChange"
          >
            <el-option
              v-for="item in customerOptions"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </div>
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
            @change="handleDateRangeChange"
          />
        </div>
      </div>
    </el-card>

    <template v-if="selectedCustomerId">
      <el-row :gutter="20" style="margin-top: 20px">
        <el-col :span="16">
          <el-card>
            <template #header>
              <div class="card-header">
                <span>客户基本信息</span>
                <el-tag :type="profileData?.level === 'VIP' ? 'warning' : 'info'" size="small">
                  {{ profileData?.level || '普通客户' }}
                </el-tag>
              </div>
            </template>
            <div v-loading="profileLoading" class="profile-info">
              <div class="profile-avatar">
                <el-avatar :size="80" :src="profileData?.avatar">
                  {{ profileData?.name?.charAt(0) }}
                </el-avatar>
              </div>
              <div class="profile-details">
                <el-descriptions :column="2" border>
                  <el-descriptions-item label="客户名称">
                    {{ profileData?.name || '—' }}
                  </el-descriptions-item>
                  <el-descriptions-item label="客户等级">
                    {{ profileData?.level || '—' }}
                  </el-descriptions-item>
                  <el-descriptions-item label="手机号码">
                    {{ profileData?.phone || '—' }}
                  </el-descriptions-item>
                  <el-descriptions-item label="渠道来源">
                    {{ profileData?.channel || '—' }}
                  </el-descriptions-item>
                  <el-descriptions-item label="注册时间">
                    {{ profileData?.createdAt || '—' }}
                  </el-descriptions-item>
                  <el-descriptions-item label="最近活跃">
                    {{ profileData?.lastActiveAt || '—' }}
                  </el-descriptions-item>
                </el-descriptions>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card>
            <template #header> 客户统计 </template>
            <div v-loading="profileLoading" class="stats-grid">
              <div class="stat-item">
                <div class="stat-value">
                  {{ profileData?.stats?.totalSpent?.toLocaleString() || '0' }}
                </div>
                <div class="stat-label">累计消费(元)</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">
                  {{ profileData?.stats?.orderCount || '0' }}
                </div>
                <div class="stat-label">订单数</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">
                  {{ profileData?.stats?.avgOrderAmount?.toLocaleString() || '0' }}
                </div>
                <div class="stat-label">客单价(元)</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">
                  {{ profileData?.stats?.visitCount || '0' }}
                </div>
                <div class="stat-label">访问次数</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="20" style="margin-top: 20px">
        <el-col :span="12">
          <el-card>
            <template #header> 消费趋势 </template>
            <LineChart
              :data="consumptionTrendData"
              :options="consumptionTrendOptions"
              height="300px"
              :smooth="true"
              :area="true"
            />
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card>
            <template #header> 标签分布 </template>
            <PieChart
              :data="tagDistributionData"
              :options="tagDistributionOptions"
              height="300px"
            />
          </el-card>
        </el-col>
      </el-row>

      <el-card style="margin-top: 20px">
        <template #header>
          <div class="card-header">
            <span>互动记录</span>
            <el-select
              v-model="interactionTypeFilter"
              placeholder="全部类型"
              clearable
              style="width: 120px"
              @change="loadInteractionList"
            >
              <el-option label="消息" value="message" />
              <el-option label="订单" value="order" />
              <el-option label="访问" value="visit" />
              <el-option label="优惠券" value="coupon" />
              <el-option label="活动" value="event" />
            </el-select>
          </div>
        </template>
        <el-table v-loading="interactionLoading" :data="interactionList" stripe>
          <el-table-column type="index" width="50" />
          <el-table-column label="类型" width="100">
            <template #default="{ row }">
              <el-tag :type="getInteractionTagType(row.type)" size="small">
                {{ getInteractionTypeName(row.type) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="标题" prop="title" min-width="150" />
          <el-table-column label="内容" prop="content" min-width="200" show-overflow-tooltip />
          <el-table-column label="渠道" prop="channel" width="120" />
          <el-table-column label="时间" prop="createdAt" width="180" />
        </el-table>
        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="interactionPagination.page"
            v-model:page-size="interactionPagination.pageSize"
            :total="interactionPagination.total"
            layout="total, prev, pager, next"
            @current-change="loadInteractionList"
          />
        </div>
      </el-card>

      <el-card style="margin-top: 20px">
        <template #header> 客户标签 </template>
        <div v-loading="profileLoading" class="tags-container">
          <template v-if="profileData?.tags?.length">
            <el-tag
              v-for="tag in profileData.tags"
              :key="tag.id"
              :color="tag.color"
              style="color: #fff; margin-right: 8px; margin-bottom: 8px"
            >
              {{ tag.name }}
            </el-tag>
          </template>
          <el-empty v-else description="暂无标签" :image-size="60" />
        </div>
      </el-card>
    </template>

    <el-card v-else style="margin-top: 20px">
      <el-empty description="请先选择客户以查看画像" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { EChartsOption } from 'echarts'
import LineChart from '@/components/common/Charts/LineChart.vue'
import PieChart from '@/components/common/Charts/PieChart.vue'
import { listCustomers } from '@/api/customers'
import {
  getCustomerProfile,
  getConsumptionTrend,
  getTagDistribution,
  getInteractionList,
  type CustomerProfileData,
  type ConsumptionTrendItem,
  type TagDistributionItem,
  type InteractionRecord,
} from '@/api/scrm/analytics'

defineOptions({ name: 'CustomerProfile' })

const selectedCustomerId = ref<number | null>(null)
const customerOptions = ref<{ id: number; name: string }[]>([])
const customerSearchLoading = ref(false)
const profileLoading = ref(false)
const interactionLoading = ref(false)
const dateRange = ref<[string, string] | null>(null)
const interactionTypeFilter = ref('')

const profileData = ref<CustomerProfileData | null>(null)
const consumptionTrend = ref<ConsumptionTrendItem[]>([])
const tagDistribution = ref<TagDistributionItem[]>([])
const interactionList = ref<InteractionRecord[]>([])
const interactionPagination = ref({ page: 1, pageSize: 10, total: 0 })

const dateShortcuts = [
  {
    text: '最近7天',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 7 * 24 * 3600 * 1000)
      return [start, end]
    },
  },
  {
    text: '最近30天',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 30 * 24 * 3600 * 1000)
      return [start, end]
    },
  },
  {
    text: '最近90天',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 90 * 24 * 3600 * 1000)
      return [start, end]
    },
  },
]

const consumptionTrendData = computed(() => {
  return consumptionTrend.value.map((item) => ({
    name: item.date,
    value: item.amount,
  }))
})

const consumptionTrendOptions = computed<EChartsOption>(() => ({
  tooltip: {
    trigger: 'axis',
    formatter: (params: any) => {
      const data = params[0]
      return `${data.name}<br/>消费金额: ¥${data.value.toLocaleString()}`
    },
  },
  yAxis: {
    axisLabel: {
      formatter: (value: number) => `¥${value.toLocaleString()}`,
    },
  },
}))

const tagDistributionData = computed(() => {
  return tagDistribution.value.map((item) => ({
    name: item.name,
    value: item.value,
  }))
})

const tagDistributionOptions = computed<EChartsOption>(() => ({
  tooltip: {
    trigger: 'item',
    formatter: '{b}: {c} ({d}%)',
  },
  series: [
    {
      itemStyle: {
        borderRadius: 6,
        borderColor: '#fff',
        borderWidth: 2,
      },
      label: {
        show: true,
        formatter: '{b}\n{d}%',
      },
    },
  ],
}))

function getInteractionTagType(type: string) {
  const map: Record<string, string> = {
    message: '',
    order: 'success',
    visit: 'info',
    coupon: 'warning',
    event: 'danger',
  }
  return map[type] || 'info'
}

function getInteractionTypeName(type: string) {
  const map: Record<string, string> = {
    message: '消息',
    order: '订单',
    visit: '访问',
    coupon: '优惠券',
    event: '活动',
  }
  return map[type] || type
}

async function searchCustomers(query: string) {
  if (!query) {
    customerOptions.value = []
    return
  }
  customerSearchLoading.value = true
  try {
    const res = await listCustomers({ name: query, per_page: 20 })
    const data = (res as any)?.data ?? res ?? []
    customerOptions.value = data.map((item: any) => ({
      id: item.id,
      name: item.name,
    }))
  } catch {
    customerOptions.value = []
  } finally {
    customerSearchLoading.value = false
  }
}

async function loadProfileData() {
  if (!selectedCustomerId.value) return
  profileLoading.value = true
  try {
    const [profile, trend, tags] = await Promise.all([
      getCustomerProfile(selectedCustomerId.value),
      getConsumptionTrend(selectedCustomerId.value, {
        startDate: dateRange.value?.[0],
        endDate: dateRange.value?.[1],
      }),
      getTagDistribution(selectedCustomerId.value),
    ])
    profileData.value = profile
    consumptionTrend.value = trend
    tagDistribution.value = tags
  } catch {
    ElMessage.error('加载客户画像数据失败')
  } finally {
    profileLoading.value = false
  }
}

async function loadInteractionList() {
  if (!selectedCustomerId.value) return
  interactionLoading.value = true
  try {
    const res = await getInteractionList(selectedCustomerId.value, {
      page: interactionPagination.value.page,
      pageSize: interactionPagination.value.pageSize,
      startDate: dateRange.value?.[0],
      endDate: dateRange.value?.[1],
      type: interactionTypeFilter.value || undefined,
    })
    interactionList.value = res.data
    interactionPagination.value.total = res.total
  } catch {
    ElMessage.error('加载互动记录失败')
  } finally {
    interactionLoading.value = false
  }
}

function handleCustomerChange() {
  if (selectedCustomerId.value) {
    interactionPagination.value.page = 1
    loadAllData()
  }
}

function handleDateRangeChange() {
  if (selectedCustomerId.value) {
    loadAllData()
  }
}

function loadAllData() {
  loadProfileData()
  loadInteractionList()
}

onMounted(async () => {
  const res = await listCustomers({ per_page: 100 })
  const data = (res as any)?.data ?? res ?? []
  customerOptions.value = data.map((item: any) => ({
    id: item.id,
    name: item.name,
  }))
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

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .profile-info {
    display: flex;
    gap: 24px;
  }

  .profile-avatar {
    flex-shrink: 0;
  }

  .profile-details {
    flex: 1;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .stat-item {
    text-align: center;
    padding: 12px;
    background: #f5f7fa;
    border-radius: 4px;

    .stat-value {
      font-size: 24px;
      font-weight: 600;
      color: #303133;
    }

    .stat-label {
      font-size: 12px;
      color: #909399;
      margin-top: 4px;
    }
  }

  .tags-container {
    min-height: 60px;
  }

  .pagination-wrapper {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
  }
}
</style>
