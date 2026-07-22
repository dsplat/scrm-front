<template>
  <view class="dist-page">
    <NavBar title="分销中心" />

    <!-- 未开启分销 -->
    <view v-if="loaded && !profile.enabled" class="empty-state">
      <text class="empty-title"> 暂未开启分销 </text>
      <text class="empty-desc"> 商家尚未开启分销功能，敬请期待 </text>
    </view>

    <template v-else-if="loaded">
      <!-- 非分销员：申请入口 -->
      <view v-if="!profile.isDistributor" class="apply-card">
        <text class="apply-title"> 加入分销 · 创业变现 </text>
        <text class="apply-desc"> 分享好物，好友下单即赚佣金，最高两级分佣 </text>
        <view class="apply-btn" @tap="goApply">
          <text>立即申请</text>
        </view>
      </view>

      <!-- 分销员主面板 -->
      <template v-else>
        <!-- 佣金卡片 -->
        <view class="balance-card">
          <view class="balance-main">
            <text class="balance-label"> 可提现佣金（元） </text>
            <text class="balance-num">
              {{ fmt(distributor.availableCommission) }}
            </text>
          </view>
          <view class="balance-sub">
            <view class="sub-item">
              <text class="sub-num">
                {{ fmt(distributor.frozenCommission) }}
              </text>
              <text class="sub-label"> 待结算 </text>
            </view>
            <view class="sub-item">
              <text class="sub-num">
                {{ fmt(distributor.totalCommission) }}
              </text>
              <text class="sub-label"> 累计收益 </text>
            </view>
            <view class="sub-item">
              <text class="sub-num">
                {{ distributor.subordinateCount }}
              </text>
              <text class="sub-label"> 团队人数 </text>
            </view>
          </view>
          <view class="balance-actions">
            <view class="action-btn" @tap="openWithdraw">
              <text>提现</text>
            </view>
            <view class="action-btn ghost" @tap="showInvite">
              <text>邀请好友</text>
            </view>
          </view>
          <view v-if="distributor.status !== 'active'" class="status-tip">
            <text>{{ statusText(distributor.status) }}</text>
          </view>
        </view>

        <!-- Tab 切换 -->
        <view class="tabs">
          <view
            v-for="tab in tabs"
            :key="tab.value"
            class="tab-item"
            :class="{ active: activeTab === tab.value }"
            @tap="switchTab(tab.value)"
          >
            <text>{{ tab.label }}</text>
          </view>
        </view>

        <!-- 团队 -->
        <view v-if="activeTab === 'team'" class="panel">
          <view v-if="team.direct.length === 0" class="empty-tip">
            <text>暂无团队成员，快去邀请好友吧</text>
          </view>
          <view v-for="m in team.direct" :key="m.id" class="member-item">
            <view class="member-avatar">
              <text>{{ m.name?.charAt(0) || '员' }}</text>
            </view>
            <view class="member-info">
              <text class="member-name">
                {{ m.name }}
              </text>
              <text class="member-time"> {{ formatTime(m.createdAt) }} 加入 </text>
            </view>
            <text class="member-level"> L{{ m.level }} </text>
          </view>
          <view v-if="team.indirectCount > 0" class="indirect-tip">
            <text>间接成员 {{ team.indirectCount }} 人</text>
          </view>
        </view>

        <!-- 佣金记录 -->
        <view v-if="activeTab === 'commission'" class="panel">
          <view v-if="commissions.length === 0" class="empty-tip">
            <text>暂无佣金记录</text>
          </view>
          <view v-for="c in commissions" :key="c.id" class="record-item">
            <view class="record-left">
              <text class="record-title"> {{ c.level }}级佣金 · {{ c.orderNo }} </text>
              <text class="record-time">
                {{ formatTime(c.createdAt) }}
              </text>
            </view>
            <view class="record-right">
              <text class="record-amount"> +{{ fmt(c.commissionAmount) }} </text>
              <text class="record-status" :class="c.status">
                {{ statusLabel(c.status) }}
              </text>
            </view>
          </view>
        </view>

        <!-- 提现记录 -->
        <view v-if="activeTab === 'withdraw'" class="panel">
          <view v-if="withdrawals.length === 0" class="empty-tip">
            <text>暂无提现记录</text>
          </view>
          <view v-for="w in withdrawals" :key="w.withdrawal_id" class="record-item">
            <view class="record-left">
              <text class="record-title"> 提现申请 </text>
              <text class="record-time">
                {{ formatTime(w.created_at) }}
              </text>
            </view>
            <view class="record-right">
              <text class="record-amount spend"> -{{ fmt(w.amount) }} </text>
              <text class="record-status" :class="w.status">
                {{ withdrawLabel(w.status) }}
              </text>
            </view>
          </view>
        </view>
      </template>
    </template>

    <!-- 提现弹窗 -->
    <view v-if="withdrawVisible" class="modal-mask" @tap="withdrawVisible = false">
      <view class="modal" @tap.stop>
        <text class="modal-title"> 申请提现 </text>
        <text class="modal-balance"> 可提现：{{ fmt(distributor.availableCommission) }} 元 </text>
        <input
          v-model="withdrawForm.amount"
          class="modal-input"
          type="digit"
          placeholder="提现金额"
        />
        <input v-model="withdrawForm.accountName" class="modal-input" placeholder="收款人姓名" />
        <input
          v-model="withdrawForm.bankAccount"
          class="modal-input"
          placeholder="收款账号 / 银行卡号"
        />
        <view class="modal-actions">
          <view class="modal-btn cancel" @tap="withdrawVisible = false">
            <text>取消</text>
          </view>
          <view class="modal-btn confirm" @tap="submitWithdraw">
            <text>确认提现</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  getDistributionProfile,
  getMyTeam,
  getMyCommissions,
  getMyWithdrawals,
  requestWithdrawal,
  getInviteInfo,
} from '../../api/distribution'
import type { DistributionCenterProfile, TeamMember, CommissionItem } from '../../api/distribution'
import { useTenantTitle } from '../../composables/useTenantTitle'
import NavBar from '../../components/NavBar.vue'

