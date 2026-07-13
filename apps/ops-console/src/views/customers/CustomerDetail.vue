<template>
  <div class="page-container">
    <el-row :gutter="20">
      <el-col :span="16">
        <el-card v-loading="loading">
          <template #header> 客户详情 </template>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="头像">
              <el-avatar :size="40" :src="customer.avatar" />
            </el-descriptions-item>
            <el-descriptions-item label="昵称">
              {{ customer.name || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="渠道来源">
              {{ customer.channel || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="客户阶段">
              {{ customer.stage || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="标签">
              <el-tag v-for="t in customer.tags ?? tags" :key="t" closable>
                {{ t }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="最后互动">
              {{ customer.lastActiveAt || '—' }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
        <el-card style="margin-top: 20px">
          <template #header> 互动记录 </template>
          <el-empty v-if="!interactions.length" description="暂无互动记录" />
          <el-table v-else :data="interactions" stripe>
            <el-table-column label="时间" prop="time" width="180" />
            <el-table-column label="类型" prop="type" width="100" />
            <el-table-column label="内容" prop="content" />
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <template #header> AI 洞察 </template>
          <el-button type="primary" :loading="generating" @click="generateInsight">
            生成客户画像分析
          </el-button>
          <div
            v-if="insight"
            style="margin-top: 12px; white-space: pre-wrap; font-size: 13px; color: #606266"
          >
            {{ insight }}
          </div>
        </el-card>
        <el-card style="margin-top: 20px">
          <template #header> 客户旅程 </template>
          <el-empty description="暂无旅程数据" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { http } from '@scrm/shared'

const route = useRoute()
const customerId = route.params.id as string

const loading = ref(false)
const customer = ref<Record<string, any>>({})
const tags = ref<string[]>([])
const interactions = ref<any[]>([])
const generating = ref(false)
const insight = ref('')

async function loadCustomer() {
  if (!customerId) return
  loading.value = true
  try {
    const res = (await http.get(`/scrm/customers/${customerId}`)) as any
    customer.value = res?.data ?? res ?? {}
  } catch {
    ElMessage.error('加载客户详情失败')
  } finally {
    loading.value = false
  }
}

async function generateInsight() {
  generating.value = true
  try {
    const res = (await http.post(`/scrm/customers/${customerId}/insight`)) as any
    insight.value = res?.data?.insight ?? res?.insight ?? '生成完成'
    ElMessage.success('画像分析已生成')
  } catch {
    ElMessage.error('生成失败')
  } finally {
    generating.value = false
  }
}

onMounted(loadCustomer)
</script>
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
        <el-card style="margin-top: 20px">
          <template #header>互动记录</template>
          <el-empty description="暂无互动记录" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <template #header>AI 洞察</template>
          <el-button type="primary" @click="generateInsight">生成客户画像分析</el-button>
        </el-card>
        <el-card style="margin-top: 20px">
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
function generateInsight() {
  ElMessage.info('正在生成客户画像...')
}
</script>
