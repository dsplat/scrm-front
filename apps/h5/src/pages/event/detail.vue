<template>
  <view class="event-detail">
    <NavBar title="活动详情" />
    <ErrorState v-if="loadError" message="活动加载失败，请稍后重试" @retry="loadDetail" />
    <template v-else>
      <!-- 封面 -->
      <image v-if="event.cover_url" class="cover" :src="event.cover_url" mode="widthFix" />
      <!-- 基本信息 -->
      <view class="info-section">
        <text class="title">
          {{ event.name }}
        </text>
        <view class="meta">
          <view class="meta-item">
            <text class="label"> 时间 </text>
            <text class="value">
              {{ formatDate(event.starts_at) }}
            </text>
          </view>
          <view v-if="event.venue_name" class="meta-item">
            <text class="label"> 地点 </text>
            <text class="value"> {{ event.venue_name }} {{ event.city }} </text>
          </view>
          <view class="meta-item">
            <text class="label"> 名额 </text>
            <text class="value">
              {{ event.current_participants }}/{{ event.max_participants || '不限' }}
            </text>
          </view>
        </view>
      </view>
      <!-- 票种 -->
      <view class="ticket-section">
        <text class="section-title"> 选择票种 </text>
        <view
          v-for="ticket in ticketTypes"
          :key="ticket.ticket_type_id"
          class="ticket-card"
          :class="{
            selected: selectedTicket === ticket.ticket_type_id,
            disabled: ticket.status !== 'active',
          }"
          @tap="selectTicket(ticket)"
        >
          <view class="ticket-info">
            <text class="ticket-name">
              {{ ticket.name }}
            </text>
            <text class="ticket-includes">
              {{ (ticket.includes || []).join(' / ') }}
            </text>
          </view>
          <view class="ticket-price">
            <text class="price">
              {{ formatFen(ticket.price) }}
            </text>
            <text class="remaining"> 余{{ ticket.remaining }} </text>
          </view>
        </view>
      </view>
      <!-- 活动详情 -->
      <view v-if="event.description" class="desc-section">
        <text class="section-title"> 活动详情 </text>
        <rich-text :nodes="event.description" />
      </view>
      <!-- 议程 -->
      <view v-if="event.agenda && event.agenda.length" class="agenda-section">
        <text class="section-title"> 活动议程 </text>
        <view v-for="(item, idx) in event.agenda" :key="idx" class="agenda-item">
          <text class="agenda-time">
            {{ item.time }}
          </text>
          <text class="agenda-title">
            {{ item.title }}
          </text>
          <text v-if="item.speaker" class="agenda-speaker">
            {{ item.speaker }}
          </text>
        </view>
      </view>
      <!-- AI 分享文案（BL-030c：generate_share_copy） -->
      <view v-if="event.activity_id" class="share-ai-section">
        <text class="section-title"> 分享推广 </text>
        <view class="share-ai-inner">
          <AiActionButton
            label="AI 生成分享文案"
            intent="帮我生成一条适合发朋友圈分享这个活动的文案"
            entity-type="activity"
            :entity-id="event.activity_id"
            :data-summary="event.name"
            copyable
          />
        </view>
      </view>
      <!-- 底部报名栏 -->
      <view class="bottom-bar">
        <button class="share-btn" @tap="goPoster">分享海报</button>
        <button class="register-btn" :disabled="!canRegister" @tap="goRegister">
          {{ canRegister ? '立即报名' : '报名未开放' }}
        </button>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { formatFen } from '@scrm/h5-commerce'
import { getEventDetail, getEventTicketTypes } from '../../api/event'
import { ensureLogin } from '../../utils/auth-guard'
import { useSeoMeta } from '../../composables/useSeoMeta'
import NavBar from '../../components/NavBar.vue'
import AiActionButton from '../../components/ai-assistant/AiActionButton.vue'
import ErrorState from '../../components/ErrorState.vue'

const event = ref<any>({})
const ticketTypes = ref<any[]>([])
const selectedTicket = ref<number | null>(null)
const eventId = ref('')
// 加载失败给 ErrorState（重试/返回出口），避免白屏孤儿页
const loadError = ref(false)

// 页面级 SEO：活动实体拉取后自动更新标题/描述（去 HTML 取前 80 字），canonical 带 eventId 自指
useSeoMeta(() => ({
  title: event.value.name ? `${event.value.name} - 活动详情` : '活动详情',
  description: event.value.description
    ? String(event.value.description)
        .replace(/<[^>]+>/g, '')
        .slice(0, 80)
    : undefined,
  canonicalPath: eventId.value ? `/h5/pages/event/detail?eventId=${eventId.value}` : undefined,
}))

