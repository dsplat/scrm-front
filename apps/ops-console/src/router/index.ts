import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import OpsLayout from '@/layouts/OpsLayout.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: OpsLayout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '运营看板' },
      },

      // 客户运营
      {
        path: 'customers',
        name: 'CustomerList',
        component: () => import('@/modules/customer/views/customers/CustomerList.vue'),
        meta: { title: '客户管理' },
      },
      {
        path: 'customers/groups',
        name: 'CustomerGroups',
        component: () => import('@/modules/customer/views/customers/CustomerGroups.vue'),
        meta: { title: '客户分组' },
      },
      {
        path: 'customers/new',
        name: 'CustomerCreate',
        component: () => import('@/modules/customer/views/customers/CustomerDetail.vue'),
        meta: { title: '新建客户' },
      },
      {
        path: 'customers/:id',
        name: 'CustomerDetail',
        component: () => import('@/modules/customer/views/customers/CustomerDetail.vue'),
        meta: { title: '客户详情' },
      },
      {
        path: 'tags',
        name: 'TagManagement',
        component: () => import('@/modules/customer/views/tags/TagManagement.vue'),
        meta: { title: '标签管理' },
      },
      {
        path: 'conversations',
        name: 'ConversationList',
        component: () => import('@/modules/ai/views/conversations/ConversationList.vue'),
        meta: { title: '会话记录' },
      },
      {
        path: 'conversations/new',
        name: 'ConversationCreate',
        component: () => import('@/modules/ai/views/conversations/ConversationDetail.vue'),
        meta: { title: '新建会话' },
      },
      {
        path: 'conversations/:id',
        name: 'ConversationDetail',
        component: () => import('@/modules/ai/views/conversations/ConversationDetail.vue'),
        meta: { title: '会话详情' },
      },
      {
        path: 'journey',
        name: 'CustomerJourney',
        component: () => import('@/modules/customer/views/journey/CustomerJourney.vue'),
        meta: { title: '客户旅程' },
      },
      {
        path: 'staff',
        name: 'StaffManagement',
        component: () => import('@/modules/staff/views/staff/StaffManagement.vue'),
        meta: { title: '员工管理' },
      },

      // 获客与社群
      {
        path: 'channels',
        name: 'ChannelList',
        component: () => import('@/modules/channel/views/channels/ChannelList.vue'),
        meta: { title: '渠道管理' },
      },
      {
        path: 'channels/new',
        name: 'ChannelCreate',
        component: () => import('@/modules/channel/views/channels/ChannelDetail.vue'),
        meta: { title: '新建渠道' },
      },
      {
        path: 'channels/:id',
        name: 'ChannelDetail',
        component: () => import('@/modules/channel/views/channels/ChannelDetail.vue'),
        meta: { title: '渠道配置' },
      },
      {
        path: 'live-codes',
        name: 'LiveCodeList',
        component: () => import('@/modules/channel/views/live-codes/LiveCodeList.vue'),
        meta: { title: '活码管理' },
      },
      {
        path: 'live-codes/new',
        name: 'LiveCodeCreate',
        component: () => import('@/modules/channel/views/live-codes/LiveCodeDetail.vue'),
        meta: { title: '新建活码' },
      },
      {
        path: 'live-codes/:id',
        name: 'LiveCodeDetail',
        component: () => import('@/modules/channel/views/live-codes/LiveCodeDetail.vue'),
        meta: { title: '活码详情' },
      },
      {
        path: 'communities',
        name: 'CommunityList',
        component: () => import('@/modules/community/views/communities/CommunityList.vue'),
        meta: { title: '社群管理' },
      },
      {
        path: 'communities/new',
        name: 'CommunityCreate',
        component: () => import('@/modules/community/views/communities/CommunityDetail.vue'),
        meta: { title: '新建社群' },
      },
      {
        path: 'communities/:id',
        name: 'CommunityDetail',
        component: () => import('@/modules/community/views/communities/CommunityDetail.vue'),
        meta: { title: '社群详情' },
      },
      {
        path: 'campaign',
        name: 'CampaignManagement',
        component: () => import('@/modules/marketing/views/campaign/CampaignManagement.vue'),
        meta: { title: '营销活动' },
      },
      {
        path: 'pipeline',
        name: 'PipelineManagement',
        component: () => import('@/modules/customer/views/pipeline/PipelineManagement.vue'),
        meta: { title: '管道/阶段' },
      },

      // 内容与自动化
      {
        path: 'materials',
        name: 'MaterialList',
        component: () => import('@/modules/content/views/materials/MaterialList.vue'),
        meta: { title: '素材管理' },
      },
      {
        path: 'automations',
        name: 'RuleList',
        component: () => import('@/modules/marketing/views/automations/RuleList.vue'),
        meta: { title: '自动化规则' },
      },
      {
        path: 'automations/new',
        name: 'RuleCreate',
        component: () => import('@/modules/marketing/views/automations/RuleEditor.vue'),
        meta: { title: '新建规则' },
      },
      {
        path: 'automations/editor',
        name: 'RuleEditor',
        component: () => import('@/modules/marketing/views/automations/RuleEditor.vue'),
        meta: { title: '规则编辑器' },
      },
      {
        path: 'automations/editor/:id',
        name: 'RuleEditorEdit',
        component: () => import('@/modules/marketing/views/automations/RuleEditor.vue'),
        meta: { title: '编辑规则' },
      },
      {
        path: 'wechat',
        name: 'WechatMenu',
        component: () => import('@/modules/channel/views/wechat/WechatMenuManagement.vue'),
        meta: { title: '微信菜单' },
      },
      {
        path: 'wechat/templates',
        name: 'TemplateMessage',
        component: () => import('@/modules/channel/views/wechat/TemplateMessageManagement.vue'),
        meta: { title: '模板消息' },
      },
      {
        path: 'knowledge',
        name: 'KBList',
        component: () => import('@/modules/knowledge/views/knowledge/KBList.vue'),
        meta: { title: '知识库' },
      },
      {
        path: 'knowledge/new',
        name: 'KBCreate',
        component: () => import('@/modules/knowledge/views/knowledge/KBDetail.vue'),
        meta: { title: '新建知识库' },
      },
      {
        path: 'knowledge/:id',
        name: 'KBDetail',
        component: () => import('@/modules/knowledge/views/knowledge/KBDetail.vue'),
        meta: { title: '知识库详情' },
      },

      // AI 能力
      {
        path: 'agents',
        name: 'AgentList',
        component: () => import('@/modules/ai/views/agents/AgentList.vue'),
        meta: { title: 'AI Agent' },
      },
      {
        path: 'agents/new',
        name: 'AgentCreate',
        component: () => import('@/modules/ai/views/agents/AgentDetail.vue'),
        meta: { title: '新建 Agent' },
      },
      {
        path: 'agents/:id',
        name: 'AgentDetail',
        component: () => import('@/modules/ai/views/agents/AgentDetail.vue'),
        meta: { title: 'Agent 配置' },
      },
      {
        path: 'agents/:id/chat',
        name: 'AgentChat',
        component: () => import('@/modules/ai/views/agents/AgentChat.vue'),
        meta: { title: '数字员工对话' },
      },
      {
        path: 'external-kb',
        name: 'ExternalKB',
        component: () => import('@/modules/knowledge/views/external-kb/ExternalKBManagement.vue'),
        meta: { title: '外部知识库' },
      },

      // 系统
      {
        path: 'risk',
        name: 'SensitiveWord',
        component: () => import('@/modules/platform/views/risk/SensitiveWordManagement.vue'),
        meta: { title: '风控合规' },
      },
      {
        path: 'risk/compliance',
        name: 'ComplianceDashboard',
        component: () => import('@/modules/platform/views/risk/ComplianceDashboard.vue'),
        meta: { title: '合规审查' },
      },
      {
        path: 'permission',
        name: 'RolePermission',
        component: () => import('@/modules/platform/views/permission/RolePermission.vue'),
        meta: { title: '角色权限' },
      },

      // 私域运营 — 内容营销
      {
        path: 'posters',
        name: 'PosterManagement',
        component: () => import('@/modules/marketing/views/PosterManagement.vue'),
        meta: { title: '海报管理' },
      },
      {
        path: 'moments-sop',
        name: 'MomentsSOP',
        component: () => import('@/modules/community/views/MomentsSOP.vue'),
        meta: { title: '朋友圈 SOP' },
      },
      {
        path: 'scripts',
        name: 'ScriptLibrary',
        component: () => import('@/modules/content/views/ScriptLibrary.vue'),
        meta: { title: '话术库' },
      },

      // 私域运营 — 会员运营
      {
        path: 'membership/levels',
        name: 'MembershipLevel',
        component: () => import('@/modules/membership/views/MembershipLevel.vue'),
        meta: { title: '会员等级' },
      },
      {
        path: 'membership/points',
        name: 'PointsSystem',
        component: () => import('@/modules/membership/views/PointsSystem.vue'),
        meta: { title: '积分系统' },
      },
      {
        path: 'membership/achievements',
        name: 'AchievementSystem',
        component: () => import('@/modules/platform/views/AchievementSystem.vue'),
        meta: { title: '成就体系' },
      },
      {
        path: 'membership/cards',
        name: 'MembershipCard',
        component: () => import('@/modules/membership/views/MembershipCard.vue'),
        meta: { title: '会员卡/储值卡' },
      },

      // 私域运营 — 裂变活动
      {
        path: 'coupons',
        name: 'CouponManagement',
        component: () => import('@/modules/coupon/views/CouponManagement.vue'),
        meta: { title: '优惠券' },
      },
      {
        path: 'fissions',
        name: 'FissionCampaign',
        component: () => import('@/modules/marketing/views/FissionCampaign.vue'),
        meta: { title: '裂变活动' },
      },
      {
        path: 'lotteries',
        name: 'LotteryCampaign',
        component: () => import('@/modules/lottery/views/LotteryCampaign.vue'),
        meta: { title: '抽奖活动' },
      },
      {
        path: 'surveys',
        name: 'SurveyForm',
        component: () => import('@/modules/platform/views/SurveyForm.vue'),
        meta: { title: '问卷表单' },
      },
      {
        path: 'votings',
        name: 'VotingCampaign',
        component: () => import('@/modules/voting/views/VotingCampaign.vue'),
        meta: { title: '投票活动' },
      },

      // 私域运营 — 企微运营
      {
        path: 'mass-push',
        name: 'MassPush',
        component: () => import('@/modules/community/views/MassPush.vue'),
        meta: { title: '群发助手' },
      },
      {
        path: 'welcome',
        name: 'WelcomeMessage',
        component: () => import('@/modules/channel/views/WelcomeMessage.vue'),
        meta: { title: '欢迎语' },
      },
      {
        path: 'inheritance',
        name: 'InheritanceManagement',
        component: () => import('@/modules/staff/views/InheritanceManagement.vue'),
        meta: { title: '离职继承' },
      },

      // 私域运营 — 数据分析
      {
        path: 'analytics/profile/:id?',
        name: 'CustomerProfile',
        component: () => import('@/modules/analytics/views/CustomerProfile.vue'),
        meta: { title: '客户深度画像' },
      },
      {
        path: 'analytics/funnel',
        name: 'FunnelAnalysis',
        component: () => import('@/modules/analytics/views/FunnelAnalysis.vue'),
        meta: { title: '转化漏斗' },
      },
      {
        path: 'analytics/churn',
        name: 'ChurnAlert',
        component: () => import('@/modules/analytics/views/ChurnAlert.vue'),
        meta: { title: '流失预警' },
      },
      {
        path: 'analytics/community',
        name: 'CommunityAnalytics',
        component: () => import('@/modules/analytics/views/CommunityAnalytics.vue'),
        meta: { title: '社群活跃度' },
      },

      // 私域运营 — 触达运营
      {
        path: 'scheduled-reach',
        name: 'ScheduledReach',
        component: () => import('@/modules/marketing/views/ScheduledReach.vue'),
        meta: { title: '定时触达' },
      },
      {
        path: 'sms',
        name: 'SmsMarketing',
        component: () => import('@/modules/sms/views/SmsMarketing.vue'),
        meta: { title: '短信营销' },
      },

      // 私域运营 — 交易转化
      {
        path: 'products',
        name: 'ProductManagement',
        component: () => import('@/modules/product/views/ProductManagement.vue'),
        meta: { title: '商品管理' },
      },
      {
        path: 'distribution',
        name: 'DistributionManagement',
        component: () => import('@/modules/distribution/views/DistributionManagement.vue'),
        meta: { title: '分销管理' },
      },
    ],
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { title: '登录' },
  },
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
