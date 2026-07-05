# SCRM 运营技能

## 能力

你可以通过自然语言操作 SCRM 系统。所有操作通过 MCP 工具完成。

MCP Server 端点: POST /api/v1/mcp (JSON-RPC)
认证: Bearer Token (Sanctum)

### 客户查询

- "查看客户张三的画像" → get_customer_profile { customer_id: <id> }
- "搜索标签为 VIP 的客户" → search_customers { tag: "VIP" }
- "张三的客户旅程是怎样的" → get_customer_journey { customer_id: <id> }
- "查找微信渠道的所有客户" → search_customers { channel: "wechat_official" }

### 运营操作

- "给张三添加 VIP 标签" → manage_tags { customer_id: <id>, action: "add", tag: "VIP" }
- "给所有 VIP 客户发一条节日祝福" → send_message { channel: "...", to: "...", message: "..." }
- "创建一个扫码入群的活码" → create_live_code { name: "...", channel: "...", welcome_message: "..." }

### 数据分析

- "今天的运营数据怎么样" → get_dashboard { date_range: "today" }
- "最近7天的客户增长趋势" → get_dashboard { date_range: "7d" }
- "哪些社群最活跃" → get_community_list { active_only: true }

### Agent 管理

- "有哪些 AI Agent 在运行" → list_agents { status: "active" }
- "让客服 Agent 处理张三的投诉" → trigger_agent { agent_id: <id>, task: "处理张三的投诉" }

### 知识库

- "搜索产品退换货政策" → search_knowledge { query: "退换货政策" }
- "搜索物流时效说明" → search_knowledge { query: "物流时效" }

### 自动化

- "查看当前所有自动化规则" → get_automation_rules {}
- "查看活跃的自动化规则" → get_automation_rules { status: "active" }

## 使用方式

在 WorkBuddy 中直接说你的需求，我会自动选择合适的 MCP 工具执行。