const canRegister = computed(() => {
  // Activity 状态机：scheduled（已排期）/running（进行中）可报名
  return ['scheduled', 'running'].includes(event.value.status)
})

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  return new Date(dateStr.replace(' ', 'T')).toLocaleString('zh-CN', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function selectTicket(ticket: any) {
  if (ticket.status !== 'active') return
  selectedTicket.value = ticket.ticket_type_id
}

async function goRegister() {
  if (!selectedTicket.value) {
    uni.showToast({ title: '请先选择票种', icon: 'none' })
    return
  }
  // 报名为登录态操作：未登录先引导（登录后回跳本页）
  if (!(await ensureLogin('报名需登录后进行'))) return
  uni.navigateTo({
    url: `/pages/event/register?eventId=${event.value.activity_id}&ticketTypeId=${selectedTicket.value}`,
  })
}

function goPoster() {
  // 分销归因由后端从登录态解析，前端仅传活动 ID
  uni.navigateTo({
    url: `/pages/event/poster?eventId=${event.value.activity_id}`,
  })
}

onMounted(async () => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  const eid = page.$page?.options?.eventId || page.options?.eventId
  if (!eid) return
  eventId.value = String(eid)
  await loadDetail()
})

async function loadDetail() {
  loadError.value = false
  try {
    const [eventRes, ticketRes] = await Promise.all([
      getEventDetail(eventId.value),
      getEventTicketTypes(eventId.value),
    ])
    // request 封装已解包 body.data：eventRes 即活动对象，ticketRes 即票种数组
    event.value = (eventRes as any) || {}
    ticketTypes.value = ((ticketRes as any) || []).map((t: any) => ({
      ...t,
      remaining: t.capacity > 0 ? t.capacity - t.sold_count : '不限',
    }))
  } catch {
    loadError.value = true
  }
}
</script>

<style scoped>
.event-detail {
  padding-bottom: 120rpx;
}
.cover {
  width: 100%;
}
.info-section {
  padding: 32rpx;
}
.title {
  font-size: 40rpx;
  font-weight: bold;
  display: block;
}
.subtitle {
  font-size: 28rpx;
  color: #666;
  margin-top: 8rpx;
  display: block;
}
.meta {
  margin-top: 24rpx;
}
.meta-item {
  display: flex;
  margin-bottom: 12rpx;
}
.meta-item .label {
  width: 80rpx;
  color: #999;
  font-size: 26rpx;
}
.meta-item .value {
  font-size: 26rpx;
}
.section-title {
  font-size: 32rpx;
  font-weight: bold;
  padding: 24rpx 32rpx 12rpx;
  display: block;
}
.ticket-section {
  padding: 0 32rpx;
}
.ticket-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  border: 2rpx solid #eee;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
}
.ticket-card.selected {
  border-color: var(--scrm-primary, #07c160);
  background: var(--scrm-primary-soft, rgba(7, 193, 96, 0.08));
}
.ticket-card.disabled {
  opacity: 0.5;
}
.ticket-name {
  font-size: 30rpx;
  font-weight: 500;
}
.ticket-includes {
  font-size: 24rpx;
  color: #999;
  margin-top: 4rpx;
  display: block;
}
.price {
  font-size: 36rpx;
  color: #e74c3c;
  font-weight: bold;
}
.remaining {
  font-size: 22rpx;
  color: #999;
  display: block;
  text-align: right;
}
.share-ai-inner {
  padding: 0 32rpx 8rpx;
}
.agenda-item {
  display: flex;
  padding: 16rpx 32rpx;
  border-bottom: 1rpx solid #f5f5f5;
}
.agenda-time {
  width: 120rpx;
  color: var(--scrm-primary, #07c160);
  font-size: 26rpx;
}
.agenda-title {
  flex: 1;
  font-size: 28rpx;
}
.agenda-speaker {
  color: #999;
  font-size: 24rpx;
}
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 32rpx;
  background: #fff;
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
}
.bottom-bar {
  display: flex;
  gap: 16rpx;
}
.share-btn {
  flex: 1;
  background: #fff;
  color: var(--scrm-primary, #07c160);
  border: 2rpx solid var(--scrm-primary, #07c160);
  border-radius: 44rpx;
  font-size: 32rpx;
}
.register-btn {
  flex: 2;
  background: var(--scrm-primary, #07c160);
  color: #fff;
  border-radius: 44rpx;
  font-size: 32rpx;
}
.register-btn[disabled] {
  background: #ccc;
}
</style>
