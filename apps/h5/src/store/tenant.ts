/**
 * 租户上下文状态管理（Tenant Bootstrap）
 *
 * H5 一套代码服务所有租户，启动时需按当前域名拉取租户品牌与登录配置。
 * 缓存策略：localStorage 持久化，TTL 30 分钟，域名变化自动失效。
 */
import { reactive, readonly } from 'vue'
import { resolveTenant, getLoginConfig } from '../api/tenant'
import type { TenantInfo, LoginConfig } from '../api/tenant'
import { getCurrentDomain } from '../utils/platform'

const CACHE_KEY = 'scrm_tenant_bootstrap'
const TTL = 30 * 60 * 1000 // 30 分钟

interface TenantState {
  /** 初始化是否完成（无论成功失败，避免阻塞渲染） */
  ready: boolean
  /** 拉取是否成功（失败时为 false，页面可据此显示兜底提示） */
  loaded: boolean
  tenant: TenantInfo | null
  loginConfig: LoginConfig | null
}

const state = reactive<TenantState>({
  ready: false,
  loaded: false,
  tenant: null,
  loginConfig: null,
})

interface CachePayload {
  domain: string
  fetchedAt: number
  tenant: TenantInfo
  loginConfig: LoginConfig
}

/** 读取本地缓存（域名不匹配或过期返回 null） */
function readCache(domain: string): CachePayload | null {
  try {
    const data = uni.getStorageSync(CACHE_KEY) as CachePayload | ''
    if (!data) return null
    if (data.domain !== domain) return null
    if (Date.now() - data.fetchedAt > TTL) return null
    return data
  } catch {
    return null
  }
}

function writeCache(payload: CachePayload): void {
  try {
    uni.setStorageSync(CACHE_KEY, payload)
  } catch {
    // 写缓存失败不影响主流程
  }
}

/** 应用品牌配置：主题色 CSS 变量 + 文档标题 */
function applyBranding(tenant: TenantInfo): void {
  // #ifdef H5
  const primary = tenant.branding?.primary_color || '#07c160'
  document.documentElement.style.setProperty('--scrm-primary', primary)
  if (tenant.name) {
    document.title = tenant.name
  }
  // #endif
}

/**
 * 初始化租户上下文
 *
 * 触发远程拉取的条件（任一）：force / 无缓存 / 域名变化 / 缓存过期。
 * 否则复用本地缓存。拉取失败不阻塞 App，用兜底值渲染。
 */
async function initTenant(force = false): Promise<void> {
  const domain = getCurrentDomain()

  if (!force) {
    const cached = readCache(domain)
    if (cached) {
      state.tenant = cached.tenant
      state.loginConfig = cached.loginConfig
      state.loaded = true
      state.ready = true
      applyBranding(cached.tenant)
      return
    }
  }

  try {
    const [tenant, loginConfig] = await Promise.all([resolveTenant(), getLoginConfig()])
    state.tenant = tenant
    state.loginConfig = loginConfig
    state.loaded = true
    writeCache({ domain, fetchedAt: Date.now(), tenant, loginConfig })
    applyBranding(tenant)
  } catch {
    // 兜底：租户信息加载失败，不阻塞 App
    state.loaded = false
  } finally {
    state.ready = true
  }
}

/**
 * 等待租户初始化完成（轮询 state.ready）
 *
 * App.vue onLaunch 已触发 initTenant，页面侧仅需等待结果。
 * 超时不抛错，由调用方按兜底逻辑处理。
 */
function waitReady(timeout = 3000): Promise<void> {
  return new Promise((resolve) => {
    if (state.ready) {
      resolve()
      return
    }
    const start = Date.now()
    const timer = setInterval(() => {
      if (state.ready || Date.now() - start > timeout) {
        clearInterval(timer)
        resolve()
      }
    }, 50)
  })
}

export const useTenantStore = () => ({
  state: readonly(state),
  initTenant,
  waitReady,
})
