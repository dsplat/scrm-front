/**
 * 租户公开信息 API（无需认证）
 *
 * 后端通过请求域名自动识别租户（IdentifyTenant 中间件），
 * 供 H5 启动时拉取品牌信息与登录配置（Tenant Bootstrap）。
 */
import { request } from '../utils/request'

export interface TenantBranding {
  primary_color: string | null
  secondary_color: string | null
  login_page_message: string | null
}

export interface TenantInfo {
  tenant_id: number
  name: string
  slug: string
  logo: string | null
  domain: string | null
  branding: TenantBranding
}

export interface OAuthProvider {
  provider: string
  name: string
  icon: string
  /**
   * 微信三载体登录场景可用性（仅 provider=wechat 时返回）
   *
   * 公众号网页授权只能在微信客户端内使用、网站应用扫码只能在 PC 浏览器使用，
   * 二者不可互相兜底，故登录页按运行环境只渲染可用入口。
   * 缺省（老后端未升级）视为全部可用，保持既有行为。
   *
   * miniapp 与 miniapp_link 必须分开判：前者只表示凭证有效（够小程序内 wx.login
   * 用），后者还要求导流落地页已随小程序发布（后端探活 URL Link 得出）。
   * H5 的「在小程序中继续」入口只看 miniapp_link，否则小程序未发布时用户点了
   * 只会拿到 invalid weapp pagepath 这类技术报错。
   */
  scenes?: { h5?: boolean; pc?: boolean; miniapp?: boolean; miniapp_link?: boolean }
}

export interface SsoProvider {
  provider: string
  name: string
  type: string
}

export interface LoginConfig {
  login_methods: string[]
  oauth_providers: OAuthProvider[]
  sso_providers: SsoProvider[]
  allow_register: boolean
  email_domain_restriction: string | null
  /** delegated 模式：公司认证中心接管，email/SMS 互斥关闭 */
  delegated: boolean
}

/** 按当前域名解析租户基础信息与品牌配置 */
export async function resolveTenant(): Promise<TenantInfo> {
  return request({
    url: '/tenant/resolve',
    method: 'GET',
    needAuth: false,
  })
}

/** 获取当前租户的登录方式配置 */
export async function getLoginConfig(): Promise<LoginConfig> {
  return request({
    url: '/tenant/login-config',
    method: 'GET',
    needAuth: false,
  })
}
