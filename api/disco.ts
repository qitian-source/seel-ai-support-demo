import type { VercelRequest, VercelResponse } from "@vercel/node";

const BASE = "https://api.disconetwork.com/discobeat/reporting/v1";
const API_KEY = process.env.DISCO_API_KEY ?? "";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { endpoint, ...params } = req.query as Record<string, string>;
  if (!endpoint || !["summary", "publishers"].includes(endpoint)) {
    return res.status(400).json({ error: "Invalid endpoint" });
  }

  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined))
  ).toString();
  const url = `${BASE}/${endpoint}/${qs ? `?${qs}` : ""}`;

  try {
    const upstream = await fetch(url, {
      headers: { "X-Api-Key": API_KEY },
    });
    const data = await upstream.json();
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=60");
    return res.status(upstream.status).json(data);
  } catch (e) {
    return res.status(502).json({ error: "Upstream error" });
  }
}
