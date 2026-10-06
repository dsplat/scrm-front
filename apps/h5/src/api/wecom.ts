/**
 * 企业微信「聊天侧边栏」API 契约层（BL-011 第一切片）
 *
 * 侧边栏是**员工（企微成员）在客户会话侧栏打开 H5**、查看"当前聊天客户"画像并
 * 一键发送话术/素材/活动的场景。所有端点均为与后端约定的**显式形态**，本切片只实现
 * 客户端调用 + 类型；签名的服务端实现（jsapi_ticket 换取与 URL 计算）在切片二落地。
 *
 * 契约清单（供后端对齐）：
 *   GET /wecom/sidebar/signature?url=      → WecomSignature（agentConfig 签名）
 *   GET /wecom/sidebar/profile?external_userid=  → SidebarProfile（客户画像）
 *   GET /wecom/sidebar/scripts?external_userid=&keyword=  → { items, total }
 *   GET /wecom/sidebar/materials?external_userid=         → { items, total }
 *   GET /wecom/sidebar/activities?external_userid=        → { items, total }
 *
 * 一键发送**不新增后端端点**：复用企微 JSSDK `sendChatMessage`（见 utils/wecomSidebar）。
 */
import { request } from '../utils/request'
import type { WecomSignature } from '../utils/wecomSidebar'

/**
 * 侧边栏签名：后端用企业应用 jsapi_ticket + `url` 计算，返回 agentConfig 五要素。
 *
 * 与公众号 `/wechat/jssdk/config` 同理，签名在任何登录态之前就要用（页面一进入即
 * agentConfig），故走 `auth: 'none'`，避免 token 过期时 401 阻断。
 */
export async function getSidebarSignature(url: string): Promise<WecomSignature> {
  return request<WecomSignature>({
    url: '/wecom/sidebar/signature',
    method: 'GET',
    auth: 'none',
    data: { url },
  })
}

/** 客户标签 */
export interface SidebarCustomerTag {
  tag_id?: string
  name: string
  group?: string
}

/** 客户画像（当前 external_userid 的企微外部联系人档案摘要） */
export interface SidebarProfile {
  external_userid: string
  name?: string
  avatar?: string
  gender?: number
  corp_name?: string
  /** 备注名 */
  remark?: string
  /** 归属成员（企业微信成员名） */
  owner_name?: string
  /** 添加渠道 */
  add_way?: string
  /** 添加时间 */
  added_at?: string
  tags?: SidebarCustomerTag[]
}

/** 话术 */
export interface SidebarScript {
  script_id: number | string
  title: string
  content: string
  category?: string
  updated_at?: string
}

/** 素材（文本 / 图文链接 / 图片 / 文件 / 小程序） */
export interface SidebarMaterial {
  material_id: number | string
  type: 'text' | 'image' | 'link' | 'file' | 'miniprogram'
  title: string
  /** type=text 时的正文 */
  content?: string
  /** 素材落地页 / 图片地址 / 文件地址 */
  url: string
  /** 卡片缩略图 */
  cover_url?: string
  description?: string
}

/** 可一键发送的活动 */
export interface SidebarActivity {
  activity_id: number | string
  title: string
  description?: string
  cover_url?: string
  url: string
  status?: string
}

/** 列表返回统一形态（与仓内 member/marketing 等接口一致） */
export interface SidebarListResult<T> {
  items: T[]
  total: number
}

/** 客户画像 */
export async function getSidebarProfile(externalUserId: string): Promise<SidebarProfile> {
  return request<SidebarProfile>({
    url: '/wecom/sidebar/profile',
    method: 'GET',
    data: { external_userid: externalUserId },
  })
}

/** 话术列表（可按客户 / 关键词过滤） */
export async function getSidebarScripts(
  externalUserId?: string,
  keyword?: string,
): Promise<SidebarListResult<SidebarScript>> {
  return request({
    url: '/wecom/sidebar/scripts',
    method: 'GET',
    data: {
      ...(externalUserId ? { external_userid: externalUserId } : {}),
      ...(keyword ? { keyword } : {}),
    },
  })
}

/** 素材列表 */
export async function getSidebarMaterials(
  externalUserId?: string,
): Promise<SidebarListResult<SidebarMaterial>> {
  return request({
    url: '/wecom/sidebar/materials',
    method: 'GET',
    data: externalUserId ? { external_userid: externalUserId } : {},
  })
}

/** 可发送活动列表 */
export async function getSidebarActivities(
  externalUserId?: string,
): Promise<SidebarListResult<SidebarActivity>> {
  return request({
    url: '/wecom/sidebar/activities',
    method: 'GET',
    data: externalUserId ? { external_userid: externalUserId } : {},
  })
}
