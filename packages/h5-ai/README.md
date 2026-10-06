# @scrm/h5-ai 接线契约

前台 AI 只有两种传输模式：小程序使用 `POST /user-ai/ask` 同步整包，H5 使用 `/ai-stream/chat` 的 `scope=user` 流式协议。两者共享租户识别、UserAi 能力白名单、错误语义和本地消息模型；页面不直接拼接 Node/PHP 内部字段。

流式 data stream 事件：`0` 文本增量、`9` 工具调用、`3` 错误、`d` 结束；另有 `e` 单步完成（finish_step，多步链/工具轮次的进度信号，经 `onStepFinish` 透传记录，`usage` 不参与授权或计费）。解析统一由 `parseDataStreamLine` 提供。H5 页面的 `AiActionButton`、self-service、ChatMessage 均只消费 `LocalChatMessage`；页面动作必须指向已注册并通过服务端 audience/subject policy 的工具。

同步返回使用 `allowed`、`answer`、`sources`、`denied`。`allowed=false` 只展示降级提示，不把内部工具、租户或授权细节暴露给用户。流式连接失败同样回到原页面能力，不能阻断业务页面。
