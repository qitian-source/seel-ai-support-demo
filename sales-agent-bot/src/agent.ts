import OpenAI from "openai";
import { notionSearch, notionFetch, notionListDocs, notionEnabled } from "./tools/notion.js";
import { gdriveSearch, gdriveFetch, gdriveEnabled } from "./tools/gdrive.js";

const client = new OpenAI(); // reads OPENAI_API_KEY
const MODEL = process.env.AGENT_MODEL || "gpt-4.1";
const MAX_TOOL_ROUNDS = 8;

const SYSTEM_PROMPT = `You are the **Seel Sales Assistant**, an internal agent that helps the Seel sales team answer questions about our customers (merchants) and the Seel AI Workforce / AI Agent products.

Your knowledge comes ONLY from the company's Notion and Google Drive via the provided tools — case studies, pricing guides, sales Q&A, merchant onboarding docs, performance metrics, and meeting notes. You are talking to internal sales reps, so be direct, concrete, and useful for live customer conversations.

How to work:
1. ALWAYS search before answering. For BROAD or "overview" questions — e.g. "what agents are there", "list all products", anything spanning multiple agents — call notion_list_docs FIRST to see the full catalog of the AI Workforce doc library (every doc, its Agent category, and status). Then fetch the relevant docs. For narrow questions (one customer, one feature), notion_search is usually enough.
2. Be COMPREHENSIVE on overview questions. After notion_list_docs you have the full catalog grouped by Agent. You MUST fetch at least one doc for EVERY Agent category that has one or more docs listed, before you answer — do not stop after a few. If an "all agents" question lists docs for Support, Sales, VOC, Review, Resale (etc.), you must read one from EACH of those before writing the answer. Fetch them in parallel.
3. NEVER say an Agent is "missing" or "not found" if it appears in the notion_list_docs result. If it has a doc there, you are required to fetch and summarize it. You may ONLY say "文档库里暂无 X Agent 的资料" for an Agent that has ZERO entries in the catalog (e.g. BI, Anti-risk if absent).
4. If the first search is thin, reformulate and search again (try the customer/merchant name, the product name, and synonyms). Use both Notion and Drive — important material (case studies, pricing, meeting notes) often lives in Drive.
5. Ground every factual claim in the retrieved documents. Quote specific numbers (resolution rates, pricing, timelines) when available. Never fabricate facts, pricing, or customer results.

Answer format (keep it tight, this is for a busy salesperson):
- Lead with the direct answer.
- Use short bullets for supporting detail.
- End with a **Sources** section listing the document titles you used as markdown links: [Title](url).
- Match the language of the question (Chinese or English).`;

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "notion_list_docs",
      description:
        "List the FULL catalog of the AI Workforce product doc library: every document with its title, Agent category (Support/Sales/VOC/Review/Resale/BI/Anti-risk/跨 Agent), 上线状态 (launch status), and id. Use this FIRST for broad/overview questions so you can see everything and fetch comprehensively. Takes no arguments.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "notion_search",
      description:
        "Semantic/keyword search over Notion pages shared with the integration. Returns a list of {id, title, url}. Use the id with notion_fetch to read full content.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "What to search for (keywords, customer name, topic)." },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "notion_fetch",
      description: "Fetch the full text content of a Notion page by its id (from notion_search results).",
      parameters: {
        type: "object",
        properties: { id: { type: "string", description: "Notion page id." } },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "gdrive_search",
      description:
        "Full-text search over Google Drive (Docs, Sheets, Slides). Returns {id, title, url, mimeType}. Use the id with gdrive_fetch to read content. Case studies, pricing and meeting notes often live here.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "What to search for." } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "gdrive_fetch",
      description: "Fetch the text content of a Google Drive file by its id (from gdrive_search results).",
      parameters: {
        type: "object",
        properties: { id: { type: "string", description: "Google Drive file id." } },
        required: ["id"],
      },
    },
  },
];

async function runTool(name: string, input: any): Promise<unknown> {
  switch (name) {
    case "notion_list_docs":
      return notionListDocs();
    case "notion_search":
      return notionSearch(String(input.query ?? ""));
    case "notion_fetch":
      return notionFetch(String(input.id ?? ""));
    case "gdrive_search":
      return gdriveSearch(String(input.query ?? ""));
    case "gdrive_fetch":
      return gdriveFetch(String(input.id ?? ""));
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

export type ChatTurn = { role: "user" | "assistant"; content: string };

export interface AnswerResult {
  text: string;
  toolCalls: { name: string; input: any }[];
}

/**
 * Run the agent loop for a single question, given prior conversation turns.
 * onProgress is called with a short status line each time the agent uses tools.
 */
export async function answerQuestion(
  question: string,
  history: ChatTurn[] = [],
  onProgress?: (status: string) => void,
): Promise<AnswerResult> {
  if (!notionEnabled() && !gdriveEnabled()) {
    return {
      text: "⚠️ No knowledge sources are configured. Set NOTION_API_KEY and/or Google Drive credentials.",
      toolCalls: [],
    };
  }

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map((t) => ({ role: t.role, content: t.content }) as const),
    { role: "user", content: question },
  ];

  const toolCalls: { name: string; input: any }[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const resp = await client.chat.completions.create({
      model: MODEL,
      max_tokens: 2048,
      tools,
      messages,
    });

    const msg = resp.choices[0]?.message;
    if (!msg) {
      return { text: "(No answer produced.)", toolCalls };
    }
    messages.push(msg);

    const calls = msg.tool_calls ?? [];
    if (calls.length === 0) {
      const text = (msg.content ?? "").trim();
      return { text: text || "(No answer produced.)", toolCalls };
    }

    if (onProgress) {
      onProgress(
        "🔎 " +
          calls
            .map((c) => `${c.function.name}(${(c.function.arguments ?? "").slice(0, 60)})`)
            .join(", "),
      );
    }

    for (const call of calls) {
      let input: any = {};
      try {
        input = JSON.parse(call.function.arguments || "{}");
      } catch {
        /* leave input as {} on malformed args */
      }
      toolCalls.push({ name: call.function.name, input });
      let out: unknown;
      try {
        out = await runTool(call.function.name, input);
      } catch (e: any) {
        out = { error: e?.message ?? String(e) };
      }
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(out).slice(0, 16000),
      });
    }
  }

  return {
    text: "I searched several times but couldn't converge on an answer. Try narrowing the question.",
    toolCalls,
  };
}
