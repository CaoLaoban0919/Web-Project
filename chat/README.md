## 功能

- 网页端单人 AI 聊天
- OpenAI-compatible API 接入，可配置模型与接口地址
- 支持知识库文件上传与选择（Markdown / TXT）
- 支持会话历史持久化
- 支持联网搜索（Tavily，可选）
- 支持图片理解/多模态输入（取决于所接入模型能力）
- 支持通过斜杠命令调用本地图像生成服务（可选）
- 内置请求超时与熔断配置，减少上游异常时的卡死

## 特色

- 角色 Prompt 可配置，适合制作具有固定人设的聊天机器人
- 前后端结构简单，便于二次开发和部署
- 知识库按文件选择，适合临时加载不同资料
- 敏感信息通过 `.env` 管理，不应写入源码仓库

默认服务端口取决于 `.env` 中的 `PORT`，例如：

```text
http://127.0.0.1:3100
```

## systemd 示例

```ini
[Unit]
Description=AI Chat backend
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/Tang/chat
ExecStart=/usr/bin/node /home/Tang/chat/server.js
Restart=always
RestartSec=3
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```
