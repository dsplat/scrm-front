import { createSSRApp } from 'vue'
import { configureH5Commerce } from '@scrm/h5-commerce'
import App from './App.vue'

// 交易域 H5 包接入：scrm 后端路由前缀为 'scrm'（生产 URL 零变更）
configureH5Commerce({ apiPrefix: 'scrm' })

export function createApp() {
  const app = createSSRApp(App)
  return {
    app,
  }
}
