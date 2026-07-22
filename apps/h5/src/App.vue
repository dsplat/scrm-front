<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { useTenantStore } from './store/tenant'

onLaunch(() => {
  // 应用初始化：按当前域名拉取租户品牌与登录配置（带本地缓存）
  const { initTenant } = useTenantStore()
  initTenant()
})
onShow(() => {
  console.log('App Show')
})
onHide(() => {
  console.log('App Hide')
})
</script>
<style></style>
