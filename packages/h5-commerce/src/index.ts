/**
 * @scrm/h5-commerce — 交易域 H5 共享包
 *
 * 内容：
 * - config：运行时配置（API 前缀 / 页面路径）
 * - api：商品/订单/课程/积分兑换请求封装 + 类型
 * - utils：支付唤起（invokePayment / pollUntil）
 * - components：NavBar / 商品卡片 / SKU 选择器
 * - views：商城列表/详情、课程广场/详情/学习、积分兑换区块（整页组件）
 *
 * 宿主接入：
 * 1. main.ts 中 configureH5Commerce({ apiPrefix: 'scrm' })（scrm 项目；新商城可省略）
 * 2. pages.json 注册薄壳页面，页面内 import 并渲染 views 组件
 */

// 配置
export * from './config'

// 请求封装
export { request } from './request'

// API
export * from './api/shop'
export * from './api/course'
export * from './api/exchange'

// 工具
export { invokePayment, pollUntil } from './utils/payment'

// 组件
export { default as CommerceNavBar } from './components/NavBar.vue'
export { default as ProductCard } from './components/ProductCard.vue'
export { default as SkuSelector } from './components/SkuSelector.vue'

// 整页视图
export { default as ShopListView } from './views/ShopListView.vue'
export { default as ShopDetailView } from './views/ShopDetailView.vue'
export { default as CourseListView } from './views/CourseListView.vue'
export { default as CourseDetailView } from './views/CourseDetailView.vue'
export { default as CourseLearnView } from './views/CourseLearnView.vue'
export { default as PointsExchangeBlock } from './views/PointsExchangeBlock.vue'
