export enum ChannelType {
  WechatOfficial = 'wechat_official',
  WechatMiniProgram = 'wechat_mini_program',
  EnterpriseWechat = 'enterprise_wechat',
}

export enum CustomerStage {
  Lead = 'lead',
  Contacted = 'contacted',
  FollowedUp = 'followed_up',
  Converted = 'converted',
  Churned = 'churned',
}

export enum AgentRole {
  CustomerService = 'customer_service',
  CustomerInsight = 'customer_insight',
  DataAnalysis = 'data_analysis',
  MarketingPlanning = 'marketing_planning',
  DesignProduction = 'design_production',
  RiskControl = 'risk_control',
}

export enum ConversationStatus {
  Pending = 'pending',
  Active = 'active',
  Ended = 'ended',
  TransferredToHuman = 'transferred_to_human',
}

export enum MaterialType {
  Image = 'image',
  Text = 'text',
  Link = 'link',
  MiniProgramCard = 'mini_program_card',
}

export enum AutomationTrigger {
  CustomerJoined = 'customer_joined',
  TagChanged = 'tag_changed',
  Scheduled = 'scheduled',
  StageChanged = 'stage_changed',
}

export const ChannelTypeLabels: Record<ChannelType, string> = {
  [ChannelType.WechatOfficial]: '微信公众号',
  [ChannelType.WechatMiniProgram]: '微信小程序',
  [ChannelType.EnterpriseWechat]: '企业微信',
}

export const CustomerStageLabels: Record<CustomerStage, string> = {
  [CustomerStage.Lead]: '线索',
  [CustomerStage.Contacted]: '已联系',
  [CustomerStage.FollowedUp]: '跟进中',
  [CustomerStage.Converted]: '已转化',
  [CustomerStage.Churned]: '已流失',
}

export const AgentRoleLabels: Record<AgentRole, string> = {
  [AgentRole.CustomerService]: '客服 Agent',
  [AgentRole.CustomerInsight]: '客户洞察 Agent',
  [AgentRole.DataAnalysis]: '数据分析 Agent',
  [AgentRole.MarketingPlanning]: '营销策划 Agent',
  [AgentRole.DesignProduction]: '设计制作 Agent',
  [AgentRole.RiskControl]: '风控 Agent',
}
