很荣幸在此发布Chat_web的相关代码，也感谢你使用chat_web

一、版本亮点
1. 全新简洁架构
- 使用 Node.js + Express 重写后端
- 移除旧版复杂 Socket.IO 房间逻辑
- 改为更轻量的单人网页聊天模式
- 更适合个人服务器和私有部署场景

2. 支持文本聊天
- 支持 OpenAI-compatible Chat Completions 接口
- 可通过环境变量配置模型、接口地址和 API Key
- 默认适合接入 gpt-5.5 或其他兼容模型

3. 支持图片理解
- 前端支持上传图片
- 后端使用 Multer 处理图片输入
- 可将图片与文本一起发送给支持视觉能力的模型
- 适合进行截图分析、图片问答、OCR 辅助理解等场景

4. 本地聊天记录持久化
- 会话数据保存到服务器本地
- 页面重新打开后可继续读取历史记录
- 支持按 sessionId 拉取历史
- 重置会话时同步清理对应本地记录

5. 知识库上传与选择
- 支持上传 .md / .txt 文件作为知识库
- 单文件大小限制约 2MB
- 最多支持选择多个知识库文件
- 发送消息时可选择本次对话使用哪些知识库
- 未选择时可默认使用全部知识库内容

6. 联网搜索支持
- 支持 Tavily Search 联网搜索
- 前端提供“启用联网搜索”开关
- 搜索状态保存在浏览器 localStorage
- 开启后，后端会将搜索结果摘要加入上下文
- 适合需要最新信息的问题

7. 安全与部署优化
- 使用 Helmet 增强基础 HTTP 安全头
- API Key 仅保存在服务器端 .env
- 前端代码不包含真实密钥
- 支持通过 Nginx Basic Auth 保护访问入口
- 适合部署在 /chat/ 子路径下

二、主要功能

- 文本 AI 对话
- 图片理解/视觉输入
- 本地会话持久化
- 会话重置
- Markdown/TXT 知识库上传
- 知识库文件选择
- Tavily 联网搜索
- 健康检查接口
- OpenAI-compatible API 接入
- Nginx 子路径反向代理部署

三、接口说明
1. 健康检查

GET /chat/api/health

返回服务状态、模型信息及功能开关状态。

2. 聊天接口

POST /chat/api/chat

用于发送用户消息、图片、知识库选择和联网搜索开关。

3. 历史记录

GET /chat/api/history?sessionId=xxx

根据 sessionId 读取本地保存的聊天历史。

4. 重置会话

POST /chat/api/reset

清理当前会话的内存记录和本地持久化记录。

5. 知识库文件列表

GET /chat/api/kb/files

返回当前可用知识库文件列表。

6. 上传知识库

POST /chat/api/kb/upload

上传 .md 或 .txt 知识库文件。

四、环境变量

请复制 .env.example 为 .env：

cp .env.example .env

常见配置项：

PORT=3100
OPENAI_API_KEY=your_api_key
OPENAI_BASE_URL=https://your-api-endpoint/v1
OPENAI_MODEL=gpt-5.5
TAVILY_API_KEY=your_tavily_key
WEB_SEARCH_MAX_RESULTS=5

注意：
- 不要提交 .env 到 GitHub
- 不要把真实 API Key 写入前端
- 不要把聊天记录、上传文件或知识库隐私内容提交到仓库

五、安装与运行

1. 安装依赖

cd chat
npm install

2. 配置环境变量

cp .env.example .env
nano .env

3. 启动服务

npm start

默认建议监听：

127.0.0.1:3100

4. 使用 Nginx 反向代理

可将外部路径 /chat/ 代理到本地服务：

/chat/ -> http://127.0.0.1:3100/

建议同时启用 HTTPS 和访问认证。

六、推荐 systemd 服务

可以使用 systemd 托管服务，示例：

[Unit]
Description=caolaobancloud Chat
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/path/to/chat
ExecStart=/usr/bin/node /path/to/chat/server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3100
EnvironmentFile=/path/to/chat/.env

[Install]
WantedBy=multi-user.target

七、安全提醒

发布到 GitHub 前请确认：

- .env 已加入 .gitignore
- data/ 会话记录目录未提交
- uploads/ 上传目录未提交
- node_modules/ 未提交
- 没有真实 sk- 开头 API Key
- 没有真实 Tavily API Key
- 没有服务器密码或 Basic Auth 密码
- 没有用户聊天隐私内容
- 没有个人知识库隐私文件

八、适用场景

- 个人 AI 聊天网页
- 私有服务器 AI 助手
- 支持图片理解的轻量 ChatGPT Web
- 带知识库的个人问答系统
- 带联网搜索的私人 AI 工具站
- Nginx 子路径部署的多功能 AI 网站

九、兼容性说明

本项目使用 OpenAI-compatible 接口设计，只要后端服务兼容 Chat Completions 格式，就可以通过配置环境变量接入不同模型服务。

图片理解功能需要模型本身支持视觉输入。

联网搜索功能依赖 Tavily API Key，如果不配置 Tavily，也可以仅使用普通聊天和知识库功能。

十、更新摘要

v1.0.0

新增：
- 重写 Chat 后端架构
- 新增图片理解
- 新增本地聊天记录持久化
- 新增知识库上传与选择
- 新增 Tavily 联网搜索
- 新增健康检查功能开关
- 新增更适合 /chat/ 子路径部署的前端逻辑

优化：
- 去除旧版 Socket.IO 房间逻辑
- 简化部署方式
- API Key 改为服务端环境变量读取
- 前端状态保存到 localStorage
- 更适合个人服务器长期运行

安全：
- 移除硬编码密钥
- 增加 .env.example
- 增加 .gitignore 建议
- 避免提交运行时数据和用户隐私内容
