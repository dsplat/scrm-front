<template>
  <view class="event-detail">
    <NavBar title="活动详情" />
    <!-- 封面 -->
    <image v-if="event.cover_url" class="cover" :src="event.cover_url" mode="widthFix" />
    <!-- 基本信息 -->
    <view class="info-section">
      <text class="title">
        {{ event.title }}
      </text>
      <text v-if="event.subtitle" class="subtitle">
        {{ event.subtitle }}
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
          <text class="price"> ¥{{ ticket.price }} </text>
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
    <!-- 底部报名栏 -->
    <view class="bottom-bar">
      <button class="share-btn" @tap="goPoster">分享海报</button>
      <button class="register-btn" :disabled="!canRegister" @tap="goRegister">
        {{ canRegister ? '立即报名' : '报名未开放' }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getEventDetail, getEventTicketTypes } from '../../api/event'
import { getStoredRef } from '../../utils/referral'
import NavBar from '../../components/NavBar.vue'

const event = ref<any>({})
const ticketTypes = ref<any[]>([])
const selectedTicket = ref<number | null>(null)

const canRegister = computed(() => {
  return ['published', 'ongoing'].includes(event.value.status)
})

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('zh-CN', {
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

function goRegister() {
  if (!selectedTicket.value) {
    uni.showToast({ title: '请先选择票种', icon: 'none' })
    return
  }
  uni.navigateTo({
    url: `/pages/event/register?eventId=${event.value.event_id}&ticketTypeId=${selectedTicket.value}`,
  })
}

function goPoster() {
  // 携带当前分销员 ref（若有），生成专属归因海报
  const distributorId = getStoredRef() || ''
  uni.navigateTo({
    url: `/pages/event/poster?eventId=${event.value.event_id}&distributorId=${distributorId}`,
  })
}

onMounted(async () => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  const eventId = page.$page?.options?.eventId || page.options?.eventId
  if (!eventId) return

  const [eventRes, ticketRes] = await Promise.all([
    getEventDetail(eventId),
    getEventTicketTypes(eventId),
  ])
  // request 封装已解包 body.data：eventRes 即活动对象，ticketRes 即票种数组
  event.value = (eventRes as any) || {}
  ticketTypes.value = ((ticketRes as any) || []).map((t: any) => ({
    ...t,
    remaining: t.capacity > 0 ? t.capacity - t.sold_count : '不限',
  }))
})
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
  border-color: #4a90d9;
  background: #f0f7ff;
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
.agenda-item {
  display: flex;
  padding: 16rpx 32rpx;
  border-bottom: 1rpx solid #f5f5f5;
}
.agenda-time {
  width: 120rpx;
  color: #4a90d9;
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
  color: #4a90d9;
  border: 2rpx solid #4a90d9;
  border-radius: 44rpx;
  font-size: 32rpx;
}
.register-btn {
  flex: 2;
  background: #4a90d9;
  color: #fff;
  border-radius: 44rpx;
  font-size: 32rpx;
}
.register-btn[disabled] {
  background: #ccc;
}
</style>
