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
