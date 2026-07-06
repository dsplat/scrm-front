# SPEC-SCRM-220: 定时触达 ScheduledReach.vue

**阶段：** Phase 5: 前端 - 触达运营
**来源：** requirement-scrm-supplement
**依赖：** 无

#### 产出物
apps/ops-console/src/views/scheduled-reach/ScheduledReach.vue + API composable + 路由注册

#### 内容
- 创建 ScheduledReach.vue 页面，路由: /scheduled-reach
- 使用 Element Plus 组件，遵循 ops-console 现有样式规范
- 创建对应的 API composable (use{name}.ts)，对接后端 API
- 实现列表页: 搜索/筛选/分页/排序
- 实现详情页/编辑页: 表单验证/提交
- 注册路由到 ops-console 路由表
- 更新侧边栏导航菜单

#### 验收标准
页面可正常渲染，API 对接正确，通过 Vite 编译
