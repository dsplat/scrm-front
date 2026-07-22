<template>
  <view class="register-page">
    <NavBar title="活动报名" />
    <view class="form-section">
      <text class="section-title"> 参与者信息 </text>
      <view v-for="(person, idx) in attendees" :key="idx" class="attendee-card">
        <view class="attendee-header">
          <text>参与者 {{ idx + 1 }}</text>
          <text v-if="idx > 0" class="remove-btn" @tap="removeAttendee(idx)"> 删除 </text>
        </view>
        <input v-model="person.name" class="input" placeholder="姓名" />
        <input v-model="person.phone" class="input" placeholder="手机号" type="number" />
        <input v-model="person.age" class="input" placeholder="年龄" type="number" />
        <input v-model="person.relation" class="input" placeholder="关系（如：父亲/母亲/孩子）" />
      </view>
      <button class="add-btn" @tap="addAttendee">+ 添加参与者</button>
    </view>
    <view class="summary">
      <text>票种：{{ ticketName }}</text>
      <text>数量：{{ attendees.length }} 人</text>
      <text class="total"> 合计：¥{{ totalAmount }} </text>
    </view>
    <button class="submit-btn" :loading="submitting" @tap="handleSubmit">确认报名</button>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { registerEvent, getEventTicketTypes } from '../../api/event'
import NavBar from '../../components/NavBar.vue'

const attendees = ref([{ name: '', phone: '', age: '', relation: '' }])
const ticketName = ref('')
const ticketPrice = ref(0)
const submitting = ref(false)
let eventId = ''
let ticketTypeId = 0

const totalAmount = computed(() => (ticketPrice.value * attendees.value.length).toFixed(2))

function addAttendee() {
  attendees.value.push({ name: '', phone: '', age: '', relation: '' })
}

function removeAttendee(idx: number) {
  attendees.value.splice(idx, 1)
}

async function handleSubmit() {
  const valid = attendees.value.filter((a) => a.name.trim())
  if (valid.length === 0) {
    uni.showToast({ title: '请至少填写一位参与者姓名', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    const res: any = await registerEvent(eventId, {
      ticket_type_id: ticketTypeId,
      quantity: valid.length,
      // 表单 age 为字符串，提交时转为数字（空值转 undefined）
      attendees: valid.map((a) => ({
        name: a.name.trim(),
        phone: a.phone || undefined,
        age: a.age ? Number(a.age) : undefined,
        relation: a.relation || undefined,
      })),
    })
    // request 封装已解包 body.data，res 即订单对象
    const orderNo = res?.order_no
    uni.redirectTo({ url: `/pages/event/order?orderNo=${orderNo}` })
  } catch (e: any) {
    uni.showToast({ title: e.message || '报名失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  eventId = page.$page?.options?.eventId || page.options?.eventId || ''
  ticketTypeId = Number(page.$page?.options?.ticketTypeId || page.options?.ticketTypeId || 0)

  if (eventId && ticketTypeId) {
    const res: any = await getEventTicketTypes(eventId)
    // request 封装已解包 body.data，res 即票种数组
    const ticket = (res || []).find((t: any) => t.ticket_type_id === ticketTypeId)
    if (ticket) {
      ticketName.value = ticket.name
      ticketPrice.value = Number(ticket.price)
    }
  }
})
</script>

<style scoped>
.form-section {
  padding: 32rpx;
}
.section-title {
  font-size: 32rpx;
  font-weight: bold;
  display: block;
  margin-bottom: 20rpx;
}
.attendee-card {
  border: 2rpx solid #eee;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}
.attendee-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16rpx;
  font-size: 28rpx;
}
.remove-btn {
  color: #e74c3c;
  font-size: 24rpx;
}
.input {
  border: 2rpx solid #eee;
  border-radius: 8rpx;
  padding: 16rpx;
  margin-bottom: 12rpx;
  font-size: 28rpx;
}
.add-btn {
  background: #f5f5f5;
  color: #666;
  font-size: 28rpx;
  border-radius: 8rpx;
}
.summary {
  padding: 24rpx 32rpx;
  background: #fafafa;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  font-size: 28rpx;
}
.total {
  font-size: 36rpx;
  color: #e74c3c;
  font-weight: bold;
}
.submit-btn {
  margin: 32rpx;
  background: #4a90d9;
  color: #fff;
  border-radius: 44rpx;
  font-size: 32rpx;
}
</style>
