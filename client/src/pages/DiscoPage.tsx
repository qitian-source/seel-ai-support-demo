/*
 * DiscoPage — Disco channel reporting dashboard
 * Live data from Disco Reporting API via /api/disco proxy
 * Sections: KPI summary (May vs June), Publisher breakdown table
 */
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, RefreshCw, AlertTriangle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from "recharts";

/* ── Types ── */
interface RawMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  channel_payout: number;
  revenue_with_email: number;
  revenue_without_email: number;
  sessions: number;
  feed_loads: number;
}
interface CalcMetrics { ctr: number; cvr: number; rps: number; rpl: number; }
interface SummaryResponse {
  channel_name: string;
  date_range: { from: string; to: string };
  available_window: { from: string; to: string };
  has_data: boolean;
  metrics: { raw: RawMetrics; calculated: CalcMetrics };
  data_freshness: string;
  generated_at: string;
}
interface Publisher {
  publisher_uuid: string;
  publisher_name: string;
  publisher_category: string;
  metrics: { raw: RawMetrics; calculated: CalcMetrics };
}
interface PublishersResponse {
  channel_name: string;
  date_range: { from: string; to: string };
  has_data: boolean;
  publishers: Publisher[];
  pagination: { total: number; offset: number; limit: number };
  data_freshness: string;
}

