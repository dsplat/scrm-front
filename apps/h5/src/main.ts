import { createSSRApp } from 'vue'
import { configureH5Commerce } from '@scrm/h5-commerce'
import App from './App.vue'

// 交易域 H5 包接入：scrm 后端路由前缀为 'scrm'（生产 URL 零变更）
configureH5Commerce({ apiPrefix: 'scrm' })

// 兼容旧 hash 链接：#/pages/xxx → /h5/pages/xxx（history 路由切换后旧分享链接重定向）
// #ifdef H5
if (typeof location !== 'undefined' && location.hash.startsWith('#/pages/')) {
  location.replace('/h5/' + location.hash.slice(2))
}
// #endif

export function createApp() {
  const app = createSSRApp(App)
  return {
    app,
  }
}
