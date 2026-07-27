<template>
  <view class="login-page">
    <!-- 品牌区：租户主题色色块，开场即呈现租户品牌识别 -->
    <!-- 登录页为入口页，不渲染自绘 NavBar：品牌区已承载 logo/租户名，
         且避免 NavBar 覆盖 document.title，确保微信原生栏显示租户名 -->
    <view class="brand-zone">
      <view class="brand-content">
        <view class="brand-logo-wrap">
          <image class="brand-logo" :src="logoSrc" mode="aspectFit" />
        </view>
        <text class="brand-name">
          {{ tenantName }}
        </text>
        <text v-if="welcomeMessage" class="brand-message">
          {{ welcomeMessage }}
        </text>
      </view>
      <view class="brand-orb brand-orb--a" />
      <view class="brand-orb brand-orb--b" />
    </view>

    <!-- 表单卡片：上移叠压品牌区，形成层次 -->
    <view class="form-card">
      <!-- bootstrap 未就绪：加载占位 -->
      <view v-if="!tenantReady" class="boot-loading">
        <view class="boot-spinner" />
        <text class="boot-text"> 正在初始化… </text>
      </view>

      <template v-else>
        <!-- ===== delegated 模式：仅 OAuth（公司认证中心接管） ===== -->
        <template v-if="isDelegated">
          <button
            class="btn-primary btn-idp"
            hover-class="btn-primary--hover"
            :disabled="idpLoading"
            @tap="handleIdpLogin"
          >
            {{ idpLoading ? '跳转中...' : '通过公司认证中心登录' }}
          </button>
          <view v-if="oauthList.length > 0" class="delegated-hint">
            <text class="delegated-hint-text"> 或选择登录方式 </text>
          </view>
          <view class="oauth-buttons oauth-buttons--primary">
            <view
              v-for="item in oauthList"
              :key="item.key"
              class="oauth-item"
              hover-class="oauth-item--hover"
              @tap="handleOAuth(item)"
            >
              <view class="oauth-icon">
                <text class="oauth-icon-text">
                  {{ item.short }}
                </text>
              </view>
              <text class="oauth-name">
                {{ item.name }}
              </text>
            </view>
          </view>
        </template>

        <!-- ===== direct 模式：email/SMS + OAuth ===== -->
        <template v-else>
          <!-- 登录方式 Tab（email + sms 双开时显示） -->
          <view v-if="emailEnabled && smsEnabled && !mfaRequired" class="login-tabs">
            <view
              class="tab-item"
              :class="{ 'tab-item--active': activeTab === 'email' }"
              @tap="switchTab('email')"
            >
              <text>邮箱登录</text>
            </view>
            <view
              class="tab-item"
              :class="{ 'tab-item--active': activeTab === 'sms' }"
              @tap="switchTab('sms')"
            >
              <text>短信登录</text>
            </view>
          </view>

          <!-- 邮箱密码登录 -->
          <view v-if="emailEnabled && activeTab === 'email' && !mfaRequired" class="auth-form">
            <view class="form-item">
              <input
                v-model="email"
                type="text"
                placeholder="邮箱"
                class="input"
                :disabled="loading"
              />
            </view>
            <view class="form-item">
              <input
                v-model="password"
                type="password"
                placeholder="密码"
                class="input"
                :disabled="loading"
                @confirm="handleLogin"
              />
            </view>

            <view v-if="errorMsg" class="error-msg">
              <text>{{ errorMsg }}</text>
            </view>

            <button
              class="btn-primary"
              hover-class="btn-primary--hover"
              :disabled="loading || !canSubmit"
              @tap="handleLogin"
            >
              {{ loading ? '登录中...' : '登 录' }}
            </button>
          </view>

          <!-- 短信验证码登录 -->
          <view v-else-if="smsEnabled && activeTab === 'sms' && !mfaRequired" class="auth-form">
            <view class="form-item">
              <input
                v-model="phone"
                type="number"
                placeholder="手机号"
                class="input"
                maxlength="11"
                :disabled="loading"
              />
            </view>
            <view class="form-item sms-code-row">
              <input
                v-model="smsCode"
                type="number"
                placeholder="验证码"
                class="input sms-code-input"
                maxlength="6"
                :disabled="loading"
                @confirm="handleSmsLogin"
              />
              <button
                class="btn-send-code"
                :disabled="smsCountdown > 0 || !/^1[3-9]\d{9}$/.test(phone)"
                @tap="handleSendCode"
              >
                {{ smsCountdown > 0 ? `${smsCountdown}s` : '获取验证码' }}
              </button>
            </view>

            <view v-if="errorMsg" class="error-msg">
              <text>{{ errorMsg }}</text>
            </view>

            <button
              class="btn-primary"
              hover-class="btn-primary--hover"
              :disabled="loading || !canSubmitSms"
              @tap="handleSmsLogin"
            >
              {{ loading ? '登录中...' : '登 录' }}
            </button>
          </view>

          <!-- MFA 二次验证 -->
          <view v-else-if="mfaRequired" class="auth-form">
            <view class="mfa-hint">
              <text>请输入验证码完成二次验证</text>
            </view>
            <view class="form-item">
              <input
                v-model="mfaCode"
                type="number"
                placeholder="验证码"
                class="input"
                maxlength="6"
                :disabled="loading"
                @confirm="handleMfaVerify"
              />
            </view>

            <view v-if="errorMsg" class="error-msg">
              <text>{{ errorMsg }}</text>
            </view>

            <button
              class="btn-primary"
              hover-class="btn-primary--hover"
              :disabled="loading || mfaCode.length < 6"
              @tap="handleMfaVerify"
            >
              {{ loading ? '验证中...' : '验 证' }}
            </button>
          </view>

          <!-- 无可用账号登录方式 -->
          <view v-else class="no-method">
            <text class="no-method-text"> 该租户暂未开放账号密码登录 </text>
          </view>

          <!-- 第三方登录（OAuth + SSO） -->
          <view v-if="oauthList.length > 0" class="oauth-zone">
            <view class="divider">
              <view class="divider-line" />
              <text class="divider-text"> 其他登录方式 </text>
              <view class="divider-line" />
            </view>
            <view class="oauth-buttons">
              <view
                v-for="item in oauthList"
                :key="item.key"
                class="oauth-item"
                hover-class="oauth-item--hover"
                @tap="handleOAuth(item)"
              >
                <view class="oauth-icon">
                  <text class="oauth-icon-text">
                    {{ item.short }}
                  </text>
                </view>
                <text class="oauth-name">
                  {{ item.name }}
                </text>
              </view>
            </view>
          </view>

          <!-- 注册入口（allow_register 守卫） -->
          <view v-if="allowRegister" class="auth-footer">
            <text class="link" @tap="goRegister"> 没有账号？立即注册 </text>
          </view>
        </template>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { emailLogin, mfaVerify, sendSmsCode, smsLogin } from '../../api/auth'
