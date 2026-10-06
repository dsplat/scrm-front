<template>
  <view class="wecom-sidebar">
    <NavBar title="客户侧边栏" :show-back="false" />

    <!-- 非企微客户端：明确提示，不静默白屏 -->
    <view v-if="unsupported" class="hint-block">
      <text class="hint-title"> 请在企业微信中打开 </text>
      <text class="hint-desc"> 本页为企业微信聊天侧边栏，仅在企微客户端会话内可用。 </text>
    </view>

    <view v-else-if="loading" class="hint-block">
      <text class="hint-desc"> 正在初始化… </text>
    </view>

    <ErrorState v-else-if="error" message="侧边栏加载失败，请稍后重试" @retry="init" />

    <template v-else>
      <!-- 客户画像卡 -->
      <view class="profile-card">
        <view class="profile-head">
          <image
            v-if="profile?.avatar"
            class="profile-avatar"
            :src="profile.avatar"
            mode="aspectFill"
          />
          <view v-else class="profile-avatar profile-avatar--fallback">
            <text>{{ avatarText }}</text>
          </view>
          <view class="profile-meta">
            <text class="profile-name">
              {{ profile?.name || '未知客户' }}
            </text>
            <text class="profile-sub">
              {{ profile?.remark || profile?.corp_name || '暂无备注' }}
            </text>
          </view>
        </view>
        <view v-if="profile?.tags?.length" class="profile-tags">
          <text v-for="tag in profile.tags" :key="tag.tag_id || tag.name" class="tag-chip">
            {{ tag.name }}
          </text>
        </view>
        <view class="profile-foot">
          <text v-if="profile?.owner_name" class="profile-foot-item">
            归属：{{ profile.owner_name }}
          </text>
          <text v-if="profile?.add_way" class="profile-foot-item">
            渠道：{{ profile.add_way }}
          </text>
        </view>
      </view>

      <!-- 分类 Tab -->
      <view class="filter-tabs">
        <view
          v-for="tab in tabs"
          :key="tab.key"
          class="tab-item"
          :class="{ active: activeTab === tab.key }"
          @tap="activeTab = tab.key"
        >
          <text>{{ tab.label }}</text>
        </view>
      </view>

      <!-- 话术 -->
      <view v-if="activeTab === 'script'" class="list">
        <view v-if="scripts.length === 0" class="empty-tip">
          <text>暂无话术</text>
        </view>
        <view v-for="item in scripts" :key="item.script_id" class="list-item">
          <view class="list-item__main">
            <text class="list-item__title">
              {{ item.title }}
            </text>
            <text class="list-item__body">
              {{ item.content }}
            </text>
          </view>
          <button
            class="send-btn"
            :disabled="sending === `script:${item.script_id}`"
            @tap="sendScript(item)"
          >
            发送
          </button>
        </view>
      </view>

      <!-- 素材 -->
      <view v-if="activeTab === 'material'" class="list">
        <view v-if="materials.length === 0" class="empty-tip">
          <text>暂无素材</text>
        </view>
        <view v-for="item in materials" :key="item.material_id" class="list-item">
          <view class="list-item__main">
            <text class="list-item__title">
              {{ item.title }}
            </text>
            <text v-if="item.description" class="list-item__body">
              {{ item.description }}
            </text>
          </view>
          <button
            class="send-btn"
            :disabled="sending === `material:${item.material_id}`"
            @tap="sendMaterial(item)"
          >
            发送
          </button>
        </view>
      </view>

      <!-- 活动 -->
      <view v-if="activeTab === 'activity'" class="list">
        <view v-if="activities.length === 0" class="empty-tip">
          <text>暂无可发送活动</text>
        </view>
        <view v-for="item in activities" :key="item.activity_id" class="list-item">
          <view class="list-item__main">
            <text class="list-item__title">
              {{ item.title }}
            </text>
            <text v-if="item.description" class="list-item__body">
              {{ item.description }}
            </text>
          </view>
          <button
            class="send-btn"
            :disabled="sending === `activity:${item.activity_id}`"
            @tap="sendActivity(item)"
          >
            一键发送
          </button>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import NavBar from '../../components/NavBar.vue'
import ErrorState from '../../components/ErrorState.vue'
import { useTenantTitle } from '../../composables/useTenantTitle'
import {
  buildLinkMessage,
  buildTextMessage,
  getExternalUserId,
  sendChatMessage,
  setupWecomSidebar,
  WecomSidebarError,
  type WecomChatMessage,
} from '../../utils/wecomSidebar'
import {
  getSidebarActivities,
  getSidebarMaterials,
  getSidebarProfile,
  getSidebarScripts,
  getSidebarSignature,
  type SidebarActivity,
  type SidebarMaterial,
  type SidebarProfile,
  type SidebarScript,
} from '../../api/wecom'

const tabs = [
  { key: 'script', label: '话术' },
  { key: 'material', label: '素材' },
  { key: 'activity', label: '活动' },
]

const loading = ref(true)
const error = ref(false)
const unsupported = ref(false)
const activeTab = ref('script')
/** 正在发送的条目 key（`script:1` 等），用于禁用按钮防重复点击 */
const sending = ref('')

