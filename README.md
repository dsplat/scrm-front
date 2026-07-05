# SCRM Platform Front

SCRM 前端工程 - 运营台 (ops-console) + C 端应用 (uni-app) + 共享类型包

## 仓库结构

- apps/ops-console/ - SCRM 运营台 (Vue3 + Element Plus + Vite)
- packages/shared/ - 共享类型、枚举、API Client

## 开发

pnpm install          # 安装依赖
pnpm dev:ops          # 启动运营台开发服务器 (localhost:5174)
pnpm gen:types        # 从 Swagger 生成 TypeScript 类型
pnpm build:ops        # 构建运营台 (输出到 scrm-platform/public/scrm-console/)

## 技术栈

- Vue 3 + TypeScript + Vite
- Element Plus (直接使用，不走框架 ui-core 适配层)
- Pinia (客户端状态)
- TanStack Vue Query (服务端状态)
- Vue Router (路由)
- ECharts (图表)
- Axios (HTTP 客户端)