import type { LoginResult } from '../../api/auth'
import { bindAttribution } from '../../api/distribution'
import { getStoredRef, clearReferral } from '../../utils/referral'
import { useUserStore } from '../../store/user'
import { useTenantStore } from '../../store/tenant'
import { useTenantTitle } from '../../composables/useTenantTitle'

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

// 登录方式 tab: 'email' | 'sms'
const activeTab = ref<'email' | 'sms'>('email')

// SMS 登录状态
const phone = ref('')
const smsCode = ref('')
const smsCountdown = ref(0)
let smsTimer: ReturnType<typeof setInterval> | null = null

// MFA 状态
const mfaRequired = ref(false)
const mfaUserId = ref(0)
const mfaTypes = ref<string[]>([])
const mfaCode = ref('')

const { setUser } = useUserStore()
const { state: tenantState } = useTenantStore()

// ---- 租户品牌消费 ----
const tenantReady = computed(() => tenantState.ready)
const tenantName = computed(() => tenantState.tenant?.name || 'SCRM')
const logoSrc = computed(() => tenantState.tenant?.logo || '/static/logo.png')
const welcomeMessage = computed(() => tenantState.tenant?.branding?.login_page_message || '')

// 登录页无自绘 NavBar：微信原生栏标题统一由 useTenantTitle 管理为租户名
useTenantTitle()

