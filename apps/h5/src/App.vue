<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { useTenantStore } from './store/tenant'
import { captureReferral } from './utils/referral'

onLaunch(() => {
  // 应用初始化：按当前域名拉取租户品牌与登录配置（带本地缓存）
  const { initTenant } = useTenantStore()
  initTenant()
  // 捕获海报/邀请链接中的分销归因参数（ref），登录后绑定
  captureReferral()
})
onShow(() => {
  console.log('App Show')
})
onHide(() => {
  console.log('App Hide')
})
</script>

<style>
/* 主题色兜底。两端机制不同，不可合并：
   - H5：多租户共用同一份产物，构建期拿不到品牌色，这里只写兜底值（微信绿），
     运行时由 store/tenant.ts 的 applyBranding 按租户 branding 覆盖 :root。
   - 小程序：按租户单独构建，品牌色构建期即确定，由 vite.config.ts 的
     scrm-brand-theme 插件在 uni 条件编译前把下方 __SCRM_*__ 占位符替换成真实
     色值（算法同 utils/color.ts，与 H5 运行时 applyBranding 一致，杜绝双端色差）；
     小程序无 DOM，applyBranding 整个函数体被 #ifdef H5 排除，CSS 变量只能在此
     静态定义。刻意不引 sass：全项目仅此一处需派生色，纯字符串替换零依赖更稳。 */

/* #ifdef H5 */
:root {
  --scrm-primary: #07c160;
  --scrm-primary-deep: #06ae56;
  --scrm-primary-soft: rgba(7, 193, 96, 0.08);
}
/* #endif */

/* #ifndef H5 */
/* 选择器必须是 page：小程序不支持 :root，写成 :root 会让整块被编译器丢弃，
   全部 var(--scrm-primary) 引用（产物里约 90 处）解析失败，页面丢失所有主题色
   与背景，表现为「整体发白」。占位符由构建插件替换成真实色值；H5 构建下本块被
   条件编译移除，替换与否都不影响 H5。 */
page {
  --scrm-primary: __SCRM_PRIMARY__;
  --scrm-primary-deep: __SCRM_PRIMARY_DEEP__;
  --scrm-primary-soft: __SCRM_PRIMARY_SOFT__;
}
/* #endif */
</style>
