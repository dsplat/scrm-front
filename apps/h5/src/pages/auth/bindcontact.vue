<template>
  <view class="bind-page">
    <view class="bind-header">
      <text class="bind-title"> 绑定联系方式 </text>
      <text class="bind-desc"> 为保障账号安全，请绑定手机号或邮箱 </text>
    </view>

    <!-- 占用确认卡（告知式确认）：预检命中或 bind 409 兜底时展示，确认才合并 -->
    <view v-if="summary" class="bind-card confirm-card">
      <view class="confirm-avatar-wrap">
        <image
          v-if="summary.avatar_url"
          :src="summary.avatar_url"
          class="confirm-avatar"
          mode="aspectFill"
        />
        <view v-else class="confirm-avatar confirm-avatar--fallback">
          {{ (summary.nickname || '?').slice(0, 1) }}
        </view>
      </view>
      <view class="confirm-nickname">
        {{ summary.nickname }}
      </view>
      <view class="confirm-contact">
        {{ summary.masked_contact }}
      </view>
      <view v-if="summary.registered_at" class="confirm-meta">
        该账号注册于 {{ summary.registered_at.slice(0, 10) }}
      </view>
      <view class="confirm-tip">
        该{{
          activeTab === 'phone' ? '手机号' : '邮箱'
        }}已绑定账号，绑定后此渠道将直接登录该账号，原微信壳账号将合并停用
      </view>
      <view v-if="errorMsg" class="error-msg">
        <text>{{ errorMsg }}</text>
      </view>
      <view class="confirm-actions">
        <button
          class="btn-cancel"
          hover-class="btn-cancel--hover"
          :disabled="loading"
          @tap="cancelConfirm"
        >
          取消
        </button>
        <button
          class="btn-primary"
          hover-class="btn-primary--hover"
          :disabled="loading"
          @tap="handleSubmit"
        >
          {{ loading ? '绑定中...' : '确认绑定' }}
        </button>
      </view>
    </view>

    <!-- 表单绑定态 -->
    <view v-else class="bind-card">
      <!-- Tab 切换 -->
      <view class="bind-tabs">
        <view
          class="tab-item"
          :class="{ 'tab-item--active': activeTab === 'phone' }"
          @tap="activeTab = 'phone'"
        >
          <text>手机号</text>
        </view>
        <view
          class="tab-item"
          :class="{ 'tab-item--active': activeTab === 'email' }"
          @tap="activeTab = 'email'"
        >
          <text>邮箱</text>
        </view>
      </view>

      <!-- 手机号绑定 -->
      <view v-if="activeTab === 'phone'" class="bind-form">
        <view class="form-item">
          <input
            v-model="phone"
            type="number"
            placeholder="请输入手机号"
            class="input"
            maxlength="11"
            :disabled="loading"
          />
        </view>
        <view class="form-item code-row">
          <input
            v-model="code"
            type="number"
            placeholder="验证码"
            class="input code-input"
            maxlength="6"
            :disabled="loading"
            @confirm="handleSubmit"
          />
          <button
            class="btn-send"
            :disabled="countdown > 0 || !/^1[3-9]\d{9}$/.test(phone)"
            @tap="handleSendCode"
          >
            {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
          </button>
        </view>
      </view>

      <!-- 邮箱绑定 -->
      <view v-else class="bind-form">
        <view class="form-item">
          <input
            v-model="email"
            type="text"
            placeholder="请输入邮箱"
            class="input"
            :disabled="loading"
          />
        </view>
        <view class="form-item code-row">
          <input
            v-model="code"
            type="number"
            placeholder="验证码"
            class="input code-input"
            maxlength="6"
            :disabled="loading"
            @confirm="handleSubmit"
          />
          <button
            class="btn-send"
            :disabled="countdown > 0 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)"
            @tap="handleSendEmailCode"
          >
            {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
          </button>
        </view>
      </view>

      <view v-if="errorMsg" class="error-msg">
        <text>{{ errorMsg }}</text>
      </view>

      <button
        class="btn-primary"
        hover-class="btn-primary--hover"
        :disabled="loading || !canSubmit"
        @tap="handleSubmit"
      >
        {{ loading ? '绑定中...' : '确认绑定' }}
      </button>

      <view class="bind-hint">
        <text class="hint-text"> 该联系方式已绑定其他账号时，需确认后合并，不会自动覆盖 </text>
      </view>
    </view>

    <!-- 孤岛出口：全局自定义导航无返回键，放弃本次 pending 登录以游客身份回首页 -->
    <view class="skip-zone">
      <text class="link link--muted" @tap="handleSkip"> 暂不绑定，先逛逛 </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { request, setToken } from '../../utils/request'
import { sendSmsCode } from '../../api/auth'
import { useUserStore } from '../../store/user'

/** 占用账号可判断摘要（后端 buildConflictSummary，联系方式一律脱敏） */
interface BindSummary {
  user_id: number
  masked_contact: string
  nickname?: string
  avatar_url?: string | null
  registered_at?: string | null
}

const { setUser } = useUserStore()

const activeTab = ref<'phone' | 'email'>('phone')
const phone = ref('')
const email = ref('')
const code = ref('')
const loading = ref(false)
const errorMsg = ref('')
const countdown = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

// 占用命中摘要：非空 → 展示确认卡（等待用户确认后走 confirm 合并）
const summary = ref<BindSummary | null>(null)

// pending token：优先 URL 参数（H5 OAuth 回跳 pending_token= / 小程序登录桥 token=，
// 双端 onLoad 均携带 query），storage 兜底（callback.vue 先存后跳）；两种来源都兼容
const pendingToken = ref('')
onLoad((options) => {
  const fromQuery = String(options?.pending_token || options?.token || '')
  pendingToken.value = fromQuery || uni.getStorageSync('pending_token') || ''
  if (pendingToken.value) {
    uni.setStorageSync('pending_token', pendingToken.value)
  }
})

const canSubmit = computed(() => {
  if (activeTab.value === 'phone') {
    return /^1[3-9]\d{9}$/.test(phone.value) && code.value.length === 6
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value) && code.value.length === 6
})

function startCountdown() {
  countdown.value = 60
  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0 && timer) {
      clearInterval(timer)
      timer = null
    }
  }, 1000)
}