// ---- 登录配置消费 ----
const isDelegated = computed(() => {
  return tenantState.loginConfig?.delegated === true
})

const emailEnabled = computed(() => {
  if (isDelegated.value) return false
  const methods = tenantState.loginConfig?.login_methods || ['email']
  return methods.includes('email')
})

// bootstrap 失败（loginConfig 为空）时兜底放行，与注册页守卫策略一致
const allowRegister = computed(() => {
  return tenantState.loginConfig ? tenantState.loginConfig.allow_register : true
})

interface OAuthItem {
  key: string
  name: string
  short: string
  url: string
}

// provider → 中文名称 + 图标缩写映射
const PROVIDER_LABELS: Record<string, { name: string; short: string }> = {
  wechat: { name: '微信', short: '微' },
  wechat_work: { name: '企业微信', short: '企' },
  dingtalk: { name: '钉钉', short: '钉' },
  feishu: { name: '飞书', short: '飞' },
  github: { name: 'GitHub', short: 'G' },
  google: { name: 'Google', short: 'G' },
  alipay: { name: '支付宝', short: '支' },
}

// 聚合 OAuth + SSO 为统一第三方登录列表
const oauthList = computed<OAuthItem[]>(() => {
  const list: OAuthItem[] = []
  const cfg = tenantState.loginConfig
  if (!cfg) return list

  for (const p of cfg.oauth_providers || []) {
    const label = PROVIDER_LABELS[p.provider] || { name: p.name, short: p.name.slice(0, 1) }
    list.push({
      key: p.provider,
      name: label.name,
      short: label.short,
      url: `/api/v1/auth/${p.provider}/redirect`,
    })
  }
  for (const p of cfg.sso_providers || []) {
    const ssoName = p.provider.replace(/^sso:/, '')
    const label = PROVIDER_LABELS[ssoName] || { name: p.name, short: p.name.slice(0, 1) }
    list.push({
      key: p.provider,
      name: label.name,
      short: label.short,
      url: `/api/v1/auth/sso/${ssoName}/redirect`,
    })
  }
  return list
})

const canSubmit = computed(() => {
  return email.value.trim() !== '' && password.value.length >= 8
})

// SMS 登录配置
const smsEnabled = computed(() => {
  if (isDelegated.value) return false
  const methods = tenantState.loginConfig?.login_methods || ['email']
  return methods.includes('sms')
})

const canSubmitSms = computed(() => {
  return /^1[3-9]\d{9}$/.test(phone.value) && smsCode.value.length === 6
})

async function handleSendCode() {
  if (smsCountdown.value > 0 || !/^1[3-9]\d{9}$/.test(phone.value)) return

  errorMsg.value = ''
  try {
    await sendSmsCode(phone.value)
    // 开始 60 秒倒计时
    smsCountdown.value = 60
    smsTimer = setInterval(() => {
      smsCountdown.value--
      if (smsCountdown.value <= 0 && smsTimer) {
        clearInterval(smsTimer)
        smsTimer = null
      }
    }, 1000)
  } catch (e: any) {
    errorMsg.value = e.message || '验证码发送失败'
  }
}

async function handleSmsLogin() {
  if (!canSubmitSms.value || loading.value) return

  loading.value = true
  errorMsg.value = ''

  try {
    const result = await smsLogin(phone.value, smsCode.value)
    onLoginSuccess(result)
  } catch (e: any) {
    errorMsg.value = e.message || '验证码错误'
  } finally {
    loading.value = false
  }
}

function switchTab(tab: 'email' | 'sms') {
  activeTab.value = tab
  errorMsg.value = ''
}

