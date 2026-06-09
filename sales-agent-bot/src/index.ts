import "dotenv/config";
import { App } from "@slack/bolt";
import { answerQuestion, type ChatTurn } from "./agent.js";
import { toSlackMrkdwn } from "./slack-format.js";

const required = ["SLACK_BOT_TOKEN", "SLACK_APP_TOKEN", "OPENAI_API_KEY"];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing required env vars: ${missing.join(", ")}`);
  console.error("Copy .env.example to .env and fill it in. (For Slack-free testing use: npm run ask)");
  process.exit(1);
}

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
});

// Per-thread conversation memory (in-process; resets on restart).
const memory = new Map<string, ChatTurn[]>();
const HISTORY_LIMIT = 8;

function cleanText(raw: string): string {
  // Strip the leading <@BOTID> mention and collapse whitespace.
  return raw.replace(/<@[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

async function handle(opts: {
  client: any;
  channel: string;
  threadTs: string;
  text: string;
}) {
  const { client, channel, threadTs, text } = opts;
  const question = cleanText(text);
  if (!question) return;

  // Post a placeholder so the user sees activity immediately.
  const placeholder = await client.chat.postMessage({
    channel,
    thread_ts: threadTs,
    text: "🔎 Searching Notion & Drive…",
  });

  const key = `${channel}:${threadTs}`;
  const history = (memory.get(key) ?? []).slice(-HISTORY_LIMIT);

  try {
    const { text: answer } = await answerQuestion(question, history, async (status) => {
      try {
        await client.chat.update({ channel, ts: placeholder.ts, text: status });
      } catch {
        /* best-effort progress update */
      }
    });

    await client.chat.update({
      channel,
      ts: placeholder.ts,
      text: toSlackMrkdwn(answer),
    });

    memory.set(key, [
      ...history,
      { role: "user", content: question },
      { role: "assistant", content: answer },
    ]);
  } catch (e: any) {
    console.error("Agent error:", e);
    await client.chat.update({
      channel,
      ts: placeholder.ts,
      text: `⚠️ Something went wrong: ${e?.message ?? e}`,
    });
  }
}

// @-mention in any channel
app.event("app_mention", async ({ event, client }) => {
  await handle({
    client,
    channel: event.channel,
    threadTs: (event as any).thread_ts ?? event.ts,
    text: event.text ?? "",
  });
});

// Direct messages to the bot
app.message(async ({ message, client }) => {
  const m = message as any;
  if (m.subtype || m.bot_id) return; // ignore edits, bot messages
  if (m.channel_type !== "im") return; // only DMs here (channels handled via mention)
  await handle({
    client,
    channel: m.channel,
    threadTs: m.thread_ts ?? m.ts,
    text: m.text ?? "",
  });
});

const port = Number(process.env.PORT) || 3010;
await app.start(port);
console.log("⚡️ Seel Sales Assistant is running (Socket Mode).");
