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
/* #ifdef H5 */
/* 主题色兜底：正常由租户品牌配置在 applyBranding 中覆盖 */
:root {
  --scrm-primary: #07c160;
  --scrm-primary-deep: #06ad56;
  --scrm-primary-soft: rgba(7, 193, 96, 0.08);
}
/* #endif */
</style>