useTenantTitle()

const loaded = ref(false)
const profile = ref<DistributionCenterProfile>({
  enabled: false,
  isDistributor: false,
  distributor: null,
  config: { maxLevel: 2, withdrawMinAmount: 0, withdrawFeeRate: 0, settleDays: 7 },
})

const distributor = computed(
  () =>
    profile.value.distributor || {
      id: 0,
      name: '',
      avatar: '',
      level: 1,
      inviteCode: '',
      status: 'pending' as const,
      totalCommission: 0,
      availableCommission: 0,
      frozenCommission: 0,
      subordinateCount: 0,
      createdAt: '',
    },
)

const tabs = [
  { label: '团队', value: 'team' },
  { label: '佣金', value: 'commission' },
  { label: '提现', value: 'withdraw' },
]
const activeTab = ref('team')

const team = ref<{ direct: TeamMember[]; indirectCount: number; subordinateCount: number }>({
  direct: [],
  indirectCount: 0,
  subordinateCount: 0,
})
const commissions = ref<CommissionItem[]>([])
const withdrawals = ref<any[]>([])

const withdrawVisible = ref(false)
const withdrawForm = ref({ amount: '', accountName: '', bankAccount: '' })

function fmt(n: number | string): string {
  return Number(n || 0).toFixed(2)
}

