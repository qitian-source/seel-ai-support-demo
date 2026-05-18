/*
 * PerformancePage — Support Agent performance dashboard
 * KPIs: Total Tickets, Resolution Rate, Escalation Rate, Sentiment Improvement Rate, Avg. Turns
 * Charts: Resolution Rate trend + Sentiment Flow (Entry vs Exit score over time)
 * Table: Contact Reason with Volume, Resolution Rate, Sentiment Change
 */
import { useState, useMemo } from "react";
import {
  performanceSummary, performanceDaily, intentData, conversationLogs,
  type ConversationLog,
} from "@/lib/data";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, ArrowUpDown, Search, ChevronDown, Sparkles, Loader2, RefreshCw, AlertTriangle, CheckCircle2, Lightbulb } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from "recharts";
import ConversationLogSidebar from "@/components/ConversationLogSidebar";

type TimeRange = "7d" | "30d" | "90d" | "180d" | "all";
type SubTab = "dashboard" | "conversations";
type OutcomeFilter  = "all" | "Resolved" | "Escalated" | "Handling";
type IntentFilter   = "all" | "WISMO" | "Cancellation" | "Address Change" | "Refund" | "Complaint";
type SentimentFilter = "all" | "Satisfied" | "Positive" | "Neutral" | "Negative" | "Furious";
type EntrySentimentFilter = "all" | "Satisfied" | "Positive" | "Neutral" | "Negative" | "Furious";
type SortField = "ticketId" | "intent" | "sentiment" | "outcome" | "mode" | "turns" | "time";
type SortDir = "asc" | "desc";

function isPositiveTrend(label: string, trend: number) {
  return label === "Escalation Rate" || label === "Avg. Turns" ? trend < 0 : trend > 0;
}

function formatValue(label: string, value: number) {
  if (label === "Avg. Turns") return value.toFixed(1);
  if (label === "Total Tickets") return String(value);
  return `${value}%`;
}

function formatTrend(label: string, trend: number) {
  const sign = trend > 0 ? "+" : "";
  if (label === "Avg. Turns") return `${sign}${trend.toFixed(1)}`;
  if (label === "Total Tickets") return `${sign}${trend}`;
  return `${sign}${trend}%`;
}

function sentimentColor(s: string) {
  const map: Record<string, string> = {
    Satisfied:  "bg-emerald-50 text-emerald-700 border-emerald-200",
    Positive:   "bg-teal-50 text-teal-700 border-teal-200",
    Neutral:    "bg-slate-50 text-slate-600 border-slate-200",
    Negative:   "bg-orange-50 text-orange-700 border-orange-200",
    Furious:    "bg-red-50 text-red-700 border-red-200",
  };
  return map[s] || "bg-slate-50 text-slate-600 border-slate-200";
}

