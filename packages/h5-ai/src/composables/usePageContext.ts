/// <reference types="@dcloudio/types" />
/**
 * usePageContext — 采集当前 H5 页面上下文
 *
 * uni-app 无 vue-router 的响应式 route，改用 getCurrentPages() 读页面栈顶：
 *  - route：pages/my/orders → 'my.orders'（去 pages/ 前缀，点分）
 *  - module：取路径有意义的一段转 PascalCase（orders → Order）
 * 页面可显式传入 entity/表单等补充字段（覆盖推断值）。
 */
import { getAIConfig } from '../config'
import type { PageContext } from '../types'

/** 页面可补充的上下文（业务实体、表单、数据摘要、会话/员工定向） */
export interface PageContextExtras {
  entity_type?: string | null
  entity_id?: number | null
  form_state?: Record<string, any>
  visible_data_summary?: string
  conversation_id?: number | null
  agent_id?: number | string | null
}

/** pages/my/orders → my.orders；根/首页回落 'index' */
function routeToDotted(route: string): string {
  const seg = route
    .replace(/^pages\//, '')
    .replace(/^index\/index$/, 'index')
    .split('/')
    .filter(Boolean)
  return seg.length ? seg.join('.') : 'index'
}

/** 从路径最后业务段推断模块名（orders → Order、wrong → Wrong） */
function inferModule(route: string): string {
  const segs = route
    .replace(/^pages\//, '')
    .split('/')
    .filter(Boolean)
  const seg = segs[segs.length - 1] || 'index'
  const singular = seg.replace(/ies$/, 'y').replace(/s$/, '')
  return singular.charAt(0).toUpperCase() + singular.slice(1)
}

/** 读页面栈顶的 route + options */
function readCurrentPage(): { route: string; options: Record<string, any> } {
  try {
    const pages = getCurrentPages()
    const page = pages[pages.length - 1] as any
    if (!page) return { route: '', options: {} }
    return { route: String(page.route || ''), options: page.options || {} }
  } catch {
    return { route: '', options: {} }
  }
}

export function usePageContext() {
  /** 采集当前页面上下文；extras 覆盖推断值 */
  function pageContext(extras: PageContextExtras = {}): PageContext {
    const { route, options } = readCurrentPage()
    const idFromOptions = options.id != null ? Number(options.id) : null

    return {
      route: routeToDotted(route),
      module: inferModule(route),
      entity_type: extras.entity_type ?? null,
      entity_id: extras.entity_id ?? idFromOptions ?? null,
      form_state: extras.form_state,
      visible_data_summary: extras.visible_data_summary ?? '',
      user_intent: null,
      conversation_id: extras.conversation_id ?? null,
      agent_id: extras.agent_id ?? null,
    }
  }

  /** 是否已登录（供入口按钮决定是否显示 AI 能力） */
  function isLoggedIn(): boolean {
    try {
      return !!uni.getStorageSync(getAIConfig().tokenKey)
    } catch {
      return false
    }
  }

  return { pageContext, isLoggedIn }
}
