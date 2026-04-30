/*
 * PerformancePage — Dashboard + Conversations sub-tabs
 * PRD: US4 — Performance monitoring with KPI dashboard, trend charts,
 * intent analysis, and conversation log with reasoning detail
 *
 * Customizations applied:
 *   1. 5 KPI cards: Total Tickets, Auto-Resolution Rate, Escalation Rate,
 *      Sentiment Improvement, Full Resolution Time
 *   2. 3 Trend Charts: Resolution Rate, CSAT Trend, Full Resolution Time
 *   3. Consolidated single-row filters
 *   4. No icons in KPI cards or tab labels
 *   5. "vs previous period" not "vs previous day"
 */
import { useState, useMemo } from "react";
import {
  performanceSummary, performanceDaily, intentData, conversationLogs,
  type ConversationLog,
} from "@/lib/data";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { TrendingUp, TrendingDown, ArrowUpDown, Search } from "lucide-react";
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";
import ConversationLogSidebar from "@/components/ConversationLogSidebar";

type TimeRange = "7d" | "14d" | "30d";
type SubTab = "dashboard" | "conversations";
type ModeFilter = "all" | "Production" | "Training";
type OutcomeFilter = "all" | "Resolved" | "Escalated" | "Handling";
type SortField = "ticketId" | "intent" | "sentiment" | "outcome" | "mode" | "turns" | "time";
type SortDir = "asc" | "desc";

/* ── helpers ── */
function formatDuration(s: number) {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return sec > 0 ? `${m}m ${sec}s` : `${m}m`;
}

function sentimentColor(s: string): string {
  const map: Record<string, string> = {
    Positive: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Neutral: "bg-slate-50 text-slate-600 border-slate-200",
    Frustrated: "bg-orange-50 text-orange-700 border-orange-200",
  };
  return map[s] || "bg-slate-50 text-slate-600 border-slate-200";
}

function outcomeStyle(o: string): string {
  if (o === "Resolved") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (o === "Escalated") return "bg-red-50 text-red-700 border-red-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

/* ── Mini Bar for Intent table ── */
function MiniBar({ value, max, color = "bg-blue-500" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] text-muted-foreground tabular-nums w-6 text-right">{value}</span>
    </div>
  );
}

