import { Client } from "@notionhq/client";

const notion = process.env.NOTION_API_KEY
  ? new Client({ auth: process.env.NOTION_API_KEY, notionVersion: "2022-06-28" })
  : null;

export const notionEnabled = () => notion !== null;

/** Pull plain text out of a Notion rich_text array. */
function richText(arr: any): string {
  if (!arr) return "";
  if (!Array.isArray(arr)) return typeof arr === "string" ? arr : "";
  return arr.map((t) => t?.plain_text ?? "").join("");
}

function titleOf(page: any): string {
  const props = page?.properties ?? {};
  for (const key of Object.keys(props)) {
    const p = props[key];
    if (p?.type === "title") return richText(p.title) || "Untitled";
  }
  // Fallback for databases / workspace search results
  if (page?.title) return richText(page.title) || "Untitled";
  return "Untitled";
}

/**
 * Search Notion pages/databases shared with the integration.
 * Returns a compact list the model can scan, with ids to fetch.
 */
export async function notionSearch(query: string, pageSize = 8) {
  if (!notion) return { error: "Notion is not configured (NOTION_API_KEY missing)." };
  const res = await notion.search({
    query,
    page_size: pageSize,
    sort: { direction: "descending", timestamp: "last_edited_time" },
  });
  const results = (res.results as any[]).map((r) => ({
    id: r.id,
    type: r.object, // "page" | "database"
    title: titleOf(r),
    url: r.url,
    last_edited: r.last_edited_time,
  }));
  return { results };
}

/** Read a select / status / title / url property regardless of name. */
function propValue(p: any): string {
  if (!p) return "";
  switch (p.type) {
    case "title":
      return richText(p.title);
    case "rich_text":
      return richText(p.rich_text);
    case "select":
      return p.select?.name ?? "";
    case "status":
      return p.status?.name ?? "";
    case "url":
      return p.url ?? "";
    default:
      return "";
  }
}

/**
 * List every doc in the central "AI Workforce 产品文档库" database, grouped so
 * the model can see the FULL catalog (title, Agent category, status, url) and
 * pick comprehensively — or report honestly that an Agent has no docs.
 * Falls back gracefully if the DB id isn't reachable.
 */
export async function notionListDocs() {
  if (!notion) return { error: "Notion is not configured (NOTION_API_KEY missing)." };
  const dbId = process.env.NOTION_DOC_DB_ID || "b1d6c5101c278224947681c1f1d90a13";
  try {
    const res: any = await notion.request({
      path: `databases/${dbId}/query`,
      method: "post",
      body: { page_size: 100 },
    });
    const docs = (res.results as any[]).map((r) => {
      const props = r.properties ?? {};
      let title = "Untitled";
      for (const k of Object.keys(props)) {
        if (props[k]?.type === "title") title = propValue(props[k]) || "Untitled";
      }
      return {
        id: r.id,
        title,
        agent: propValue(props["Agent"]),
        status: propValue(props["上线状态"]),
        url: r.url,
      };
    });
    return { count: docs.length, docs };
  } catch (e: any) {
    return { error: `Could not list the doc library (${e?.message ?? e}). Fall back to notion_search.` };
  }
}

/** Convert one block to a markdown-ish line. */
function blockToText(b: any): string {
  const t = b.type;
  const data = b[t];
  switch (t) {
    case "paragraph":
      return richText(data?.rich_text);
    case "heading_1":
      return "# " + richText(data?.rich_text);
    case "heading_2":
      return "## " + richText(data?.rich_text);
    case "heading_3":
      return "### " + richText(data?.rich_text);
    case "bulleted_list_item":
      return "- " + richText(data?.rich_text);
    case "numbered_list_item":
      return "1. " + richText(data?.rich_text);
    case "to_do":
      return `- [${data?.checked ? "x" : " "}] ` + richText(data?.rich_text);
    case "toggle":
      return "▸ " + richText(data?.rich_text);
    case "quote":
      return "> " + richText(data?.rich_text);
    case "callout":
      return "💡 " + richText(data?.rich_text);
    case "code":
      return "```\n" + richText(data?.rich_text) + "\n```";
    case "table_row":
      return "| " + (data?.cells ?? []).map((c: any[]) => richText(c)).join(" | ") + " |";
    case "child_page":
      return "📄 " + (data?.title ?? "");
    case "divider":
      return "---";
    default:
      return richText(data?.rich_text);
  }
}

/** Recursively read a block's children into text, with a hard cap. */
async function readChildren(blockId: string, depth: number, budget: { left: number }): Promise<string[]> {
  if (depth > 3 || budget.left <= 0 || !notion) return [];
  const out: string[] = [];
  let cursor: string | undefined;
  do {
    const res: any = await notion.blocks.children.list({
      block_id: blockId,
      page_size: 100,
      start_cursor: cursor,
    });
    for (const b of res.results as any[]) {
      const line = blockToText(b).trim();
      if (line) {
        out.push("  ".repeat(depth) + line);
        budget.left -= line.length;
      }
      if (b.has_children && budget.left > 0) {
        out.push(...(await readChildren(b.id, depth + 1, budget)));
      }
      if (budget.left <= 0) {
        out.push("…(truncated)");
        return out;
      }
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return out;
}

/** Fetch a Notion page's full text content by id. */
export async function notionFetch(pageId: string, maxChars = 12000) {
  if (!notion) return { error: "Notion is not configured (NOTION_API_KEY missing)." };
  const id = pageId.replace(/-/g, "").trim();
  let title = "Untitled";
  let url = `https://notion.so/${id}`;
  try {
    const page: any = await notion.pages.retrieve({ page_id: pageId });
    title = titleOf(page);
    url = page.url ?? url;
  } catch {
    // Might be a database id; ignore and just read children.
  }
  const lines = await readChildren(pageId, 0, { left: maxChars });
  return { id: pageId, title, url, content: lines.join("\n") };
}
