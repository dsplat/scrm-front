<template>
  <div class="page-container">
    <el-page-header @back="$router.push('/channels')">
      <template #content>
        <span class="page-title">{{ isNew ? '新建渠道' : '渠道配置' }}</span>
      </template>
    </el-page-header>

    <el-card v-loading="loading" class="mt-20">
      <el-form :model="form" label-width="160px">
        <el-form-item label="渠道类型" required>
          <el-select v-model="form.type" placeholder="选择渠道类型" :disabled="!isNew">
            <el-option label="企业微信" value="wechat_work" />
            <el-option label="微信公众号" value="wechat_official" />
            <el-option label="Telegram" value="telegram" />
          </el-select>
        </el-form-item>
        <el-form-item label="渠道名称" required>
          <el-input v-model="form.name" placeholder="请输入渠道名称" />
        </el-form-item>
        <el-form-item label="AppID / CorpID">
          <el-input v-model="form.app_id" placeholder="请输入 AppID 或 CorpID" />
        </el-form-item>
        <el-form-item label="AppSecret / Secret">
          <el-input v-model="form.app_secret" type="password" show-password placeholder="请输入 Secret" />
        </el-form-item>
        <el-form-item v-if="form.type === 'wechat_work'" label="AgentID">
          <el-input v-model="form.agent_id" placeholder="请输入 AgentID" />
        </el-form-item>

        <template v-if="!isNew">
          <el-divider content-position="left">回调配置（填入微信/企业微信后台）</el-divider>
          <el-form-item label="回调 URL">
            <el-input :model-value="callbackUrl" readonly>
              <template #append>
                <el-button @click="copyUrl">复制</el-button>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item label="Token">
            <el-input v-model="form.callback_token" placeholder="自定义 Token" />
          </el-form-item>
          <el-form-item label="EncodingAESKey">
            <el-input v-model="form.encoding_aes_key" placeholder="自定义或自动生成" />
          </el-form-item>

          <el-divider v-if="connectionInfo" content-position="left">连接状态</el-divider>
          <el-form-item v-if="connectionInfo" label="状态">
            <el-tag :type="connectionInfo.connected ? 'success' : 'warning'">
              {{ connectionInfo.connected ? '已连接' : '未连接' }}
            </el-tag>
          </el-form-item>
        </template>

        <el-form-item>
          <el-button type="primary" :loading="saving" @click="handleSave">保存配置</el-button>
          <el-button v-if="!isNew" type="success" :loading="testing" @click="handleTest">测试连接</el-button>
          <el-button @click="$router.back()">返回</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { http } from '@scrm/shared'

const route = useRoute()
const channelId = route.params.id as string
const isNew = !channelId || channelId === 'new'

const loading = ref(false)
const saving = ref(false)
const testing = ref(false)
const connectionInfo = ref<any>(null)

const form = ref({
  type: 'wechat_work',
  name: '',
  app_id: '',
  app_secret: '',
  agent_id: '',
  callback_token: '',
  encoding_aes_key: '',
  status: 'disconnected',
})

const callbackUrl = computed(() => {
  const base = window.location.origin + '/api/v1/channels'
  if (form.value.type === 'wechat_work') {
    return `${base}/wechat-work/callback`
  }
  if (form.value.type === 'wechat_official') {
    return `${base}/wechat/callback`
  }
  return `${base}/telegram/callback`
})

function copyUrl() {
  navigator.clipboard.writeText(callbackUrl.value)
  ElMessage.success('已复制')
}

async function loadChannel() {
  if (isNew) return
  loading.value = true
  try {
    const res = await http.get(`/scrm/channels/${channelId}`) as any
    const data = res?.data ?? res
    if (data) {
      form.value = {
        type: data.type || 'wechat_work',
        name: data.name || '',
        app_id: data.app_id || '',
        app_secret: data.app_secret || '',
        agent_id: data.agent_id || '',
        callback_token: data.callback_token || '',
        encoding_aes_key: data.encoding_aes_key || '',
        status: data.status || 'disconnected',
      }
      connectionInfo.value = { connected: data.status === 'connected' }
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '加载渠道配置失败')
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  if (!form.value.name) {
    ElMessage.warning('请输入渠道名称')
    return
  }
  saving.value = true
  try {
    const payload: Record<string, any> = { ...form.value }
    // 新建时不需要传 status
    if (isNew) {
      delete payload.status
    }
    if (isNew) {
      await http.post('/scrm/channels', payload)
    } else {
      await http.put(`/scrm/channels/${channelId}`, payload)
    }
    ElMessage.success('配置已保存')
    if (isNew) {
      // 保存后跳转到编辑页
      const res = await http.get('/scrm/channels', { params: { per_page: 1 } }) as any
      const data = res?.data ?? res
      const latest = data?.data?.[0] ?? data?.[0]
      if (latest) {
        window.location.href = `/scrm-console/channels/${latest.channel_id}`
      }
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function handleTest() {
  testing.value = true
  try {
    const res = await http.post(`/scrm/channels/${channelId}/test`) as any
    const data = res?.data ?? res
    if (data?.connected) {
      ElMessage.success(data.message || '连接成功')
      connectionInfo.value = { connected: true }
    } else {
      ElMessage.error(data?.message || '连接失败')
      connectionInfo.value = { connected: false }
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '连接测试失败')
  } finally {
    testing.value = false
  }
}

onMounted(loadChannel)
</script>

<style scoped lang="scss">
.page-container {
  padding: 20px;
}
.page-title {
  font-size: 18px;
  font-weight: 500;
}
.mt-20 {
  margin-top: 20px;
}
</style>