function MiniHBar({ value, color = "bg-blue-500" }: { value: number; color?: string }) {
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${value}%` }} />
      </div>
      <span className="text-[11px] text-muted-foreground tabular-nums w-10 text-right">{value}%</span>
    </div>
  );
}

/* ── KPI formatting helpers ── */
function isPositiveTrend(label: string, trend: number) {
  if (label === "Full Resolution Time" || label === "Sentiment Improve Rate" || label === "Escalation Rate") return trend < 0;
  return trend > 0;
}

function formatKPIValue(label: string, value: number, unit: string) {
  if (label === "Full Resolution Time") return formatDuration(value);
  if (unit === "") return String(value);
  return `${value}${unit}`;
}

function formatTrend(label: string, trend: number, unit: string) {
  const sign = trend > 0 ? "+" : "";
  if (label === "Full Resolution Time") return `${sign}${formatDuration(Math.abs(trend))}`;
  if (unit === "") return `${sign}${trend}%`;
  return `${sign}${trend}${unit}`;
}

/* ── Main Performance Page ── */
export default function PerformancePage() {
  const [subTab, setSubTab] = useState<SubTab>("dashboard");
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [modeFilter, setModeFilter] = useState<ModeFilter>("all");
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("time");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const daysMap: Record<TimeRange, number> = { "7d": 7, "14d": 14, "30d": 30 };
  const visibleMetrics = performanceDaily.slice(-daysMap[timeRange]);

  const chartData = visibleMetrics.map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    resolution: Math.round(d.autoResolutionRate),
    csat: Number(d.csat.toFixed(1)),
    fullRT: Math.round(d.fullResolutionTime / 60),
  }));

  // Filter conversation logs
  const filteredLogs = useMemo(() => {
    let logs = [...conversationLogs];
    if (modeFilter !== "all") logs = logs.filter((l) => l.mode === modeFilter);
    if (outcomeFilter !== "all") logs = logs.filter((l) => l.outcome === outcomeFilter);
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
        case "intent": cmp = a.intent.localeCompare(b.intent); break;
        case "sentiment": cmp = a.sentiment.localeCompare(b.sentiment); break;
        case "outcome": cmp = a.outcome.localeCompare(b.outcome); break;
        case "mode": cmp = a.mode.localeCompare(b.mode); break;
        case "turns": cmp = a.turns - b.turns; break;
        case "time": cmp = a.time.localeCompare(b.time); break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
    return logs;
  }, [modeFilter, outcomeFilter, searchQuery, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  };

  const SortIcon = ({ field }: { field: SortField }) => (
    <ArrowUpDown className={cn("w-3 h-3 inline ml-0.5", sortField === field ? "text-foreground" : "text-muted-foreground/30")} />
  );

  const maxVolume = Math.max(...intentData.map((m) => m.volume));

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Sub-tabs */}
      <div className="px-5 py-0 flex items-center gap-1 border-b border-border bg-white">
        <button
          onClick={() => setSubTab("dashboard")}
          className={cn(
            "px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors -mb-px",
            subTab === "dashboard"
              ? "border-[#6c47ff] text-[#6c47ff]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Dashboard
        </button>
        <button
          onClick={() => setSubTab("conversations")}
          className={cn(
            "px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors -mb-px",
            subTab === "conversations"
              ? "border-[#6c47ff] text-[#6c47ff]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Conversations
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1060px] mx-auto px-6 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-[16px] font-semibold text-foreground">
                {subTab === "dashboard" ? "Dashboard" : "Conversations"}
              </h1>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                {subTab === "dashboard"
                  ? "Monitor your AI Rep's performance metrics."
                  : "Review all AI-handled conversations."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Mode filter */}
              <Select value={modeFilter} onValueChange={(v) => setModeFilter(v as ModeFilter)}>
                <SelectTrigger className="h-8 w-[120px] text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modes</SelectItem>
                  <SelectItem value="Production">Production</SelectItem>
                  <SelectItem value="Training">Training</SelectItem>
                </SelectContent>
              </Select>
              {/* Time range */}
              <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
                <SelectTrigger className="h-8 w-[110px] text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="14d">Last 14 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ═══ Dashboard ═══ */}
          {subTab === "dashboard" && (
            <>
              {/* KPI Cards — 6 */}
              <div className="grid grid-cols-6 gap-3 mb-6">
                {performanceSummary.map((metric) => {
                  const positive = isPositiveTrend(metric.label, metric.trend);
                  return (
                    <Card key={metric.label} className="overflow-hidden">
                      <CardContent className="pt-3 pb-2.5 px-3">
                        <span className="text-[10px] text-muted-foreground font-medium leading-tight">{metric.label}</span>
                        <div className="mt-1.5">
                          <span className="text-[22px] font-bold text-foreground tabular-nums leading-none">
                            {formatKPIValue(metric.label, metric.value, metric.unit)}
                          </span>
                        </div>
                        <div className={cn("flex items-center gap-0.5 mt-1.5 text-[10px] font-medium", positive ? "text-emerald-600" : "text-red-500")}>
                          {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          <span>{formatTrend(metric.label, metric.trend, metric.unit)}</span>
                        </div>
                        <div className="text-[9px] text-muted-foreground mt-0.5">{metric.trendLabel}</div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Trend Charts — 3 */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {/* Resolution Rate */}
                <Card>
                  <CardHeader className="pb-1"><CardTitle className="text-[13px]">Resolution Rate</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-[180px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="gRes" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="date" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} unit="%" />
                          <RechartsTooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }} />
                          <Area type="monotone" dataKey="resolution" stroke="#10b981" fill="url(#gRes)" strokeWidth={2} name="Resolution %" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* CSAT Trend */}
                <Card>
                  <CardHeader className="pb-1"><CardTitle className="text-[13px]">CSAT Trend</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-[180px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="gCSAT" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="date" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                          <YAxis domain={[3, 5]} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                          <RechartsTooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }} />
                          <Area type="monotone" dataKey="csat" stroke="#6366f1" fill="url(#gCSAT)" strokeWidth={2} name="CSAT" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Full Resolution Time */}
                <Card>
                  <CardHeader className="pb-1"><CardTitle className="text-[13px]">Full Resolution Time</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-[180px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="date" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} unit="m" />
                          <RechartsTooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }} />
                          <Line type="monotone" dataKey="fullRT" stroke="#f59e0b" strokeWidth={2} dot={false} name="Full Resolution (min)" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Intent Table */}
              <Card className="mb-6">
                <CardHeader className="pb-2"><CardTitle className="text-[13px]">Performance by Intent</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2.5 px-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Intent</th>
                          <th className="text-left py-2.5 px-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Volume</th>
                          <th className="text-left py-2.5 px-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Resolution Rate</th>
                          <th className="text-left py-2.5 px-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">CSAT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {intentData.filter((m) => m.volume > 0).map((intent) => {
                          const highlight = intent.volume > 40 && intent.resolutionRate < 60;
                          return (
                            <tr key={intent.intent} className={cn("border-b border-border/30 hover:bg-muted/20 transition-colors", highlight && "bg-amber-50/40")}>
                              <td className="py-2.5 px-3 font-medium">{intent.intent}</td>
                              <td className="py-2.5 px-3"><MiniBar value={intent.volume} max={maxVolume} color="bg-blue-400" /></td>
                              <td className="py-2.5 px-3">
                                <MiniHBar
                                  value={intent.resolutionRate}
                                  color={intent.resolutionRate >= 70 ? "bg-emerald-400" : intent.resolutionRate >= 50 ? "bg-amber-400" : "bg-red-400"}
                                />
                              </td>
                              <td className="py-2.5 px-3">
                                {intent.csat > 0 ? (
                                  <span className={cn("text-[12px] font-medium", intent.csat >= 4.2 ? "text-emerald-600" : intent.csat >= 3.8 ? "text-amber-600" : "text-red-500")}>
                                    {intent.csat}/5
                                  </span>
                                ) : <span className="text-muted-foreground">—</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* ═══ Conversations Sub-Tab ═══ */}
          {subTab === "conversations" && (
            <>
              {/* Filters — single row */}
              <div className="flex items-center gap-3 flex-wrap mb-4">
                <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5">
                  {(["all", "Resolved", "Escalated", "Handling"] as OutcomeFilter[]).map((o) => (
                    <button
                      key={o}
                      onClick={() => setOutcomeFilter(o)}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors capitalize",
                        outcomeFilter === o
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {o === "all" ? "All" : o}
                    </button>
                  ))}
                </div>
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search ticket ID, email, summary..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border/50 bg-muted/20 text-[11px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>
                <span className="text-[11px] text-muted-foreground ml-auto">{filteredLogs.length} conversations</span>
              </div>

              {/* Horizontal Table */}
              {filteredLogs.length > 0 ? (
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-[12px]">
                        <thead>
                          <tr className="border-b bg-muted/20">
                            <th className="text-left py-2.5 px-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground whitespace-nowrap" onClick={() => toggleSort("ticketId")}>
                              Ticket <SortIcon field="ticketId" />
                            </th>
                            <th className="text-left py-2.5 px-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                              Customer
                            </th>
                            <th className="text-left py-2.5 px-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground whitespace-nowrap" onClick={() => toggleSort("intent")}>
                              Intent <SortIcon field="intent" />
                            </th>
                            <th className="text-left py-2.5 px-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground whitespace-nowrap" onClick={() => toggleSort("sentiment")}>
                              Sentiment <SortIcon field="sentiment" />
                            </th>
                            <th className="text-left py-2.5 px-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground whitespace-nowrap" onClick={() => toggleSort("outcome")}>
                              Outcome <SortIcon field="outcome" />
                            </th>
                            <th className="text-left py-2.5 px-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground whitespace-nowrap" onClick={() => toggleSort("mode")}>
                              Mode <SortIcon field="mode" />
                            </th>
                            <th className="text-left py-2.5 px-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground whitespace-nowrap" onClick={() => toggleSort("turns")}>
                              Turns <SortIcon field="turns" />
                            </th>
                            <th className="text-left py-2.5 px-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                              Summary
                            </th>
                            <th className="text-left py-2.5 px-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground whitespace-nowrap" onClick={() => toggleSort("time")}>
                              Time <SortIcon field="time" />
                            </th>
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
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-[12px] text-muted-foreground">No conversations found for the selected filters.</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          <div className="h-4" />
        </div>
      </div>

      {/* Conversation detail sidebar */}
      <ConversationLogSidebar
        ticketId={selectedTicketId}
        onClose={() => setSelectedTicketId(null)}
      />
    </div>
  );
}