async function handleLogin() {
  if (!canSubmit.value || loading.value) return

  loading.value = true
  errorMsg.value = ''

  try {
    const result = await emailLogin(email.value.trim(), password.value)

    if ('mfa_required' in result) {
      // 需要 MFA 二次验证
      mfaRequired.value = true
      mfaUserId.value = result.user_id
      mfaTypes.value = result.available_types
      return
    }

    // 登录成功
    onLoginSuccess(result)
  } catch (e: any) {
    errorMsg.value = e.message || '登录失败，请检查邮箱和密码'
  } finally {
    loading.value = false
  }
}

async function handleMfaVerify() {
  if (mfaCode.value.length < 6 || loading.value) return

  loading.value = true
  errorMsg.value = ''

  try {
    const type = mfaTypes.value[0] || 'totp'
    const result = await mfaVerify(mfaUserId.value, type, mfaCode.value)
    onLoginSuccess(result)
  } catch (e: any) {
    errorMsg.value = e.message || '验证码错误'
  } finally {
    loading.value = false
  }
}

function onLoginSuccess(result: LoginResult) {
  setUser(result.user, result.tenant_id)
  // 登录成功后静默绑定分销归因（扫码海报进入的 ref），不阻断跳转
  bindReferralSilently()
  uni.switchTab({ url: '/pages/index/index' })
}

async function bindReferralSilently() {
  const ref = getStoredRef()
  if (!ref) return
  try {
    await bindAttribution(ref, 'poster')
    clearReferral()
  } catch (e) {
    // 归因失败静默降级（自绑/分销员未激活等），不影响登录体验
  }
}