const externalUserId = ref('')
const profile = ref<SidebarProfile | null>(null)
const scripts = ref<SidebarScript[]>([])
const materials = ref<SidebarMaterial[]>([])
const activities = ref<SidebarActivity[]>([])

useTenantTitle()

const avatarText = computed(() => (profile.value?.name || '客').slice(0, 1))

/** 初始化：agentConfig → 取 external_userid → 拉取画像/话术/素材/活动 */
async function init() {
  loading.value = true
  error.value = false
  unsupported.value = false

  try {
    await setupWecomSidebar({ getSignature: getSidebarSignature })
  } catch (e) {
    if (e instanceof WecomSidebarError && e.reason === 'unsupported') {
      unsupported.value = true
    } else {
      error.value = true
    }
    loading.value = false
    return
  }

  try {
    externalUserId.value = await getExternalUserId()
  } catch {
    // 未处于客户会话（或未授权）：画像留空，仍可发送到当前会话
    externalUserId.value = ''
  }

  await loadData()
  loading.value = false
}

/** 拉取四类只读数据；画像按 external_userid 单取（失败不影响其余区块） */
async function loadData() {
  const uid = externalUserId.value || undefined
  try {
    const [profileRes, scriptRes, materialRes, activityRes] = await Promise.all([
      uid ? getSidebarProfile(uid).catch(() => null) : Promise.resolve(null),
      getSidebarScripts(uid),
      getSidebarMaterials(uid),
      getSidebarActivities(uid),
    ])
    profile.value = profileRes
    scripts.value = scriptRes.items || []
    materials.value = materialRes.items || []
    activities.value = activityRes.items || []
  } catch {
    error.value = true
  }
}

/** 统一发送编排：构造消息 → 走企微原生发送通道 → 轻提示 */
async function doSend(key: string, build: () => WecomChatMessage) {
  sending.value = key
  try {
    await sendChatMessage(build())
    uni.showToast({ title: '已发送', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: (e as Error).message || '发送失败', icon: 'none' })
  } finally {
    sending.value = ''
  }
}

function sendScript(item: SidebarScript) {
  doSend(`script:${item.script_id}`, () => buildTextMessage(item.content))
}

function sendMaterial(item: SidebarMaterial) {
  doSend(`material:${item.material_id}`, () =>
    item.type === 'text'
      ? buildTextMessage(item.content || item.title)
      : buildLinkMessage({
          url: item.url,
          title: item.title,
          desc: item.description || '',
          imgUrl: item.cover_url || '',
        }),
  )
}

function sendActivity(item: SidebarActivity) {
  doSend(`activity:${item.activity_id}`, () =>
    buildLinkMessage({
      url: item.url,
      title: item.title,
      desc: item.description || '',
      imgUrl: item.cover_url || '',
    }),
  )
}

onMounted(init)
</script>

<style scoped>
.wecom-sidebar {
  min-height: 100vh;
  background: #f5f6fa;
}
.hint-block {
  margin: 24rpx;
  padding: 80rpx 36rpx;
  background: #fff;
  border-radius: 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
}
.hint-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}
.hint-desc {
  font-size: 26rpx;
  color: #999;
  text-align: center;
}
.profile-card {
  margin: 24rpx;
  padding: 36rpx;
  background: linear-gradient(135deg, var(--scrm-primary) 0%, var(--scrm-primary-deep) 100%);
  border-radius: 20rpx;
  color: #fff;
}
.profile-head {
  display: flex;
  align-items: center;
}
.profile-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
}
.profile-avatar--fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  font-weight: 600;
  color: #fff;
}
.profile-meta {
  margin-left: 24rpx;
  display: flex;
  flex-direction: column;
}
.profile-name {
  font-size: 34rpx;
  font-weight: 600;
}
.profile-sub {
  margin-top: 8rpx;
  font-size: 24rpx;
  opacity: 0.85;
}
.profile-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 24rpx;
}
.tag-chip {
  padding: 6rpx 18rpx;
  font-size: 22rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 24rpx;
}
.profile-foot {
  display: flex;
  flex-wrap: wrap;
  gap: 24rpx;
  margin-top: 20rpx;
}
.profile-foot-item {
  font-size: 22rpx;
  opacity: 0.8;
}
.filter-tabs {
  display: flex;
  padding: 0 24rpx;
}
.tab-item {
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
  font-size: 28rpx;
  color: #666;
  border-bottom: 4rpx solid transparent;
}
.tab-item.active {
  color: var(--scrm-primary);
  font-weight: 600;
  border-bottom-color: var(--scrm-primary);
}
.list {
  margin: 16rpx 24rpx 40rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 0 28rpx;
}
.list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  padding: 28rpx 0;
  border-bottom: 1px solid #f8f8f8;
}
.list-item:last-child {
  border-bottom: none;
}
.list-item__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.list-item__title {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}
.list-item__body {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.empty-tip {
  text-align: center;
  padding: 60rpx 0;
  color: #999;
  font-size: 28rpx;
}
.send-btn {
  flex-shrink: 0;
  height: 64rpx;
  line-height: 64rpx;
  padding: 0 28rpx;
  font-size: 26rpx;
  color: #fff;
  background: var(--scrm-primary);
  border-radius: 32rpx;
  margin: 0;
}
.send-btn[disabled] {
  opacity: 0.6;
}
</style>
