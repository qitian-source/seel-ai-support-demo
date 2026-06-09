# 部署 Seel Sales Assistant（Slack bot）

这个 bot 用 **Socket Mode**，不需要公网域名/端口，是一个长期运行的 worker。
下面以 **Railway** 为例（最省心）；Render / Fly.io / 任何支持 Docker 的平台同理。

## 前置：代码已在 GitHub

代码在仓库 `qitian-source/seel-ai-support-demo` 的 `sales-agent-bot/` 子目录。
`.env` 不会进 git（已被忽略）——**密钥一律在云平台的环境变量里填**。

## Railway 步骤

1. 打开 https://railway.app → 用 **GitHub 登录**
2. **New Project** → **Deploy from GitHub repo** → 选 `seel-ai-support-demo`
3. 进项目 → **Settings**：
   - **Root Directory** 设为 `sales-agent-bot`
   - 构建方式会自动识别 `Dockerfile`（本目录已带）
4. **Variables**（环境变量）里逐条加入：

   | 变量 | 值 |
   |------|-----|
   | `OPENAI_API_KEY` | 你的 OpenAI key（`sk-...`） |
   | `AGENT_MODEL` | `gpt-4.1` |
   | `NOTION_API_KEY` | Notion integration token（`ntn_...`） |
   | `NOTION_DOC_DB_ID` | 文档库数据库 id（拿到 Seel 正式库后换成它） |
   | `SLACK_BOT_TOKEN` | `xoxb-...` |
   | `SLACK_APP_TOKEN` | `xapp-...` |

5. **Deploy**。部署日志里看到 `⚡️ Seel Sales Assistant is running (Socket Mode).` 就成功了。

## 验证

在 Slack 的 `#ai-workforce-sales-helper` 里 `@Seel Sales Assistant 你的问题`，能回答即上线成功。

## 之后换 Notion 正式库（无需改代码）

拿到 Seel 工作空间的 token 后，只在 Railway 的 Variables 里改两个值并重新部署：
- `NOTION_API_KEY` → Seel 的 `ntn_...`
- `NOTION_DOC_DB_ID` → 正式文档库的数据库 id

## 本地长期运行（备选，免上云）

```bash
npm i -g pm2
cd sales-agent-bot
pm2 start "pnpm start" --name seel-sales-bot
pm2 save && pm2 startup   # 开机自启
```
注意：电脑关机/休眠时 bot 会下线。
