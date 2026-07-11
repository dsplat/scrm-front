import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import OpsLayout from '@/layouts/OpsLayout.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: OpsLayout,
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', name: 'Dashboard', component: () => import('@/views/Dashboard.vue'), meta: { title: '运营看板' } },

      // 客户运营
      { path: 'customers', name: 'CustomerList', component: () => import('@/views/customers/CustomerList.vue'), meta: { title: '客户管理' } },
      { path: 'customers/groups', name: 'CustomerGroups', component: () => import('@/views/customers/CustomerGroups.vue'), meta: { title: '客户分组' } },
      { path: 'customers/:id', name: 'CustomerDetail', component: () => import('@/views/customers/CustomerDetail.vue'), meta: { title: '客户详情' } },
      { path: 'tags', name: 'TagManagement', component: () => import('@/views/tags/TagManagement.vue'), meta: { title: '标签管理' } },
      { path: 'conversations', name: 'ConversationList', component: () => import('@/views/conversations/ConversationList.vue'), meta: { title: '会话记录' } },
      { path: 'conversations/:id', name: 'ConversationDetail', component: () => import('@/views/conversations/ConversationDetail.vue'), meta: { title: '会话详情' } },
      { path: 'journey', name: 'CustomerJourney', component: () => import('@/views/journey/CustomerJourney.vue'), meta: { title: '客户旅程' } },
      { path: 'staff', name: 'StaffManagement', component: () => import('@/views/staff/StaffManagement.vue'), meta: { title: '员工管理' } },

      // 获客与社群
      { path: 'channels', name: 'ChannelList', component: () => import('@/views/channels/ChannelList.vue'), meta: { title: '渠道管理' } },
      { path: 'channels/:id', name: 'ChannelDetail', component: () => import('@/views/channels/ChannelDetail.vue'), meta: { title: '渠道配置' } },
      { path: 'live-codes', name: 'LiveCodeList', component: () => import('@/views/live-codes/LiveCodeList.vue'), meta: { title: '活码管理' } },
      { path: 'live-codes/:id', name: 'LiveCodeDetail', component: () => import('@/views/live-codes/LiveCodeDetail.vue'), meta: { title: '活码详情' } },
      { path: 'communities', name: 'CommunityList', component: () => import('@/views/communities/CommunityList.vue'), meta: { title: '社群管理' } },
      { path: 'communities/:id', name: 'CommunityDetail', component: () => import('@/views/communities/CommunityDetail.vue'), meta: { title: '社群详情' } },
      { path: 'campaign', name: 'CampaignManagement', component: () => import('@/views/campaign/CampaignManagement.vue'), meta: { title: '营销活动' } },
      { path: 'pipeline', name: 'PipelineManagement', component: () => import('@/views/pipeline/PipelineManagement.vue'), meta: { title: '管道/阶段' } },

      // 内容与自动化
      { path: 'materials', name: 'MaterialList', component: () => import('@/views/materials/MaterialList.vue'), meta: { title: '素材管理' } },
      { path: 'automations', name: 'RuleList', component: () => import('@/views/automations/RuleList.vue'), meta: { title: '自动化规则' } },
      { path: 'automations/editor', name: 'RuleEditor', component: () => import('@/views/automations/RuleEditor.vue'), meta: { title: '规则编辑器' } },
      { path: 'automations/editor/:id', name: 'RuleEditorEdit', component: () => import('@/views/automations/RuleEditor.vue'), meta: { title: '编辑规则' } },
      { path: 'wechat', name: 'WechatMenu', component: () => import('@/views/wechat/WechatMenuManagement.vue'), meta: { title: '微信菜单' } },
      { path: 'wechat/templates', name: 'TemplateMessage', component: () => import('@/views/wechat/TemplateMessageManagement.vue'), meta: { title: '模板消息' } },
      { path: 'knowledge', name: 'KBList', component: () => import('@/views/knowledge/KBList.vue'), meta: { title: '知识库' } },
      { path: 'knowledge/:id', name: 'KBDetail', component: () => import('@/views/knowledge/KBDetail.vue'), meta: { title: '知识库详情' } },

      // AI 能力
      { path: 'agents', name: 'AgentList', component: () => import('@/views/agents/AgentList.vue'), meta: { title: 'AI Agent' } },
      { path: 'agents/:id', name: 'AgentDetail', component: () => import('@/views/agents/AgentDetail.vue'), meta: { title: 'Agent 配置' } },
      { path: 'agents/:id/chat', name: 'AgentChat', component: () => import('@/views/agents/AgentChat.vue'), meta: { title: '数字员工对话' } },
      { path: 'external-kb', name: 'ExternalKB', component: () => import('@/views/external-kb/ExternalKBManagement.vue'), meta: { title: '外部知识库' } },

      // 系统
      { path: 'risk', name: 'SensitiveWord', component: () => import('@/views/risk/SensitiveWordManagement.vue'), meta: { title: '风控合规' } },
      { path: 'risk/compliance', name: 'ComplianceDashboard', component: () => import('@/views/risk/ComplianceDashboard.vue'), meta: { title: '合规审查' } },
      { path: 'permission', name: 'RolePermission', component: () => import('@/views/permission/RolePermission.vue'), meta: { title: '角色权限' } },

      // 私域运营 — 内容营销
      { path: 'posters', name: 'PosterManagement', component: () => import('@/views/scrm/PosterManagement.vue'), meta: { title: '海报管理' } },
      { path: 'moments-sop', name: 'MomentsSOP', component: () => import('@/views/scrm/MomentsSOP.vue'), meta: { title: '朋友圈 SOP' } },
      { path: 'scripts', name: 'ScriptLibrary', component: () => import('@/views/scrm/ScriptLibrary.vue'), meta: { title: '话术库' } },

      // 私域运营 — 会员运营
      { path: 'membership/levels', name: 'MembershipLevel', component: () => import('@/views/scrm/membership/MembershipLevel.vue'), meta: { title: '会员等级' } },
      { path: 'membership/points', name: 'PointsSystem', component: () => import('@/views/scrm/membership/PointsSystem.vue'), meta: { title: '积分系统' } },
      { path: 'membership/achievements', name: 'AchievementSystem', component: () => import('@/views/scrm/membership/AchievementSystem.vue'), meta: { title: '成就体系' } },
      { path: 'membership/cards', name: 'MembershipCard', component: () => import('@/views/scrm/membership/MembershipCard.vue'), meta: { title: '会员卡/储值卡' } },

      // 私域运营 — 裂变活动
      { path: 'coupons', name: 'CouponManagement', component: () => import('@/views/scrm/CouponManagement.vue'), meta: { title: '优惠券' } },
      { path: 'fissions', name: 'FissionCampaign', component: () => import('@/views/scrm/FissionCampaign.vue'), meta: { title: '裂变活动' } },
      { path: 'lotteries', name: 'LotteryCampaign', component: () => import('@/views/scrm/LotteryCampaign.vue'), meta: { title: '抽奖活动' } },
      { path: 'surveys', name: 'SurveyForm', component: () => import('@/views/scrm/SurveyForm.vue'), meta: { title: '问卷表单' } },
      { path: 'votings', name: 'VotingCampaign', component: () => import('@/views/scrm/VotingCampaign.vue'), meta: { title: '投票活动' } },

      // 私域运营 — 企微运营
      { path: 'mass-push', name: 'MassPush', component: () => import('@/views/scrm/MassPush.vue'), meta: { title: '群发助手' } },
      { path: 'welcome', name: 'WelcomeMessage', component: () => import('@/views/scrm/WelcomeMessage.vue'), meta: { title: '欢迎语' } },
      { path: 'inheritance', name: 'InheritanceManagement', component: () => import('@/views/scrm/InheritanceManagement.vue'), meta: { title: '离职继承' } },

      // 私域运营 — 数据分析
      { path: 'analytics/profile', name: 'CustomerProfile', component: () => import('@/views/scrm/analytics/CustomerProfile.vue'), meta: { title: '客户深度画像' } },
      { path: 'analytics/funnel', name: 'FunnelAnalysis', component: () => import('@/views/scrm/analytics/FunnelAnalysis.vue'), meta: { title: '转化漏斗' } },
      { path: 'analytics/churn', name: 'ChurnAlert', component: () => import('@/views/scrm/analytics/ChurnAlert.vue'), meta: { title: '流失预警' } },
      { path: 'analytics/community', name: 'CommunityAnalytics', component: () => import('@/views/scrm/analytics/CommunityAnalytics.vue'), meta: { title: '社群活跃度' } },

      // 私域运营 — 触达运营
      { path: 'scheduled-reach', name: 'ScheduledReach', component: () => import('@/views/scrm/ScheduledReach.vue'), meta: { title: '定时触达' } },
      { path: 'sms', name: 'SmsMarketing', component: () => import('@/views/scrm/SmsMarketing.vue'), meta: { title: '短信营销' } },

      // 私域运营 — 交易转化
      { path: 'products', name: 'ProductManagement', component: () => import('@/views/scrm/ProductManagement.vue'), meta: { title: '商品管理' } },
      { path: 'distribution', name: 'DistributionManagement', component: () => import('@/views/scrm/DistributionManagement.vue'), meta: { title: '分销管理' } },
    ],
  },
  { path: '/login', name: 'Login', component: () => import('@/views/Login.vue'), meta: { title: '登录' } },
]

const router = createRouter({
  history: createWebHistory('/scrm-console/'),
  routes,
})

// 路由守卫 — 检查 Token 有效性
router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('scrm_token')
  if (to.name === 'Login') {
    // 已登录用户访问登录页，跳转到首页
    if (token) {
      next({ path: '/dashboard' })
    } else {
      next()
    }
  } else {
    // 未登录用户访问其他页面，跳转到登录页
    if (!token) {
      next({ name: 'Login' })
    } else {
      // 设置页面标题
      const title = (to.meta.title as string) || 'SCRM 运营台'
      document.title = `${title} - SCRM 运营台`
      next()
    }
  }
})

export default router