async function handleOAuth(item: OAuthItem) {
  // #ifdef H5
  try {
    const res = await fetch(item.url, { headers: { Accept: 'application/json' } })
    const json = await res.json()
    if (json.success && json.data?.url) {
      window.location.href = json.data.url
    } else {
      uni.showToast({ title: json.message || 'OAuth 跳转失败', icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: '网络错误', icon: 'none' })
  }
  // #endif
}

// delegated 模式主入口：直连认证中心（后端对任意 provider 均转发 IdP，用通用 idp 标识）
const idpLoading = ref(false)
async function handleIdpLogin() {
  if (idpLoading.value) return
  idpLoading.value = true
  try {
    await handleOAuth({
      key: 'idp',
      name: '认证中心',
      short: 'ID',
      url: '/api/v1/auth/idp/redirect',
    })
  } finally {
    idpLoading.value = false
  }
}

function goRegister() {
  uni.navigateTo({ url: '/pages/auth/register' })
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: #f5f6fa;
  display: flex;
  flex-direction: column;
}

/* ---- 品牌区 ---- */
.brand-zone {
  position: relative;
  background: var(--scrm-primary, #07c160);
  background-image: linear-gradient(165deg, rgba(255, 255, 255, 0.14) 0%, rgba(0, 0, 0, 0.1) 100%);
  padding-bottom: 96rpx;
  overflow: hidden;
}
.brand-content {
  position: relative;
  z-index: 1;
  /* 顶部安全区留白：登录页无自绘 NavBar，需补偿状态栏/刘海高度 */
  padding: calc(48rpx + env(safe-area-inset-top)) 48rpx 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.brand-logo-wrap {
  width: 104rpx;
  height: 104rpx;
  border-radius: 24rpx;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.16);
  margin-bottom: 32rpx;
}
.brand-logo {
  width: 72rpx;
  height: 72rpx;
}
.brand-name {
  font-size: 52rpx;
  font-weight: 700;
  color: #fff;
  letter-spacing: 2rpx;
  line-height: 1.2;
}
.brand-message {
  margin-top: 16rpx;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.6;
}
/* 装饰圆，营造氛围层次 */
.brand-orb {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
}
.brand-orb--a {
  width: 360rpx;
  height: 360rpx;
  right: -100rpx;
  top: -120rpx;
}
.brand-orb--b {
  width: 200rpx;
  height: 200rpx;
  right: 120rpx;
  bottom: -60rpx;
  background: rgba(255, 255, 255, 0.06);
}

/* ---- 表单卡片 ---- */
.form-card {
  position: relative;
  z-index: 2;
  margin: -48rpx 24rpx 0;
  background: #fff;
  border-radius: 28rpx;
  padding: 48rpx 40rpx;
  box-shadow: 0 12rpx 40rpx rgba(0, 0, 0, 0.08);
  animation: rise 0.4s ease-out;
}
@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(24rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ---- 加载占位 ---- */
.boot-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 0;
}
.boot-spinner {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  border: 5rpx solid #eee;
  border-top-color: var(--scrm-primary, #07c160);
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.boot-text {
  margin-top: 24rpx;
  font-size: 26rpx;
  color: #999;
}

/* ---- 表单 ---- */
.auth-form {
  width: 100%;
}

/* ---- 登录 Tab ---- */
.login-tabs {
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
  transition: color 0.2s;
}
.tab-item--active {
  color: var(--scrm-primary, #07c160);
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
  background: var(--scrm-primary, #07c160);
}

/* ---- SMS 验证码行 ---- */
.sms-code-row {
  display: flex;
  gap: 16rpx;
  align-items: center;
}
.sms-code-input {
  flex: 1;
}
.btn-send-code {
  flex-shrink: 0;
  height: 96rpx;
  line-height: 96rpx;
  padding: 0 28rpx;
  font-size: 26rpx;
  color: var(--scrm-primary, #07c160);
  background: rgba(7, 193, 96, 0.08);
  border-radius: 16rpx;
  white-space: nowrap;
}
.btn-send-code[disabled] {
  color: #ccc;
  background: #f7f8fa;
}
.form-item {
  margin-bottom: 28rpx;
}
.input {
  width: 100%;
  height: 96rpx;
  background: #f7f8fa;
  border-radius: 16rpx;
  padding: 0 28rpx;
  font-size: 30rpx;
  border: 2rpx solid transparent;
  transition:
    border-color 0.2s,
    background 0.2s;
}
.input:focus {
  background: #fff;
  border-color: var(--scrm-primary, #07c160);
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
  background: var(--scrm-primary, #07c160);
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 16rpx;
  margin-top: 16rpx;
}
.btn-primary--hover {
  opacity: 0.85;
  transform: scale(0.99);
}
.btn-primary[disabled] {
  opacity: 0.5;
}
.mfa-hint {
  text-align: center;
  font-size: 28rpx;
  color: #666;
  margin-bottom: 32rpx;
}
.no-method {
  text-align: center;
  padding: 40rpx 0;
}
.no-method-text {
  font-size: 28rpx;
  color: #999;
}

/* ---- 第三方登录 ---- */
.oauth-zone {
  margin-top: 40rpx;
}
.delegated-hint {
  text-align: center;
  margin-bottom: 40rpx;
}
.btn-idp {
  margin-bottom: 40rpx;
}
.delegated-hint-text {
  font-size: 28rpx;
  color: #666;
}
.oauth-buttons--primary {
  padding: 20rpx 0;
}
.divider {
  display: flex;
  align-items: center;
  margin-bottom: 32rpx;
}
.divider-line {
  flex: 1;
  height: 1px;
  background: #eee;
}
.divider-text {
  padding: 0 24rpx;
  font-size: 24rpx;
  color: #bbb;
}
.oauth-buttons {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 40rpx;
}
.oauth-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: transform 0.2s;
}
.oauth-item--hover {
  transform: translateY(-4rpx);
}
.oauth-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: var(--scrm-primary, #07c160);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6rpx 16rpx rgba(0, 0, 0, 0.12);
}
.oauth-icon-text {
  color: #fff;
  font-size: 34rpx;
  font-weight: 600;
}
.oauth-name {
  margin-top: 12rpx;
  font-size: 22rpx;
  color: #999;
}

/* ---- 注册入口 ---- */
.auth-footer {
  text-align: center;
  margin-top: 40rpx;
}
.link {
  color: #576b95;
  font-size: 28rpx;
}
</style>