function formatTime(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function statusText(status: string): string {
  return status === 'pending' ? '申请审核中，通过后即可开始分销' : '账号已冻结，请联系商家'
}

function statusLabel(status: string): string {
  const map: Record<string, string> = { pending: '待结算', settled: '已结算', cancelled: '已取消' }
  return map[status] || status
}

function withdrawLabel(status: string): string {
  const map: Record<string, string> = {
    pending: '审核中',
    approved: '待打款',
    rejected: '已驳回',
    paid: '已到账',
    failed: '打款失败',
  }
  return map[status] || status
}

async function loadProfile() {
  try {
    profile.value = await getDistributionProfile()
  } catch {
    // 静默失败
  } finally {
    loaded.value = true
  }
}

async function loadTab() {
  if (!profile.value.isDistributor) return
  try {
    if (activeTab.value === 'team') {
      team.value = await getMyTeam()
    } else if (activeTab.value === 'commission') {
      commissions.value = await getMyCommissions()
    } else if (activeTab.value === 'withdraw') {
      withdrawals.value = await getMyWithdrawals()
    }
  } catch {
    // 静默失败
  }
}

function switchTab(value: string) {
  activeTab.value = value
  loadTab()
}

function goApply() {
  uni.navigateTo({ url: '/pages/distribution/apply' })
}

async function showInvite() {
  try {
    const info = await getInviteInfo()
    uni.showModal({
      title: '邀请好友',
      content: `邀请码：${info.inviteCode}\n分享给好友，注册时填写即可绑定团队`,
      showCancel: false,
    })
  } catch {
    uni.showToast({ title: '获取邀请信息失败', icon: 'none' })
  }
}

function openWithdraw() {
  if (distributor.value.status !== 'active') {
    uni.showToast({ title: '分销员状态异常', icon: 'none' })
    return
  }
  withdrawForm.value = { amount: '', accountName: '', bankAccount: '' }
  withdrawVisible.value = true
}

async function submitWithdraw() {
  const amount = parseFloat(withdrawForm.value.amount)
  if (!amount || amount <= 0) {
    uni.showToast({ title: '请输入正确金额', icon: 'none' })
    return
  }
  const min = profile.value.config.withdrawMinAmount
  if (min > 0 && amount < min) {
    uni.showToast({ title: `最低提现 ${min} 元`, icon: 'none' })
    return
  }
  try {
    await requestWithdrawal({
      amount,
      accountName: withdrawForm.value.accountName || undefined,
      bankAccount: withdrawForm.value.bankAccount || undefined,
    })
    withdrawVisible.value = false
    uni.showToast({ title: '提现申请已提交', icon: 'success' })
    await loadProfile()
    activeTab.value = 'withdraw'
    loadTab()
  } catch (e: any) {
    uni.showToast({ title: e.message || '提现失败', icon: 'none' })
  }
}

onMounted(async () => {
  await loadProfile()
  loadTab()
})
</script>

<style scoped>
.dist-page {
  min-height: 100vh;
  background: #f5f6fa;
  padding-bottom: 40rpx;
}
.empty-state {
  text-align: center;
  padding: 160rpx 40rpx;
  display: flex;
  flex-direction: column;
}
.empty-title {
  font-size: 34rpx;
  color: #333;
  font-weight: 600;
}
.empty-desc {
  margin-top: 16rpx;
  font-size: 26rpx;
  color: #999;
}
.apply-card {
  margin: 24rpx;
  padding: 48rpx 36rpx;
  background: linear-gradient(135deg, #ff9a3c 0%, #ff6a00 100%);
  border-radius: 20rpx;
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.apply-title {
  font-size: 38rpx;
  font-weight: 700;
}
.apply-desc {
  margin-top: 16rpx;
  font-size: 26rpx;
  opacity: 0.9;
  text-align: center;
}
.apply-btn {
  margin-top: 36rpx;
  padding: 18rpx 80rpx;
  background: #fff;
  color: #ff6a00;
  border-radius: 44rpx;
  font-size: 30rpx;
  font-weight: 600;
}
.balance-card {
  margin: 24rpx;
  padding: 36rpx;
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
  border-radius: 20rpx;
  color: #fff;
}
.balance-label {
  font-size: 26rpx;
  opacity: 0.9;
}
.balance-num {
  display: block;
  margin-top: 12rpx;
  font-size: 64rpx;
  font-weight: 700;
}
.balance-sub {
  display: flex;
  margin-top: 28rpx;
  padding-top: 24rpx;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}
.sub-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.sub-num {
  font-size: 32rpx;
  font-weight: 600;
}
.sub-label {
  margin-top: 6rpx;
  font-size: 22rpx;
  opacity: 0.8;
}
.balance-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 28rpx;
}
.action-btn {
  flex: 1;
  text-align: center;
  padding: 18rpx 0;
  background: #fff;
  color: #07c160;
  border-radius: 40rpx;
  font-size: 28rpx;
  font-weight: 600;
}
.action-btn.ghost {
  background: transparent;
  border: 1px solid #fff;
  color: #fff;
}
.status-tip {
  margin-top: 20rpx;
  font-size: 24rpx;
  opacity: 0.85;
  text-align: center;
}
.tabs {
  display: flex;
  padding: 0 24rpx;
}
.tab-item {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  font-size: 28rpx;
  color: #666;
  border-bottom: 4rpx solid transparent;
}
.tab-item.active {
  color: #07c160;
  font-weight: 600;
  border-bottom-color: #07c160;
}
.panel {
  margin: 16rpx 24rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 0 28rpx;
}
.empty-tip {
  text-align: center;
  padding: 60rpx 0;
  color: #999;
  font-size: 28rpx;
}
.member-item {
  display: flex;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1px solid #f8f8f8;
}
.member-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #07c160;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
}
.member-info {
  flex: 1;
  margin-left: 20rpx;
  display: flex;
  flex-direction: column;
}
.member-name {
  font-size: 28rpx;
  color: #333;
}
.member-time {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #bbb;
}
.member-level {
  font-size: 24rpx;
  color: #ff6a00;
  font-weight: 600;
}
.indirect-tip {
  padding: 24rpx 0;
  text-align: center;
  font-size: 24rpx;
  color: #999;
}
.record-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 0;
  border-bottom: 1px solid #f8f8f8;
}
.record-item:last-child {
  border-bottom: none;
}
.record-left {
  display: flex;
  flex-direction: column;
}
.record-title {
  font-size: 28rpx;
  color: #333;
}
.record-time {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #bbb;
}
.record-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
.record-amount {
  font-size: 32rpx;
  font-weight: 600;
  color: #07c160;
}
.record-amount.spend {
  color: #e64340;
}
.record-status {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #999;
}
.record-status.settled,
.record-status.paid {
  color: #07c160;
}
.record-status.cancelled,
.record-status.rejected,
.record-status.failed {
  color: #e64340;
}
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99;
}
.modal {
  width: 600rpx;
  background: #fff;
  border-radius: 20rpx;
  padding: 40rpx 36rpx;
  display: flex;
  flex-direction: column;
}
.modal-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  text-align: center;
}
.modal-balance {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #999;
  text-align: center;
}
.modal-input {
  margin-top: 24rpx;
  padding: 20rpx 24rpx;
  background: #f5f6fa;
  border-radius: 12rpx;
  font-size: 28rpx;
}
.modal-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 36rpx;
}
.modal-btn {
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
  border-radius: 40rpx;
  font-size: 28rpx;
}
.modal-btn.cancel {
  background: #f5f6fa;
  color: #666;
}
.modal-btn.confirm {
  background: #07c160;
  color: #fff;
}
</style>
