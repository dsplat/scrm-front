<template>
  <div class="page-container">
    <el-card>
      <template #header> 渠道配置 </template>
      <el-form :model="form" label-width="160px">
        <el-form-item label="渠道类型">
          <el-select v-model="form.type" placeholder="选择渠道类型">
            <el-option label="微信公众号" value="wechat_official" />
            <el-option label="微信小程序" value="wechat_mini_program" />
            <el-option label="企业微信" value="enterprise_wechat" />
          </el-select>
        </el-form-item>
        <el-form-item label="AppID / CorpID">
          <el-input v-model="form.appId" placeholder="请输入 AppID 或 CorpID" />
        </el-form-item>
        <el-form-item label="AppSecret / Secret">
          <el-input
            v-model="form.appSecret"
            type="password"
            show-password
            placeholder="请输入 Secret"
          />
        </el-form-item>
        <el-form-item v-if="form.type === 'enterprise_wechat'" label="AgentID">
          <el-input v-model="form.agentId" placeholder="请输入 AgentID" />
        </el-form-item>
        <el-divider content-position="left"> 服务器配置（填入微信/企业微信后台） </el-divider>
        <el-form-item label="回调 URL">
          <el-input :model-value="callbackUrl" readonly>
            <template #append>
              <el-button @click="copyUrl"> 复制 </el-button>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="Token">
          <el-input v-model="form.callbackToken" placeholder="自定义 Token" />
        </el-form-item>
        <el-form-item label="EncodingAESKey">
          <el-input v-model="form.encodingAesKey" placeholder="自定义或自动生成" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving" @click="handleSave"> 保存配置 </el-button>
          <el-button :loading="testing" @click="handleTest"> 测试连接 </el-button>
          <el-button @click="$router.back()"> 返回 </el-button>
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

const form = ref({
  type: 'wechat_official',
  appId: '',
  appSecret: '',
  agentId: '',
  callbackToken: '',
  encodingAesKey: '',
})
const saving = ref(false)
const testing = ref(false)

const callbackUrl = computed(() => {
  const base = window.location.origin + '/api/v1/channels'
  return form.value.type === 'enterprise_wechat'
    ? `${base}/wechat-work/callback`
    : `${base}/wechat/callback`
})

function copyUrl() {
  navigator.clipboard.writeText(callbackUrl.value)
  ElMessage.success('已复制')
}

async function loadChannel() {
  if (!channelId || channelId === 'new') return
  try {
    const res = (await http.get(`/scrm/channels/${channelId}`)) as any
    const data = res?.data ?? res
    if (data) {
      form.value = { ...form.value, ...data }
    }
  } catch {
    ElMessage.error('加载渠道配置失败')
  }
}

async function handleSave() {
  saving.value = true
  try {
    if (channelId && channelId !== 'new') {
      await http.put(`/scrm/channels/${channelId}`, form.value)
    } else {
      await http.post('/scrm/channels', form.value)
    }
    ElMessage.success('配置已保存')
  } catch {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

async function handleTest() {
  testing.value = true
  try {
    await http.post(`/scrm/channels/${channelId}/test`)
    ElMessage.success('连接测试成功')
  } catch {
    ElMessage.error('连接测试失败')
  } finally {
    testing.value = false
  }
}

onMounted(loadChannel)
</script>
<template>
  <div class="page-container">
    <el-card>
      <template #header> 渠道配置 </template>
      <el-form :model="form" label-width="160px">
        <el-form-item label="渠道类型">
          <el-select v-model="form.type" placeholder="选择渠道类型">
            <el-option label="微信公众号" value="wechat_official" />
            <el-option label="微信小程序" value="wechat_mini_program" />
            <el-option label="企业微信" value="enterprise_wechat" />
          </el-select>
        </el-form-item>
        <el-form-item label="AppID / CorpID">
          <el-input v-model="form.appId" placeholder="请输入 AppID 或 CorpID" />
        </el-form-item>
        <el-form-item label="AppSecret / Secret">
          <el-input
            v-model="form.appSecret"
            type="password"
            show-password
            placeholder="请输入 Secret"
          />
        </el-form-item>
        <el-form-item v-if="form.type === 'enterprise_wechat'" label="AgentID">
          <el-input v-model="form.agentId" placeholder="请输入 AgentID" />
        </el-form-item>
        <el-divider content-position="left"> 服务器配置（填入微信/企业微信后台） </el-divider>
        <el-form-item label="回调 URL">
          <el-input :model-value="callbackUrl" readonly>
            <template #append>
              <el-button @click="copyUrl"> 复制 </el-button>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="Token">
          <el-input v-model="form.callbackToken" placeholder="自定义 Token" />
        </el-form-item>
        <el-form-item label="EncodingAESKey">
          <el-input v-model="form.encodingAesKey" placeholder="自定义或自动生成" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSave"> 保存配置 </el-button>
          <el-button @click="handleTest"> 测试连接 </el-button>
          <el-button @click="$router.back()"> 返回 </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'

const form = ref({
  type: 'wechat_official',
  appId: '',
  appSecret: '',
  agentId: '',
  callbackToken: '',
  encodingAesKey: '',
})
const callbackUrl = computed(() => {
  const base = window.location.origin + '/api/v1/channels'
  return form.value.type === 'enterprise_wechat'
    ? `${base}/wechat-work/callback`
    : `${base}/wechat/callback`
})
function copyUrl() {
  navigator.clipboard.writeText(callbackUrl.value)
  ElMessage.success('已复制')
}
function handleSave() {
  ElMessage.success('配置已保存')
}
function handleTest() {
  ElMessage.info('测试连接中...')
}
</script>
