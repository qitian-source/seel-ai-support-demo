# Seel Sales Assistant — Slack bot

An internal Slack agent that helps the sales team answer questions about
**customers (merchants)** and the **Seel AI Workforce / AI Agent**, grounded in
the company's **Notion + Google Drive** knowledge base.

It uses *agentic RAG*: Claude decides what to search, reads the most relevant
docs, and answers with source links — instead of a fixed retrieval pipeline.

```
Slack (@mention / DM)
        │
        ▼
   agent loop (Claude)  ──tools──▶  notion_search / notion_fetch
        │                          gdrive_search / gdrive_fetch
        ▼
   answer + Sources, posted in-thread
```

## Quick start

```bash
cd sales-agent-bot
pnpm install            # or: npm install
cp .env.example .env    # then fill in the keys
```

### 1. Test the knowledge retrieval WITHOUT Slack

You only need `OPENAI_API_KEY` + `NOTION_API_KEY` (and/or Google creds):

```bash
pnpm run ask "Govee 用了 Seel AI Workforce 之后解决率是多少？"
pnpm run ask "What's the pricing model for the AI Workforce?"
```

This runs the full agent loop and prints the answer + sources. Best way to
sanity-check that the bot can see your docs before wiring up Slack.

### 2. Run the Slack bot

```bash
pnpm start        # or pnpm dev for watch mode
```

## Configuration

All config is via `.env` (see `.env.example`). Summary:

| Source | Var | Notes |
|--------|-----|-------|
| OpenAI | `OPENAI_API_KEY` | required |
| OpenAI | `AGENT_MODEL` | optional, default `gpt-4.1`; any function-calling model works (e.g. `gpt-4o`) |
| Slack | `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN` | required only to run the bot |
| Notion | `NOTION_API_KEY` | optional but recommended |
| Google Drive | `GOOGLE_SERVICE_ACCOUNT_JSON` *or* `GOOGLE_APPLICATION_CREDENTIALS` | optional |

The bot works with **either** Notion or Drive (or both). Whatever you leave
unconfigured is simply skipped.

### Notion setup

1. Create an internal integration at <https://www.notion.so/my-integrations>,
   copy the secret into `NOTION_API_KEY`.
2. **Connect** the integration to the pages/teamspaces it should read
   (in Notion: page `•••` → *Connections* → add your integration). The bot can
   only see what the integration is connected to.

### Google Drive setup

1. In Google Cloud: create a project, **enable the Drive API**, create a
   **service account**, download its JSON key.
2. Provide the key via `GOOGLE_SERVICE_ACCOUNT_JSON` (single-line JSON) or
   `GOOGLE_APPLICATION_CREDENTIALS` (file path).
3. Give it access to your docs, either:
   - **Share** the relevant Drive folders with the service account's email, or
   - enable **domain-wide delegation** and set `GOOGLE_IMPERSONATE_SUBJECT` to a
     user whose Drive should be searched.

### Slack app setup

1. Create an app at <https://api.slack.com/apps> → **From scratch**.
2. **Socket Mode** → enable. Create an **App-Level Token** with
   `connections:write` → that's `SLACK_APP_TOKEN` (`xapp-…`).
3. **OAuth & Permissions** → add Bot Token Scopes:
   `app_mentions:read`, `chat:write`, `channels:history`, `groups:history`,
   `im:history`, `im:read`, `im:write`, `reactions:write`. Install to workspace →
   copy the **Bot User OAuth Token** (`xoxb-…`) into `SLACK_BOT_TOKEN`.
4. **Event Subscriptions** → enable, subscribe to bot events:
   `app_mention`, `message.im`.
5. Invite the bot to a channel, then `@SeelSalesAssistant <your question>`, or DM it.

## Notes

- **Conversation memory** is per-thread and in-process; it resets on restart.
- Powered by OpenAI (default `gpt-4.1`) with function calling; the agent decides
  what to search and reads docs before answering.
- Tighten or expand the agent's behavior by editing `SYSTEM_PROMPT` in
  [`src/agent.ts`](src/agent.ts).
