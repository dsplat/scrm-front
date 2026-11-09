<template>
  <view class="secretary-page">
    <NavBar :title="pageTitle" />

    <!-- 微信内自绘 NavBar 不渲染，补一个显式返回首页出口，避免成为页面孤岛 -->
    <view v-if="showInlineBack" class="inline-back" @tap="goHome">
      <text class="inline-back__icon"> ‹ </text>
      <text class="inline-back__text"> 返回首页 </text>
    </view>

    <view v-if="loading" class="loading">
      <text>加载中...</text>
    </view>

    <ErrorState v-else-if="loginRequired" message="使用小秘书需先登录" @retry="guardAndLoad" />

    <template v-else>
      <!-- Hero：persona 头像/名称/欢迎语 + 直接提问入口 -->
      <view class="hero">
        <view class="hero__avatar">
          <image
            v-if="persona.avatar"
            class="hero__avatar-image"
            :src="persona.avatar"
            mode="aspectFill"
          />
          <text v-else class="hero__avatar-text">
            {{ avatarText }}
          </text>
        </view>
        <text class="hero__name">
          {{ persona.name }}
        </text>
        <text class="hero__welcome">
          {{ persona.welcome }}
        </text>
        <view class="composer">
          <input
            v-model="draft"
            class="composer__input"
            type="text"
            placeholder="输入你的问题…"
            :maxlength="2000"
            confirm-type="send"
            @confirm="submitDraft"
          />
          <button class="composer__button" :disabled="!draft.trim()" @tap="submitDraft">
            发送
          </button>
        </view>
      </view>

      <!-- 接口失败：展示重试，不渲染任何能力卡或快捷问题 -->
      <view v-if="!workbench || workbench.fallback" class="section section--error">
        <ErrorState
          message="小秘书配置加载失败，请稍后重试"
          :show-back="false"
          @retry="guardAndLoad"
        />
      </view>

      <template v-else-if="workbench">
        <view v-if="quickQuestions.length > 0" class="section">
          <text class="section-title"> 试试这样问 </text>
          <view class="chips">
            <view
              v-for="question in quickQuestions"
              :key="question"
              class="chip"
              @tap="openChat(question)"
            >
              <text> {{ question }} </text>
            </view>
          </view>
        </view>

        <view v-if="packs.length > 0" class="section">
          <text class="section-title"> 我能帮你 </text>
          <view class="pack-grid">
            <view v-for="pack in packs" :key="pack.key" class="pack-card" @tap="openPack(pack)">
              <view class="pack-card__icon">
                <text class="pack-card__icon-text">
                  {{ iconText(pack) }}
                </text>
              </view>
              <text class="pack-card__name">
                {{ pack.name }}
              </text>
              <text v-if="pack.description" class="pack-card__desc">
                {{ pack.description }}
              </text>
            </view>
          </view>
        </view>

        <view v-if="handoffMessage" class="section handoff" @tap="openHandoff">
          <view class="handoff__body">
            <text class="handoff__title"> 联系人工 </text>
            <text class="handoff__desc">
              {{ handoffMessage }}
            </text>
          </view>
          <text class="handoff__arrow"> › </text>
        </view>
      </template>

      <text v-if="persona.disclaimer" class="disclaimer">
        {{ persona.disclaimer }}
      </text>
    </template>

    <!-- 通用孤岛出口：直接打开/分享进入时页面栈可能只有本页，回首页兜底 -->
    <view class="page-exit">
      <text class="page-exit__link" @tap="goHome"> 返回首页 </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import NavBar from '../../components/NavBar.vue'
import ErrorState from '../../components/ErrorState.vue'
import {
  getWorkbench,
  WORKBENCH_FALLBACK,
  type Workbench,
  type WorkbenchPack,
} from '../../api/workbench'
import { ensureLogin } from '../../utils/auth-guard'
import { getToken } from '../../utils/request'
import { isWechatBrowser } from '../../utils/platform'

/** icon 单字映射（后端未下发/未知 icon 时用能力包名称首字兜底） */
const PACK_ICON_TEXT: Record<string, string> = {
  orders: '单',
  courses: '课',
  points: '分',
  learning: '任务',
  help: '服',
}

