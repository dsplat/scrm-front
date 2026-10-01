import { createSSRApp } from 'vue'
import { configureH5Commerce } from '@scrm/h5-commerce'
import { configureH5AI } from '@scrm/h5-ai'
import App from './App.vue'

// 交易域 H5 包接入：scrm 后端路由前缀为 'scrm'（生产 URL 零变更）
// apiBase 必须与 utils/request.ts 同源：小程序构建注入的是绝对 base（wx.request
// 不认同域相对路径），而 commerce 包默认值是 '/api/v1' 相对路径，不覆盖则小程序内
// 交易域请求全部失败；H5 未注入 env 时回落同一默认值，行为零变更。
const apiBase = import.meta.env.VITE_API_BASE || '/api/v1'

configureH5Commerce({
  apiPrefix: 'scrm',
  apiBase,
})

// AI 助手包接入（BL-030a）：复用后端 Node SSE 引擎 /ai-stream/chat，后端零改动。
// H5 与后端同源，streamEndpoint 用相对路径；小程序无同源，从注入的绝对 API 基址
// 取 origin 拼 /ai-stream/chat（wx.request 须绝对地址）。
const streamOrigin = /^https?:\/\/[^/]+/.exec(apiBase)
configureH5AI({
  apiBase,
  streamEndpoint: streamOrigin ? `${streamOrigin[0]}/ai-stream/chat` : '/ai-stream/chat',
})

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