async function handleSendCode() {
  if (countdown.value > 0 || !/^1[3-9]\d{9}$/.test(phone.value)) return
  errorMsg.value = ''
  try {
    await sendSmsCode(phone.value)
    startCountdown()
  } catch (e: any) {
    errorMsg.value = e.message || '发送失败'
  }
}

async function handleSendEmailCode() {
  if (countdown.value > 0 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) return
  errorMsg.value = ''
  try {
    await request({
      url: '/auth/bind-contact/send-email-code',
      method: 'POST',
      data: { email: email.value },
      customToken: pendingToken.value,
    })
    startCountdown()
  } catch (e: any) {
    errorMsg.value = e.message || '发送失败'
  }
}

/**
 * 确认绑定（表单态先预检，命中则弹确认卡等二次确认；确认态直接走合并）
 *
 * 预检（check，只读）失败不阻断：bind 自身 409（contact_conflict + summary）兜底弹卡。
 * 后端验证码先验后消：409 不消耗验证码，确认合并同码重提仍有效。
 */
async function handleSubmit() {
  if (loading.value) return
  if (!summary.value && !canSubmit.value) return

  loading.value = true
  errorMsg.value = ''

  const type = activeTab.value
  const value = type === 'phone' ? phone.value : email.value

  try {
    // 1. 告知式预检（只读）：占用命中 → 渲染确认卡，等待用户决策（验证码已就位，不额外消耗）
    if (!summary.value) {
      try {
        const check = await request<{ matched: boolean; summary?: BindSummary }>({
          url: '/auth/bind-contact/check',
          method: 'POST',
          data: { type, value },
          customToken: pendingToken.value,
        })
        if (check.matched && check.summary) {
          summary.value = check.summary
          return
        }
      } catch {
        // 预检异常（限频/网络）不阻断：bind 自身 409 兜底弹确认卡
      }
    }

    // 2. 绑定：占用态带 confirm + expected_user_id（二次占用校验）；空闲态直绑
    const result = await request<{
      user: any
      tenant_id?: number
      auth_token: string
    }>({
      url: '/auth/bind-contact',
      method: 'POST',
      data: {
        type,
        value,
        code: code.value,
        confirm: summary.value ? true : undefined,
        expected_user_id: summary.value ? summary.value.user_id : undefined,
      },
      customToken: pendingToken.value,
    })

    // 绑定成功，存正式 token
    setToken(result.auth_token)
    setUser(result.user, result.tenant_id)
    uni.removeStorageSync('pending_token')

    // 跳转首页
    uni.switchTab({ url: '/pages/index/index' })
  } catch (e: any) {
    // 3. 409 占用冲突（预检后被抢占/目标变化）→ 就地更新确认卡；验证码未被消耗，可同码确认重提
    if (e?.code === 'contact_conflict' && e?.summary) {
      summary.value = e.summary
      return
    }
    errorMsg.value = e?.message || '绑定失败'
  } finally {
    loading.value = false
  }
}