function outcomeStyle(o: string) {
  if (o === "Resolved") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (o === "Escalated") return "bg-red-50 text-red-700 border-red-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

/* ── Sentiment Change badge ── */
function SentimentChangeBadge({ value }: { value: number }) {
  if (value > 0) return (
    <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-emerald-600">
      <TrendingUp size={11} /> +{value.toFixed(1)}
    </span>
  );
  if (value < 0) return (
    <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-red-500">
      <TrendingDown size={11} /> {value.toFixed(1)}
    </span>
  );
  return <span className="text-[11px] text-muted-foreground">—</span>;
}

/* ── Resolution rate mini bar ── */
function ResBar({ value }: { value: number }) {
  const color = value >= 75 ? "bg-emerald-400" : value >= 55 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${value}%` }} />
      </div>
      <span className="text-[11px] text-muted-foreground tabular-nums w-8 text-right">{value}%</span>
    </div>
  );
}

/* ── Volume mini bar ── */
function VolBar({ value, max }: { value: number; max: number }) {
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-blue-400" style={{ width: `${(value / max) * 100}%` }} />
      </div>
      <span className="text-[11px] text-muted-foreground tabular-nums w-6 text-right">{value}</span>
    </div>
  );
}

export default function PerformancePage() {
  const [subTab, setSubTab] = useState<SubTab>("dashboard");
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>("all");
  const [intentFilter, setIntentFilter] = useState<IntentFilter>("all");
  const [sentimentFilter, setSentimentFilter] = useState<SentimentFilter>("all");
  const [entrySentimentFilter, setEntrySentimentFilter] = useState<EntrySentimentFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("time");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [summaryState, setSummaryState] = useState<"idle" | "loading" | "done">("idle");
  const [summaryTs, setSummaryTs] = useState<string>("");
  const [summaryCollapsed, setSummaryCollapsed] = useState(false);

  const daysMap: Record<TimeRange, number> = { "7d": 7, "30d": 30, "90d": 90, "180d": 180, "all": 180 };
  const visibleDays = performanceDaily.slice(-daysMap[timeRange]);

  function generateSummary() {
    setSummaryState("loading");
    setTimeout(() => {
      setSummaryState("done");
      const now = new Date();
      setSummaryTs(now.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }));
    }, 2200);
  }

  const chartData = visibleDays.map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    resolution: Math.round(d.autoResolutionRate),
    sentImprovement: Math.round(d.sentimentImprovementRate),
    entryScore: d.entrySentimentScore,
    exitScore: d.exitSentimentScore,
    sentDelta: Math.round((d.exitSentimentScore - d.entrySentimentScore) * 10) / 10,
  }));

  const maxVolume = Math.max(...intentData.map((m) => m.volume));

  /* Sentiment donut distributions */
  const SENT_COLORS: Record<string, string> = {
    Satisfied: "#10b981",
    Positive:  "#14b8a6",
    Neutral:   "#94a3b8",
    Negative:  "#f97316",
    Furious:   "#ef4444",
  };
  const SENT_ORDER = ["Satisfied", "Positive", "Neutral", "Negative", "Furious"];
  const bucketScore = (s: number) =>
    s >= 1.5 ? "Satisfied" : s >= 0.5 ? "Positive" : s >= -0.5 ? "Neutral" : s >= -1.5 ? "Negative" : "Furious";

  const entryDist = useMemo(() => {
    const counts: Record<string, number> = {};
    visibleDays.forEach((d) => { const k = bucketScore(d.entrySentimentScore); counts[k] = (counts[k] || 0) + 1; });
    return SENT_ORDER.filter((k) => counts[k]).map((k) => ({ name: k, value: counts[k], pct: Math.round(counts[k] / visibleDays.length * 100) }));
  }, [visibleDays]);

  const exitDist = useMemo(() => {
    const counts: Record<string, number> = {};
    visibleDays.forEach((d) => { const k = bucketScore(d.exitSentimentScore); counts[k] = (counts[k] || 0) + 1; });
    return SENT_ORDER.filter((k) => counts[k]).map((k) => ({ name: k, value: counts[k], pct: Math.round(counts[k] / visibleDays.length * 100) }));
  }, [visibleDays]);

  const avgEntryScore = useMemo(() =>
    (visibleDays.reduce((s, d) => s + d.entrySentimentScore, 0) / visibleDays.length).toFixed(2),
  [visibleDays]);

  const avgExitScore = useMemo(() =>
    (visibleDays.reduce((s, d) => s + d.exitSentimentScore, 0) / visibleDays.length).toFixed(2),
  [visibleDays]);

  /* Conversations filters */
  const filteredLogs = useMemo(() => {
    let logs = [...conversationLogs];
    if (outcomeFilter !== "all")        logs = logs.filter((l) => l.outcome === outcomeFilter);
    if (intentFilter !== "all")         logs = logs.filter((l) => l.intent === intentFilter);
    if (entrySentimentFilter !== "all") logs = logs.filter((l) => l.entrySentiment === entrySentimentFilter);
    if (sentimentFilter !== "all")      logs = logs.filter((l) => l.sentiment === sentimentFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      logs = logs.filter((l) =>
        l.ticketId.toLowerCase().includes(q) ||
        l.customer.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.summary.toLowerCase().includes(q)
      );
    }
    logs.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "ticketId": cmp = a.ticketId.localeCompare(b.ticketId); break;
        case "intent":   cmp = a.intent.localeCompare(b.intent); break;
        case "sentiment":cmp = a.sentiment.localeCompare(b.sentiment); break;
        case "outcome":  cmp = a.outcome.localeCompare(b.outcome); break;
        case "mode":     cmp = a.mode.localeCompare(b.mode); break;
        case "turns":    cmp = a.turns - b.turns; break;
        case "time":     cmp = a.time.localeCompare(b.time); break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
    return logs;
  }, [outcomeFilter, intentFilter, entrySentimentFilter, sentimentFilter, searchQuery, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  };

  const SortIcon = ({ field }: { field: SortField }) => (
    <ArrowUpDown className={cn("w-3 h-3 inline ml-0.5", sortField === field ? "text-foreground" : "text-muted-foreground/30")} />
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Sub-tabs */}
      <div className="px-5 flex items-center gap-1 border-b border-border bg-white shrink-0">
        {(["dashboard", "conversations"] as SubTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setSubTab(tab)}
            className={cn(
              "px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors -mb-px capitalize",
              subTab === tab
                ? "border-[#6c47ff] text-[#6c47ff]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto bg-[#fafafa]">
        <div className="max-w-[1060px] mx-auto px-6 py-6">

          {/* ── Dashboard ── */}
          {subTab === "dashboard" && (
            <>
              {/* Header + time range */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h1 className="text-[15px] font-semibold text-foreground">Dashboard</h1>
                  <p className="text-[12px] text-muted-foreground mt-0.5">Monitor your AI Rep's performance metrics.</p>
                </div>
                <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
                  <SelectTrigger className="h-8 w-[150px] text-[12px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                    <SelectItem value="180d">Last 180 days</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* ── AI Summary ── */}
              {summaryState === "idle" && (
                <div className="mb-5">
                  <button
                    onClick={generateSummary}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6c47ff]/8 hover:bg-[#6c47ff]/14 text-[#6c47ff] text-[13px] font-medium transition-colors border border-[#6c47ff]/20"
                  >
                    <Sparkles size={14} />
                    Generate AI Summary
                  </button>
                </div>
              )}

              {summaryState === "loading" && (
                <div className="mb-5 rounded-2xl border border-[#6c47ff]/20 bg-white px-5 py-4 flex items-center gap-3">
                  <Loader2 size={15} className="text-[#6c47ff] animate-spin shrink-0" />
                  <div>
                    <p className="text-[13px] font-medium text-foreground">Analyzing your support data…</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Reading metrics, conversation patterns, and sentiment trends</p>
                  </div>
                </div>
              )}

              {summaryState === "done" && (() => {
                const resRate   = performanceSummary.find(m => m.label === "Resolution Rate");
                const escRate   = performanceSummary.find(m => m.label === "Escalation Rate");
                const sentImpr  = performanceSummary.find(m => m.label === "Sentiment Improvement Rate");
                const tickets   = performanceSummary.find(m => m.label === "Total Tickets");
                const avgTurns  = performanceSummary.find(m => m.label === "Avg. Turns");
                const topIntent = [...intentData].sort((a, b) => b.resolutionRate - a.resolutionRate)[0];
                const lowIntent = [...intentData].sort((a, b) => a.resolutionRate - b.resolutionRate)[0];
                const highVol   = [...intentData].sort((a, b) => b.volume - a.volume)[0];
                return (
                  <div className="mb-5 rounded-2xl border border-[#6c47ff]/20 bg-white overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/40 bg-[#f5f3ff]/60">
                      <div className="flex items-center gap-2">
                        <Sparkles size={14} className="text-[#6c47ff]" />
                        <span className="text-[13px] font-semibold text-foreground">AI Summary</span>
                        <span className="text-[10px] text-muted-foreground ml-1">Generated {summaryTs}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={generateSummary}
                          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-[#6c47ff] transition-colors"
                        >
                          <RefreshCw size={11} />
                          Regenerate
                        </button>
                        <button
                          onClick={() => setSummaryCollapsed(c => !c)}
                          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ChevronDown size={14} className={cn("transition-transform duration-200", summaryCollapsed ? "-rotate-90" : "")} />
                        </button>
                      </div>
                    </div>

                    {/* Body */}
                    <div className={cn("px-5 py-4 space-y-4", summaryCollapsed && "hidden")}>

                      {/* Overview paragraph */}
                      <p className="text-[13px] text-foreground leading-relaxed">
                        Over the selected period, your AI Support Agent handled{" "}
                        <strong>{tickets?.value} tickets</strong> with a{" "}
                        <strong className="text-emerald-600">{resRate?.value}% resolution rate</strong> and an average of{" "}
                        <strong>{avgTurns?.value} turns</strong> per conversation.
                        Sentiment improved in <strong>{sentImpr?.value}%</strong> of conversations,
                        reflecting the agent's ability to de-escalate and resolve effectively.
                        Escalation rate stands at <strong className={escRate && escRate.value > 28 ? "text-orange-500" : "text-foreground"}>{escRate?.value}%</strong>
                        {escRate && escRate.value > 28 ? " — slightly above the 25% benchmark, worth monitoring." : "."}
                      </p>

                      {/* 3-column insight blocks */}
                      <div className="grid grid-cols-3 gap-3">

                        {/* Highlights */}
                        <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3">
                          <div className="flex items-center gap-1.5 mb-2.5">
                            <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide">What's Working</span>
                          </div>
                          <ul className="space-y-2">
                            <li className="text-[12px] text-foreground leading-snug">
                              <strong>{topIntent?.intent}</strong> has the highest resolution rate at{" "}
                              <strong className="text-emerald-600">{topIntent?.resolutionRate}%</strong> — your agent handles this intent reliably.
                            </li>
                            <li className="text-[12px] text-foreground leading-snug">
                              Resolution rate is trending <strong className="text-emerald-600">+{resRate?.trend}%</strong> vs. the previous period, indicating steady improvement.
                            </li>
                            <li className="text-[12px] text-foreground leading-snug">
                              <strong>{highVol?.intent}</strong> is the highest-volume contact reason — the agent is absorbing the bulk of repetitive inquiries successfully.
                            </li>
                          </ul>
                        </div>

                        {/* Attention */}
                        <div className="rounded-xl bg-orange-50 border border-orange-100 px-4 py-3">
                          <div className="flex items-center gap-1.5 mb-2.5">
                            <AlertTriangle size={12} className="text-orange-500 shrink-0" />
                            <span className="text-[11px] font-semibold text-orange-600 uppercase tracking-wide">Needs Attention</span>
                          </div>
                          <ul className="space-y-2">
                            <li className="text-[12px] text-foreground leading-snug">
                              <strong>{lowIntent?.intent}</strong> has the lowest resolution rate at{" "}
                              <strong className="text-orange-500">{lowIntent?.resolutionRate}%</strong> — consider expanding the playbook for this intent.
                            </li>
                            <li className="text-[12px] text-foreground leading-snug">
                              Escalation rate at <strong>{escRate?.value}%</strong> is driven primarily by Complaint and Refund intents. Review escalation triggers for these categories.
                            </li>
                            <li className="text-[12px] text-foreground leading-snug">
                              Furious/Negative entry sentiment accounts for ~25% of tickets — early-stage tone detection could route these faster.
                            </li>
                          </ul>
                        </div>

                        {/* Recommendations */}
                        <div className="rounded-xl bg-[#f5f3ff] border border-[#6c47ff]/15 px-4 py-3">
                          <div className="flex items-center gap-1.5 mb-2.5">
                            <Lightbulb size={12} className="text-[#6c47ff] shrink-0" />
                            <span className="text-[11px] font-semibold text-[#6c47ff] uppercase tracking-wide">Recommendations</span>
                          </div>
                          <ul className="space-y-2">
                            <li className="text-[12px] text-foreground leading-snug">
                              Strengthen the <strong>{lowIntent?.intent}</strong> playbook with more resolution paths to improve the {lowIntent?.resolutionRate}% rate.
                            </li>
                            <li className="text-[12px] text-foreground leading-snug">
                              Add proactive order status messaging to reduce <strong>{highVol?.intent}</strong> volume — this alone could free up significant agent capacity.
                            </li>
                            <li className="text-[12px] text-foreground leading-snug">
                              Exit sentiment of <strong className="text-emerald-600">+{avgExitScore}</strong> vs. entry of <strong>{avgEntryScore}</strong> shows a strong uplift — highlight this in merchant reporting to demonstrate AI value.
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* KPI cards — 5 */}
              <div className="grid grid-cols-5 gap-3 mb-6">
                {performanceSummary.map((metric) => {
                  const positive = isPositiveTrend(metric.label, metric.trend);
                  return (
                    <Card key={metric.label} className="overflow-hidden">
                      <CardContent className="pt-4 pb-3 px-4">
                        <p className="text-[11px] text-muted-foreground leading-tight mb-2">{metric.label}</p>
                        <p className="text-[26px] font-bold text-foreground tabular-nums leading-none mb-2">
                          {formatValue(metric.label, metric.value)}
                        </p>
                        <div className={cn("flex items-center gap-0.5 text-[11px] font-medium", positive ? "text-emerald-600" : "text-red-500")}>
                          {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          <span>{formatTrend(metric.label, metric.trend)} vs previous</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Charts — 2 side by side */}
              <div className="grid grid-cols-2 gap-4 mb-6">

                {/* Resolution Rate trend */}
                <Card>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-[13px]">Resolution Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="gRes" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="date" tick={{ fontSize: 9 }} tickLine={false} axisLine={false}
                            interval={Math.floor(chartData.length / 5)} />
                          <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} unit="%" domain={[40, 80]} />
                          <RechartsTooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }}
                            formatter={(v: number) => [`${v}%`, "Resolution Rate"]} />
                          <Area type="monotone" dataKey="resolution" stroke="#10b981" fill="url(#gRes)" strokeWidth={2} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Sentiment Distribution — two donut charts (custom SVG) */}
                <Card>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-[13px]">Sentiment Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      {[
                        { label: "At Worst", dist: entryDist,  avg: avgEntryScore },
                        { label: "At Exit",  dist: exitDist,   avg: avgExitScore  },
                      ].map(({ label, dist, avg }) => {
                        const avgNum = parseFloat(avg);
                        const isPositive = avgNum > 0;
                        const total = dist.reduce((s, d) => s + d.value, 0);
                        // Build SVG arc paths for donut
                        const cx = 65, cy = 65, r = 52, ri = 36;
                        const gap = 0.04; // radians gap between segments
                        let angle = -Math.PI / 2; // start at top
                        const paths = dist.map((d) => {
                          const slice = (d.value / total) * (Math.PI * 2) - gap;
                          const x1o = cx + r  * Math.cos(angle);
                          const y1o = cy + r  * Math.sin(angle);
                          const x1i = cx + ri * Math.cos(angle);
                          const y1i = cy + ri * Math.sin(angle);
                          const endA = angle + slice;
                          const x2o = cx + r  * Math.cos(endA);
                          const y2o = cy + r  * Math.sin(endA);
                          const x2i = cx + ri * Math.cos(endA);
                          const y2i = cy + ri * Math.sin(endA);
                          const large = slice > Math.PI ? 1 : 0;
                          const path = `M ${x1o} ${y1o} A ${r} ${r} 0 ${large} 1 ${x2o} ${y2o} L ${x2i} ${y2i} A ${ri} ${ri} 0 ${large} 0 ${x1i} ${y1i} Z`;
                          angle += slice + gap;
                          return { path, color: SENT_COLORS[d.name], name: d.name };
                        });
                        return (
                          <div key={label} className="flex-1 flex flex-col items-center">
                            <p className="text-[11px] font-medium text-muted-foreground mb-2">{label}</p>
                            <div className="relative" style={{ width: 130, height: 130 }}>
                              <svg width={130} height={130} viewBox="0 0 130 130">
                                {paths.map((p) => (
                                  <path key={p.name} d={p.path} fill={p.color} />
                                ))}
                              </svg>
                              {/* Center: avg score */}
                              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className={`text-[14px] font-bold leading-none ${isPositive ? "text-emerald-600" : avgNum < 0 ? "text-orange-500" : "text-muted-foreground"}`}>
                                  {avg}
                                </span>
                                <span className="text-[9px] text-muted-foreground mt-0.5">avg score</span>
                              </div>
                            </div>
                            {/* Legend below */}
                            <div className="flex flex-col gap-1 mt-3 w-full px-1">
                              {dist.map((d) => (
                                <div key={d.name} className="flex items-center justify-between text-[10px]">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: SENT_COLORS[d.name] }} />
                                    <span className="text-muted-foreground">{d.name}</span>
                                  </div>
                                  <span className="font-medium tabular-nums">{d.pct}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Contact Reason table */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-[13px]">Contact Reason</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2.5 px-4 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Intent</th>
                        <th className="text-left py-2.5 px-4 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Volume</th>
                        <th className="text-left py-2.5 px-4 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Resolution Rate</th>
                        <th className="text-left py-2.5 px-4 text-[10px] font-medium text-muted-foreground uppercase tracking-wider w-[110px]">Sentiment Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {intentData.map((row) => (
                        <tr key={row.intent} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                          <td className="py-2.5 px-4 font-medium">{row.intent}</td>
                          <td className="py-2.5 px-4"><VolBar value={row.volume} max={maxVolume} /></td>
                          <td className="py-2.5 px-4"><ResBar value={row.resolutionRate} /></td>
                          <td className="py-2.5 px-4 w-[110px]"><SentimentChangeBadge value={row.sentimentChange} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </>
          )}

          {/* ── Conversations ── */}
          {subTab === "conversations" && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-[15px] font-semibold text-foreground">Conversations</h1>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Outcome dropdown */}
                  <Select value={outcomeFilter} onValueChange={(v) => setOutcomeFilter(v as OutcomeFilter)}>
                    <SelectTrigger className="h-7 text-[11px] min-w-[130px] bg-white">
                      <SelectValue placeholder="Outcome" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All outcomes</SelectItem>
                      <SelectItem value="Resolved">Resolved</SelectItem>
                      <SelectItem value="Escalated">Escalated</SelectItem>
                      <SelectItem value="Handling">Handling</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Intent dropdown */}
                  <Select value={intentFilter} onValueChange={(v) => setIntentFilter(v as IntentFilter)}>
                    <SelectTrigger className="h-7 text-[11px] min-w-[120px] bg-white">
                      <SelectValue placeholder="Intent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All intents</SelectItem>
                      {(["WISMO", "Cancellation", "Address Change", "Refund", "Complaint"] as IntentFilter[]).filter(v => v !== "all").map((i) => (
                        <SelectItem key={i} value={i}>{i}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Entry Sentiment dropdown */}
                  <Select value={entrySentimentFilter} onValueChange={(v) => setEntrySentimentFilter(v as EntrySentimentFilter)}>
                    <SelectTrigger className="h-7 text-[11px] min-w-[155px] bg-white">
                      <SelectValue placeholder="Entry Sentiment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All entry sentiments</SelectItem>
                      <SelectItem value="Satisfied">Satisfied</SelectItem>
                      <SelectItem value="Positive">Positive</SelectItem>
                      <SelectItem value="Neutral">Neutral</SelectItem>
                      <SelectItem value="Negative">Negative</SelectItem>
                      <SelectItem value="Furious">Furious</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Exit Sentiment dropdown */}
                  <Select value={sentimentFilter} onValueChange={(v) => setSentimentFilter(v as SentimentFilter)}>
                    <SelectTrigger className="h-7 text-[11px] min-w-[150px] bg-white">
                      <SelectValue placeholder="Exit Sentiment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All exit sentiments</SelectItem>
                      <SelectItem value="Satisfied">Satisfied</SelectItem>
                      <SelectItem value="Positive">Positive</SelectItem>
                      <SelectItem value="Neutral">Neutral</SelectItem>
                      <SelectItem value="Negative">Negative</SelectItem>
                      <SelectItem value="Furious">Furious</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search ticket ID, email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 rounded-lg border border-border/50 bg-white text-[11px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30 w-[200px]"
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground">{filteredLogs.length} conversations</span>
                </div>
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="border-b bg-muted/20">
                          {[
                            { label: "Ticket",    field: "ticketId"  as SortField },
                            { label: "Customer",  field: null },
                            { label: "Intent",    field: "intent"    as SortField },
                            { label: "Exit Sentiment", field: "sentiment" as SortField },
                            { label: "Outcome",   field: "outcome"   as SortField },
                            { label: "Mode",      field: "mode"      as SortField },
                            { label: "Turns",     field: "turns"     as SortField },
                            { label: "Summary",   field: null },
                            { label: "Time",      field: "time"      as SortField },
                          ].map(({ label, field }) => (
                            <th
                              key={label}
                              onClick={() => field && toggleSort(field)}
                              className={cn(
                                "text-left py-2.5 px-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap",
                                field && "cursor-pointer hover:text-foreground"
                              )}
                            >
                              {label}{field && <SortIcon field={field} />}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLogs.map((log) => (
                          <tr
                            key={log.ticketId}
                            onClick={() => setSelectedTicketId(log.ticketId)}
                            className="border-b border-border/30 hover:bg-muted/20 cursor-pointer transition-colors"
                          >
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="text-primary font-mono text-[11px]">{log.ticketId}</span>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="text-[11px]">{log.customer}</div>
                              <div className="text-[10px] text-muted-foreground">{log.email}</div>
                            </td>
                            <td className="py-2.5 px-3 text-[11px] whitespace-nowrap">{log.intent}</td>
                            <td className="py-2.5 px-3">
                              <Badge variant="outline" className={cn("text-[9px] py-0 h-4", sentimentColor(log.sentiment))}>
                                {log.sentiment}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge variant="outline" className={cn("text-[9px] py-0 h-4", outcomeStyle(log.outcome))}>
                                {log.outcome}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge variant="outline" className="text-[9px] py-0 h-4">{log.mode}</Badge>
                            </td>
                            <td className="py-2.5 px-3 text-[11px] text-center tabular-nums">{log.turns}</td>
                            <td className="py-2.5 px-3 text-[11px] text-muted-foreground max-w-[180px] truncate">{log.summary}</td>
                            <td className="py-2.5 px-3 text-[11px] text-muted-foreground whitespace-nowrap">{log.time}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          <div className="h-4" />
        </div>
      </div>

      <ConversationLogSidebar ticketId={selectedTicketId} onClose={() => setSelectedTicketId(null)} />
    </div>
  );
}