const loading = ref(true)
const loginRequired = ref(false)
const workbench = ref<Workbench | null>(null)
const draft = ref('')
/** 微信内置浏览器不渲染自绘 NavBar，需要页面内自带返回首页出口 */
const showInlineBack = isWechatBrowser()

const persona = computed(() => workbench.value?.persona ?? WORKBENCH_FALLBACK.persona)
const pageTitle = computed(() => persona.value.name || '小秘书')
const avatarText = computed(() => persona.value.name.trim().slice(0, 1) || '秘')
const quickQuestions = computed(() => workbench.value?.quick_questions ?? [])
const packs = computed(() => workbench.value?.packs ?? [])
const handoffMessage = computed(() => {
  const handoff = workbench.value?.handoff
  return handoff?.mode === 'message' ? handoff.message : ''
})

async function loadWorkbench(): Promise<void> {
  loading.value = true
  try {
    workbench.value = await getWorkbench()
  } finally {
    loading.value = false
  }
}

/** 进入页面先登录：取消登录则留在本页展示可重试的登录提示，不发业务请求 */
async function guardAndLoad(): Promise<void> {
  loginRequired.value = false
  loading.value = true
  const ok = await ensureLogin('使用小秘书需先登录')
  if (!ok) {
    loginRequired.value = true
    loading.value = false
    return
  }
  await loadWorkbench()
}

function openChat(question: string): void {
  const text = question.trim()
  const base = '/pages/ai-chat/index'
  uni.navigateTo({
    url: text ? `${base}?q=${encodeURIComponent(text)}` : base,
  })
}

function submitDraft(): void {
  const text = draft.value.trim()
  if (!text) return
  draft.value = ''
  openChat(text)
}

async function openPack(pack: WorkbenchPack): Promise<void> {
  if (pack.requires_login && !getToken()) {
    if (!(await ensureLogin('登录后即可使用该功能'))) return
  }
  if (pack.entry) {
    uni.navigateTo({ url: pack.entry })
    return
  }
  // 无独立页面：带着该能力包的首个快捷问题进入会话
  openChat(pack.quick[0] ?? '')
}

function iconText(pack: WorkbenchPack): string {
  return PACK_ICON_TEXT[pack.icon] || pack.name.trim().slice(0, 1) || '秘'
}

function openHandoff(): void {
  if (workbench.value?.handoff.mode !== 'message') return
  if (!handoffMessage.value) return
  uni.showModal({
    title: '联系人工',
    content: handoffMessage.value,
    showCancel: false,
  })
}

/** 孤岛出口：不依赖页面栈深度，直接回首页 tab（同时清掉当前页栈） */
function goHome(): void {
  uni.switchTab({ url: '/pages/index/index' })
}

onLoad(() => {
  void guardAndLoad()
})
</script>