/* ── Fetch helpers ── */
async function fetchSummary(from: string, to: string): Promise<SummaryResponse> {
  const res = await fetch(`/api/disco?endpoint=summary&from=${from}&to=${to}`);
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}
async function fetchPublishers(from: string, to: string, offset = 0): Promise<PublishersResponse> {
  const res = await fetch(`/api/disco?endpoint=publishers&from=${from}&to=${to}&limit=50&offset=${offset}`);
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

/* ── KPI card ── */
function KpiCard({
  label, value, sub, delta, deltaUp,
}: { label: string; value: string; sub?: string; delta?: string; deltaUp?: boolean }) {
  return (
    <Card className="shadow-none border border-border">
      <CardContent className="pt-4 pb-4">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
        {delta && (
          <p className={cn("text-xs mt-1 flex items-center gap-1", deltaUp ? "text-emerald-600" : "text-red-500")}>
            {deltaUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {delta}
          </p>
        )}
        {sub && !delta && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

/* ── Date helpers ── */
function fmt(d: Date) { return d.toISOString().slice(0, 10); }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
const TODAY = new Date("2026-07-01");
const JUNE_FROM = "2026-06-01";
const JUNE_TO   = "2026-06-30";
const MAY_FROM  = "2026-05-01";
const MAY_TO    = "2026-05-31";

/* ── Percent change ── */
function pct(cur: number, prev: number) {
  if (!prev) return null;
  const v = ((cur - prev) / prev) * 100;
  return { str: `${v >= 0 ? "+" : ""}${v.toFixed(0)}% vs May`, up: v >= 0 };
}

/* ── Main ── */
export default function DiscoPage() {
  const [juneSummary, setJuneSummary]   = useState<SummaryResponse | null>(null);
  const [maySummary, setMaySummary]     = useState<SummaryResponse | null>(null);
  const [publishers, setPublishers]     = useState<Publisher[]>([]);
  const [pubTotal, setPubTotal]         = useState(0);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [freshness, setFreshness]       = useState<string | null>(null);
  const [lastLoaded, setLastLoaded]     = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [june, may, pubs1, pubs2, pubs3] = await Promise.all([
        fetchSummary(JUNE_FROM, JUNE_TO),
        fetchSummary(MAY_FROM, MAY_TO),
        fetchPublishers(JUNE_FROM, JUNE_TO, 0),
        fetchPublishers(JUNE_FROM, JUNE_TO, 50),
        fetchPublishers(JUNE_FROM, JUNE_TO, 100),
      ]);
      setJuneSummary(june);
      setMaySummary(may);
      const all = [...pubs1.publishers, ...pubs2.publishers, ...pubs3.publishers];
      setPublishers(all.sort((a, b) => b.metrics.raw.impressions - a.metrics.raw.impressions));
      setPubTotal(pubs1.pagination.total);
      setFreshness(june.data_freshness);
      setLastLoaded(new Date());
    } catch (e: any) {
      setError("Failed to load data from Disco API. Check that DISCO_API_KEY is set in Vercel environment variables.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const jRaw  = juneSummary?.metrics.raw;
  const jCalc = juneSummary?.metrics.calculated;
  const mRaw  = maySummary?.metrics.raw;
  const mCalc = maySummary?.metrics.calculated;

  const activePublishers  = publishers.filter(p => p.metrics.raw.impressions > 0);
  const inactivePublishers = publishers.filter(p => p.metrics.raw.impressions === 0);

  const barData = jRaw && mRaw ? [
    { name: "Impressions", May: mRaw.impressions, June: jRaw.impressions },
    { name: "Clicks",      May: mRaw.clicks,      June: jRaw.clicks },
    { name: "Conversions", May: mRaw.conversions,  June: jRaw.conversions },
  ] : [];

  const totalImpr = publishers.reduce((s, p) => s + p.metrics.raw.impressions, 0);

  return (
    <div className="flex-1 overflow-y-auto bg-[#fafafa]">
      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Disco channel dashboard</h2>
            {freshness && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Data through {freshness.slice(0, 10)} · {lastLoaded ? `Loaded ${lastLoaded.toLocaleTimeString()}` : ""}
              </p>
            )}
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-3 py-1.5 bg-white transition-colors"
          >
            <RefreshCw size={12} className={cn(loading && "animate-spin")} />
            Refresh
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && !juneSummary && (
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 rounded-lg bg-gray-100 animate-pulse" />
            ))}
          </div>
        )}

        {/* KPI Cards — June with MoM delta */}
        {jRaw && mRaw && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              label="Impressions (June)"
              value={jRaw.impressions.toLocaleString()}
              delta={pct(jRaw.impressions, mRaw.impressions)?.str}
              deltaUp={pct(jRaw.impressions, mRaw.impressions)?.up}
            />
            <KpiCard
              label="Clicks (June)"
              value={jRaw.clicks.toLocaleString()}
              delta={pct(jRaw.clicks, mRaw.clicks)?.str}
              deltaUp={pct(jRaw.clicks, mRaw.clicks)?.up}
            />
            <KpiCard
              label="Conversions (June)"
              value={jRaw.conversions.toLocaleString()}
              delta={pct(jRaw.conversions, mRaw.conversions)?.str}
              deltaUp={pct(jRaw.conversions, mRaw.conversions)?.up}
            />
            <KpiCard
              label="Channel payout (June)"
              value={`$${jRaw.channel_payout.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              delta={pct(jRaw.channel_payout, mRaw.channel_payout)?.str}
              deltaUp={pct(jRaw.channel_payout, mRaw.channel_payout)?.up}
            />
          </div>
        )}

        {/* Calculated metrics */}
        {jCalc && mCalc && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              label="CTR (June)"
              value={`${(jCalc.ctr * 100).toFixed(2)}%`}
              delta={pct(jCalc.ctr, mCalc.ctr)?.str}
              deltaUp={pct(jCalc.ctr, mCalc.ctr)?.up}
            />
            <KpiCard
              label="CVR (June)"
              value={`${(jCalc.cvr * 100).toFixed(2)}%`}
              delta={pct(jCalc.cvr, mCalc.cvr)?.str}
              deltaUp={pct(jCalc.cvr, mCalc.cvr)?.up}
            />
            <KpiCard
              label="Rev w/ email (June)"
              value={`$${jRaw!.revenue_with_email.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              delta={pct(jRaw!.revenue_with_email, mRaw!.revenue_with_email)?.str}
              deltaUp={pct(jRaw!.revenue_with_email, mRaw!.revenue_with_email)?.up}
            />
            <KpiCard
              label="Active publishers"
              value={`${activePublishers.length} / ${pubTotal}`}
              sub={`${inactivePublishers.length} with zero traffic`}
            />
          </div>
        )}

        {/* May vs June bar chart */}
        {barData.length > 0 && (
          <Card className="shadow-none border border-border">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-medium text-foreground">May vs June comparison</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RechartsTooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="May"  fill="#a5b4fc" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="June" fill="#6c47ff" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Publisher breakdown */}
        {publishers.length > 0 && (
          <Card className="shadow-none border border-border">
            <CardHeader className="pb-2 pt-4 px-5 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-foreground">
                Publisher breakdown — June 2026
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {activePublishers.length} active · {inactivePublishers.length} no traffic
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["Publisher", "Category", "Impressions", "Clicks", "Conv.", "CTR", "CVR", "Payout", "Share"].map(h => (
                        <th key={h} className="text-left text-xs font-medium text-muted-foreground px-5 py-2.5 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {publishers.filter(p => p.metrics.raw.impressions > 0).map((p, i) => {
                      const r = p.metrics.raw;
                      const c = p.metrics.calculated;
                      const share = totalImpr ? (r.impressions / totalImpr * 100) : 0;
                      return (
                        <tr key={p.publisher_uuid} className={cn("border-b border-border/50 hover:bg-muted/30 transition-colors", i % 2 === 0 ? "" : "bg-muted/10")}>
                          <td className="px-5 py-2.5 font-medium text-foreground whitespace-nowrap max-w-[180px] truncate">{p.publisher_name}</td>
                          <td className="px-5 py-2.5 text-muted-foreground text-xs whitespace-nowrap">{p.publisher_category}</td>
                          <td className="px-5 py-2.5 text-right tabular-nums">{r.impressions.toLocaleString()}</td>
                          <td className="px-5 py-2.5 text-right tabular-nums">{r.clicks.toLocaleString()}</td>
                          <td className="px-5 py-2.5 text-right tabular-nums">{r.conversions}</td>
                          <td className="px-5 py-2.5 text-right tabular-nums">{(c.ctr * 100).toFixed(2)}%</td>
                          <td className="px-5 py-2.5 text-right tabular-nums">{(c.cvr * 100).toFixed(2)}%</td>
                          <td className="px-5 py-2.5 text-right tabular-nums">${r.channel_payout.toFixed(2)}</td>
                          <td className="px-5 py-2.5 min-w-[100px]">
                            <div className="flex items-center gap-1.5">
                              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-[#6c47ff]" style={{ width: `${Math.min(100, share * 3)}%` }} />
                              </div>
                              <span className="text-xs text-muted-foreground w-8 text-right">{share.toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {inactivePublishers.length > 0 && (
                <div className="px-5 py-3 bg-amber-50 border-t border-amber-100 text-xs text-amber-700 flex items-center gap-1.5">
                  <AlertTriangle size={12} />
                  {inactivePublishers.length} publishers with 0 impressions in June — new merchant batch not yet active in Disco feed.
                </div>
              )}
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
