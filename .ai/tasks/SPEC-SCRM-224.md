# SPEC-SCRM-224: ScrmMcpToolRegistry 升级 + 多客户端 Skill 集成

**阶段：** Phase 5: MCP 工具注册
**来源：** requirement-scrm-supplement
**依赖：** SPEC-SCRM-001, SPEC-SCRM-002

#### 产出物
scrm-platform: ScrmMcpToolRegistry 继承框架 McpToolRegistry + scrm-platform-front: skills/ 目录

#### 内容
- ScrmMcpToolRegistry 继承框架层 McpToolRegistry，注册 30+ SCRM 工具
- Route::mcp('scrm', ScrmMcpToolRegistry::class) 注册端点
- 前端 skills/ 目录引用 WorkBuddy/Hermers/OpenClaw 的 Skill 文件
- 验证三个客户端可从 /api/v1/mcp/{client}/skill 获取正确配置

#### 验收标准
MCP 端点正常响应，Skill 文件自动生成，三客户端配置正确