<style scoped>
.secretary-page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 20rpx 24rpx calc(40rpx + env(safe-area-inset-bottom));
  background: var(--scrm-page-bg, #f4f5f7);
}
.inline-back {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 4rpx 20rpx;
  color: var(--scrm-text-secondary, #6b7280);
  font-size: 26rpx;
}
.inline-back__icon {
  font-size: 38rpx;
  line-height: 1;
}
.inline-back__text {
  line-height: 1;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 160rpx 0;
  color: var(--scrm-text-tertiary, #8a9099);
  font-size: 26rpx;
}
.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20rpx;
  padding: 36rpx 28rpx 32rpx;
  border-radius: 24rpx;
  background: var(--scrm-card-bg, #fff);
  box-shadow: 0 4rpx 16rpx rgba(17, 24, 39, 0.04);
}
.hero__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 112rpx;
  height: 112rpx;
  overflow: hidden;
  border-radius: 32rpx;
  background: var(--scrm-primary-soft);
}
.hero__avatar-image {
  width: 112rpx;
  height: 112rpx;
}
.hero__avatar-text {
  color: var(--scrm-primary);
  font-size: 44rpx;
  font-weight: 600;
  line-height: 1;
}
.hero__name {
  margin-top: 20rpx;
  color: var(--scrm-text-primary, #1f2329);
  font-size: 34rpx;
  font-weight: 600;
  text-align: center;
}
.hero__welcome {
  margin-top: 14rpx;
  color: var(--scrm-text-secondary, #6b7280);
  font-size: 26rpx;
  line-height: 1.6;
  text-align: center;
}
.composer {
  display: flex;
  align-items: center;
  gap: 16rpx;
  width: 100%;
  box-sizing: border-box;
  margin-top: 28rpx;
}
.composer__input {
  flex: 1;
  height: 80rpx;
  padding: 0 28rpx;
  border-radius: 40rpx;
  background: var(--scrm-page-bg, #f4f5f7);
  color: var(--scrm-text-primary, #1f2329);
  font-size: 26rpx;
}
.composer__button {
  flex-shrink: 0;
  min-width: 120rpx;
  height: 80rpx;
  margin: 0;
  padding: 0 28rpx;
  border-radius: 40rpx;
  background: var(--scrm-primary);
  color: #fff;
  font-size: 26rpx;
  line-height: 80rpx;
}
.composer__button::after {
  border: none;
}
.composer__button[disabled] {
  background: var(--scrm-primary);
  color: rgba(255, 255, 255, 0.55);
}
.section {
  margin-bottom: 20rpx;
  padding: 28rpx;
  border-radius: 24rpx;
  background: var(--scrm-card-bg, #fff);
  box-shadow: 0 4rpx 16rpx rgba(17, 24, 39, 0.04);
}
.section--error {
  padding: 0;
}
.section-title {
  display: block;
  margin-bottom: 20rpx;
  color: var(--scrm-text-primary, #1f2329);
  font-size: 30rpx;
  font-weight: 600;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.chip {
  padding: 0 24rpx;
  border-radius: 28rpx;
  background: var(--scrm-primary-soft);
  color: var(--scrm-primary);
  font-size: 24rpx;
  line-height: 56rpx;
}
.pack-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 16rpx;
}
.pack-card {
  display: flex;
  flex-direction: column;
  width: calc(50% - 8rpx);
  box-sizing: border-box;
  padding: 24rpx;
  border-radius: 20rpx;
  background: var(--scrm-page-bg, #f4f5f7);
}
.pack-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
  margin-bottom: 16rpx;
  border-radius: 18rpx;
  background: var(--scrm-primary-soft);
}
.pack-card__icon-text {
  color: var(--scrm-primary);
  font-size: 26rpx;
  font-weight: 600;
  line-height: 1;
}
.pack-card__name {
  color: var(--scrm-text-primary, #1f2329);
  font-size: 28rpx;
  font-weight: 600;
}
.pack-card__desc {
  margin-top: 8rpx;
  color: var(--scrm-text-secondary, #6b7280);
  font-size: 22rpx;
  line-height: 1.5;
}
.handoff {
  display: flex;
  align-items: center;
}
.handoff__body {
  flex: 1;
  min-width: 0;
}
.handoff__title {
  display: block;
  color: var(--scrm-text-primary, #1f2329);
  font-size: 28rpx;
  font-weight: 600;
}
.handoff__desc {
  display: block;
  margin-top: 8rpx;
  color: var(--scrm-text-secondary, #6b7280);
  font-size: 24rpx;
  line-height: 1.5;
}
.handoff__arrow {
  flex-shrink: 0;
  margin-left: 16rpx;
  color: var(--scrm-text-tertiary, #8a9099);
  font-size: 36rpx;
}
.disclaimer {
  display: block;
  padding: 20rpx 12rpx 0;
  color: var(--scrm-text-tertiary, #8a9099);
  font-size: 22rpx;
  line-height: 1.5;
  text-align: center;
}
.page-exit {
  padding: 28rpx 0 8rpx;
  text-align: center;
}
.page-exit__link {
  color: var(--scrm-text-tertiary, #8a9099);
  font-size: 24rpx;
  text-decoration: underline;
}
</style>
