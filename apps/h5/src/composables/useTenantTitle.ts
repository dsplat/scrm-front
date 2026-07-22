import { onShow } from '@dcloudio/uni-app'
import { useTenantStore } from '../store/tenant'
import { setDocumentTitle } from '../utils/platform'

/**
 * 页面级租户标题同步
 *
 * 微信内置浏览器复用原生导航栏，其读取 document.title。
 * uni-app H5 路由切换时会按 pages.json 的 navigationBarTitleText 设置标题，
 * 且该设置发生在页面 onShow 之后的微任务/渲染阶段，故 nextTick 仍可能早于它。
 * 这里在 onShow 后用短延时宏任务（setTimeout）覆盖，确保租户名最终生效，
 * 让微信原生栏始终显示租户名。
 *
 * 用法：在页面 <script setup> 中调用 `useTenantTitle()` 即可（一行接入）。
 */
export function useTenantTitle(): void {
  const { state } = useTenantStore()
  const apply = () => {
    const name = state.tenant?.name
    if (name) setDocumentTitle(name)
  }
  onShow(() => {
    // 宏任务延时：晚于 uni-app 路由切换时按 pages.json 设置标题的时机
    setTimeout(apply, 50)
  })
}