/** 取消确认：回到表单态（验证码保留，可改号重新预检） */
function cancelConfirm() {
  summary.value = null
  errorMsg.value = ''
}

/** 跳过绑定：清 pending 态以游客身份回首页（放弃本次 OAuth 登录，与登录页出口同款） */
function handleSkip() {
  uni.removeStorageSync('pending_token')
  uni.switchTab({ url: '/pages/index/index' })
}
</script>

<style scoped>
.bind-page {
  min-height: 100vh;
  background: #f5f6fa;
  padding: 48rpx 24rpx;
}
.bind-header {
  margin-bottom: 40rpx;
}
.bind-title {
  display: block;
  font-size: 44rpx;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 12rpx;
}
.bind-desc {
  display: block;
  font-size: 28rpx;
  color: #999;
}
.bind-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 40rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.06);
}
.bind-tabs {
  display: flex;
  margin-bottom: 32rpx;
  border-bottom: 1px solid #f0f0f0;
}
.tab-item {
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
  font-size: 28rpx;
  color: #999;
  position: relative;
}
.tab-item--active {
  color: var(--scrm-primary, var(--scrm-primary));
  font-weight: 600;
}
.tab-item--active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 48rpx;
  height: 4rpx;
  border-radius: 4rpx;
  background: var(--scrm-primary, var(--scrm-primary));
}
.bind-form {
  margin-bottom: 24rpx;
}
.form-item {
  margin-bottom: 24rpx;
}
.input {
  width: 100%;
  height: 96rpx;
  background: #f7f8fa;
  border-radius: 16rpx;
  padding: 0 28rpx;
  font-size: 30rpx;
  border: 2rpx solid transparent;
}
.input:focus {
  background: #fff;
  border-color: var(--scrm-primary, var(--scrm-primary));
}
.code-row {
  display: flex;
  gap: 16rpx;
  align-items: center;
}
.code-input {
  flex: 1;
}
.btn-send {
  flex-shrink: 0;
  height: 96rpx;
  line-height: 96rpx;
  padding: 0 28rpx;
  font-size: 26rpx;
  color: var(--scrm-primary, var(--scrm-primary));
  background: rgba(7, 193, 96, 0.08);
  border-radius: 16rpx;
  white-space: nowrap;
}
.btn-send[disabled] {
  color: #ccc;
  background: #f7f8fa;
}
.error-msg {
  color: #e64340;
  font-size: 26rpx;
  margin-bottom: 20rpx;
  padding: 0 8rpx;
}
.btn-primary {
  width: 100%;
  height: 96rpx;
  line-height: 96rpx;
  background: var(--scrm-primary, var(--scrm-primary));
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 16rpx;
  margin-top: 16rpx;
}
.btn-primary--hover {
  opacity: 0.85;
}
.btn-primary[disabled] {
  opacity: 0.5;
}
.bind-hint {
  margin-top: 24rpx;
  text-align: center;
}
.hint-text {
  font-size: 24rpx;
  color: #bbb;
}

/* 占用确认卡：告知式确认（合并前展示占用账号可判断摘要） */
.confirm-card {
  text-align: center;
}
.confirm-avatar-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 20rpx;
}
.confirm-avatar {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  background: #f0f0f0;
}
.confirm-avatar--fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 52rpx;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #07c160, #059a4d);
}
.confirm-nickname {
  font-size: 36rpx;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 12rpx;
}
.confirm-contact {
  display: inline-block;
  font-size: 30rpx;
  color: var(--scrm-primary, #07c160);
  background: rgba(7, 193, 96, 0.08);
  padding: 8rpx 28rpx;
  border-radius: 32rpx;
  margin-bottom: 16rpx;
}
.confirm-meta {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 24rpx;
}
.confirm-tip {
  font-size: 26rpx;
  color: #666;
  line-height: 1.7;
  background: #fffbe6;
  border: 2rpx solid #ffe58f;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 12rpx;
  text-align: left;
}
.confirm-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 28rpx;
}
.btn-cancel {
  flex: 1;
  height: 96rpx;
  line-height: 96rpx;
  font-size: 32rpx;
  color: #666;
  background: #f7f8fa;
  border-radius: 16rpx;
  margin: 0;
}
.btn-cancel--hover {
  opacity: 0.8;
}
.btn-cancel[disabled] {
  opacity: 0.5;
}
.confirm-actions .btn-primary {
  flex: 2;
  margin: 0;
}
.link {
  color: #576b95;
  font-size: 28rpx;
}
/* 孤岛出口：比绑定主行动点更弱一级，不抢确认绑定 */
.skip-zone {
  text-align: center;
  margin-top: 32rpx;
}
.link--muted {
  color: #999;
}
</style>
