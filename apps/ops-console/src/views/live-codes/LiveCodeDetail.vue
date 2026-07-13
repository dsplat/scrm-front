<template>
  <div class="page-container">
    <el-card v-loading="loading">
      <template #header> 活码详情 </template>
      <el-row :gutter="20">
        <el-col :span="8">
          <el-card>
            <template #header> 二维码预览 </template>
            <div style="text-align: center; padding: 20px">
              <div v-if="liveCode.qrcode_url" style="margin-bottom: 12px">
                <img :src="liveCode.qrcode_url" alt="二维码" style="max-width: 200px" />
              </div>
              <el-empty v-else description="暂无二维码" />
              <div style="margin-top: 12px; font-size: 14px; color: #606266">
                <p>名称：{{ liveCode.name || '—' }}</p>
                <p>渠道：{{ liveCode.channel || '—' }}</p>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="16">
          <el-card>
            <template #header> 扫码统计 </template>
            <el-descriptions :column="3" border>
              <el-descriptions-item label="总扫码次数">
                {{ liveCode.scan_count ?? 0 }}
              </el-descriptions-item>
              <el-descriptions-item label="今日扫码">
                {{ liveCode.today_scan ?? 0 }}
              </el-descriptions-item>
              <el-descriptions-item label="创建时间">
                {{ liveCode.createdAt || '—' }}
              </el-descriptions-item>
            </el-descriptions>
          </el-card>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { http } from '@scrm/shared'

const route = useRoute()
const liveCodeId = route.params.id as string

const loading = ref(false)
const liveCode = ref<Record<string, any>>({})

async function loadLiveCode() {
  if (!liveCodeId) return
  loading.value = true
  try {
    const res = (await http.get(`/scrm/live-codes/${liveCodeId}`)) as any
    liveCode.value = res?.data ?? res ?? {}
  } catch {
    ElMessage.error('加载活码详情失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadLiveCode)
</script>
<template>
  <div class="page-container">
    <el-card
      ><template #header>活码详情</template>
      <el-row :gutter="20"
        ><el-col :span="8"
          ><el-card><el-empty description="二维码预览" /></el-card
        ></el-col>
        <el-col :span="16"
          ><el-card
            ><template #header>扫码统计</template
            ><el-empty description="暂无数据" /></el-card></el-col
      ></el-row>
    </el-card>
  </div>
</template>
<script setup lang="ts"></script>
