<template>
  <div class="page-container">
    <el-card v-loading="loading">
      <template #header> 社群详情 </template>
      <el-tabs>
        <el-tab-pane label="基础信息">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="社群名称">
              {{ community.name || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="community.status === 'active' ? 'success' : 'info'">
                {{ community.status === 'active' ? '启用' : '停用' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="成员数">
              {{ community.member_count ?? '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="渠道">
              {{ community.channel || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="创建时间">
              {{ community.createdAt || '—' }}
            </el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>
        <el-tab-pane label="成员列表">
          <el-table :data="members" stripe>
            <el-table-column label="昵称" prop="name" />
            <el-table-column label="加入时间" prop="joined_at" width="180" />
            <el-table-column label="状态" prop="status" width="100" />
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="SOP 配置">
          <el-empty v-if="!sopConfigs.length" description="暂无 SOP 配置" />
          <el-table v-else :data="sopConfigs" stripe>
            <el-table-column label="名称" prop="name" />
            <el-table-column label="触发条件" prop="trigger" width="150" />
            <el-table-column label="状态" prop="status" width="100" />
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="群发管理">
          <el-empty v-if="!massPushes.length" description="暂无群发任务" />
          <el-table v-else :data="massPushes" stripe>
            <el-table-column label="标题" prop="title" />
            <el-table-column label="状态" prop="status" width="100" />
            <el-table-column label="发送时间" prop="scheduled_at" width="180" />
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { http } from '@scrm/shared'

const route = useRoute()
const communityId = route.params.id as string

const loading = ref(false)
const community = ref<Record<string, any>>({})
const members = ref<any[]>([])
const sopConfigs = ref<any[]>([])
const massPushes = ref<any[]>([])

async function loadCommunity() {
  if (!communityId) return
  loading.value = true
  try {
    const res = (await http.get(`/scrm/communities/${communityId}`)) as any
    const data = res?.data ?? res ?? {}
    community.value = data
    members.value = data.members ?? []
    sopConfigs.value = data.sop_configs ?? []
    massPushes.value = data.mass_pushes ?? []
  } catch {
    ElMessage.error('加载社群详情失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadCommunity)
</script>
