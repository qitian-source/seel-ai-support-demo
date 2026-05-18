/*
 * SalesAgentPage — Sales Agent analytics with touchpoints & strategies
 * Analytics tab: bar chart (Sales trend) + performance breakdown table
 * Row click → Order Details slide-over panel
 */
import { useState, useMemo } from "react";
import { salesDaily, salesTouchpoints, type SalesTouchpointRow, type SalesOrder } from "@/lib/data";
import SalesAgentBanner from "@/components/SalesAgentBanner";
import TimeRangePicker, { type TimeRangeValue } from "@/components/TimeRangePicker";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, X, ExternalLink, Info, Calendar, Sparkles } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from "recharts";

type AgentSubTab = "touchpoints" | "strategies" | "analytics";
type TimeRange = "yesterday" | "7d" | "30d" | "90d" | "custom";
type TouchpointFilter = "all" | string;

const TIME_SCALE: Record<string, number> = { "yesterday": 1 / 30, "7d": 7 / 30, "30d": 1, "90d": 3, "custom": 1 };

function computeKPIs(tpFilter: string, timeRange: string) {
  const scale = TIME_SCALE[timeRange] ?? 1;
  const rows = tpFilter === "all" ? salesTouchpoints : salesTouchpoints.filter((r) => r.touchpoint === tpFilter);
  const totalSales   = rows.reduce((s, r) => s + r.attributedSales, 0) * scale;
  const totalOrders  = Math.round(rows.reduce((s, r) => s + r.ordersInfluenced, 0) * scale);
  const avgCTR       = rows.reduce((s, r) => s + r.ctr, 0) / rows.length;
  const avgItemAov   = rows.reduce((s, r) => s + r.aov, 0) / rows.length;
  const avgActualAov = rows.reduce((s, r) => s + r.actualAov, 0) / rows.length;
  const avgDelta     = rows.reduce((s, r) => s + r.salesDelta, 0) / rows.length;
  return [
    { label: "Attributed Sales",   value: `$${totalSales.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, delta: `+${avgDelta.toFixed(1)}%`, positive: true },
    { label: "Converted Orders",   value: String(totalOrders), delta: "+8.8%", positive: true },
    { label: "CTR",                value: `${avgCTR.toFixed(1)}%`, delta: "+14.2%", positive: true },
    { label: "AOV",   value: `$${avgActualAov.toFixed(2)}`, delta: "+18.7%", positive: true },
  ];
}

/* ── Chart colors per touchpoint ── */
const TP_COLORS: Record<string, string> = {
  resolutionCenter: "#6c47ff",
  wfpEmail:         "#f59e0b",
  supportAgent:     "#10b981",
  searchBar:        "#3b82f6",
};

/* ── Order status badge ── */
function StatusBadge({ status }: { status: SalesOrder["status"] }) {
  const styles: Record<SalesOrder["status"], string> = {
    fulfilled: "bg-emerald-50 text-emerald-700 border-emerald-200",
    pending:   "bg-amber-50  text-amber-700  border-amber-200",
    refunded:  "bg-red-50    text-red-700    border-red-200",
  };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border", styles[status])}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

/* ── Order Details Slide-over ── */
function OrderDetailsPanel({
  row,
  onClose,
}: {
  row: SalesTouchpointRow | null;
  onClose: () => void;
}) {
  if (!row) return null;
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[480px] bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-[14px] font-semibold text-foreground">{row.touchpoint}</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {row.ordersInfluenced} converted orders · ${row.attributedSales.toLocaleString("en-US", { minimumFractionDigits: 2 })} attributed
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-muted/60 text-muted-foreground transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 gap-0 border-b border-border">
          {[
            { label: "CTR", value: `${row.ctr}%` },
            { label: "AOV", value: `$${row.actualAov.toFixed(2)}` },
          ].map((s) => (
            <div key={s.label} className="px-5 py-3 border-r last:border-r-0 border-border">
              <div className="text-[10px] text-muted-foreground">{s.label}</div>
              <div className="text-[15px] font-semibold text-foreground mt-0.5">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Order list */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[12px] font-semibold text-foreground">Converted Orders</h3>
            <span className="text-[11px] text-muted-foreground">{row.orders.length} shown</span>
          </div>
          <div className="space-y-3">
            {row.orders.map((order) => (
              <div key={order.id} className="border border-border rounded-lg p-3.5 hover:bg-muted/20 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-mono font-medium text-[#6c47ff]">{order.id}</span>
                      <StatusBadge status={order.status} />
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{order.customer} · {order.email}</div>
                  </div>
                  <button className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5">
                    <ExternalLink size={13} />
                  </button>
                </div>

                {/* Items */}
                <div className="bg-muted/30 rounded-md px-3 py-2 space-y-1 mb-2">
                  {order.items.map((item, idx) => {
                    const isRecommended = item.name === order.recommendedItem;
                    return (
                      <div
                        key={idx}
                        className={cn(
                          "flex items-center justify-between text-[11px] rounded px-2 py-1 -mx-2",
                          isRecommended ? "bg-[#f0edff]" : ""
                        )}
                      >
                        <span className={cn("flex items-center gap-1.5", isRecommended ? "text-[#6c47ff] font-medium" : "text-foreground")}>
                          {isRecommended && <Sparkles size={10} className="text-[#6c47ff] shrink-0" />}
                          {item.name} ×{item.qty}
                          {isRecommended && (
                            <span className="text-[9px] font-semibold tracking-wide bg-[#6c47ff] text-white px-1.5 py-0.5 rounded-full">
                              Recommended
                            </span>
                          )}
                        </span>
                        <span className={cn("tabular-nums", isRecommended ? "text-[#6c47ff] font-medium" : "text-muted-foreground")}>{item.price}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">{order.date} · {order.channel}</span>
                  <span className="font-semibold text-foreground">{order.total}</span>
                </div>
              </div>
            ))}
          </div>

          {row.orders.length < row.ordersInfluenced && (
            <p className="text-center text-[11px] text-muted-foreground mt-4">
              Showing {row.orders.length} of {row.ordersInfluenced} orders
            </p>
          )}
        </div>
      </div>
    </>
  );
}

/* ── Analytics sub-tab ── */
function AnalyticsTab() {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [customRange, setCustomRange] = useState<{ from: string; to: string } | undefined>();
  const [tpFilter, setTpFilter] = useState<TouchpointFilter>("all");
  const [selectedRow, setSelectedRow] = useState<SalesTouchpointRow | null>(null);

  const daysMap: Record<TimeRange, number> = { "yesterday": 1, "7d": 7, "30d": 30, "90d": 90, "custom": 30 };
  const chartData = salesDaily.slice(-daysMap[timeRange]);
  const kpis = useMemo(() => computeKPIs(tpFilter, timeRange), [tpFilter, timeRange]);

  const filteredTouchpoints = useMemo(
    () => tpFilter === "all" ? salesTouchpoints : salesTouchpoints.filter((r) => r.touchpoint === tpFilter),
    [tpFilter]
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[1100px] mx-auto px-6 py-5">

        {/* Filters */}
        <div className="flex items-center gap-3 mb-5">
          <span className="text-[12px] text-muted-foreground">Time range</span>
          <TimeRangePicker
            value={timeRange as TimeRangeValue}
            customRange={customRange}
            onChange={(v, custom) => {
              setTimeRange(v as TimeRange);
              if (custom) setCustomRange(custom);
            }}
          />
          <Select value={tpFilter} onValueChange={(v) => setTpFilter(v as TouchpointFilter)}>
            <SelectTrigger className="h-7 text-[12px] min-w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All touchpoints</SelectItem>
              {salesTouchpoints.map((r) => (
                <SelectItem key={r.touchpoint} value={r.touchpoint}>{r.touchpoint}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {kpis.map((k) => (
            <Card key={k.label}>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-start justify-between">
                  <span className="text-[11px] text-muted-foreground leading-tight max-w-[140px]">{k.label}</span>
                  <Info size={12} className="text-muted-foreground/40 mt-0.5 shrink-0" />
                </div>
                <div className="mt-2 text-[24px] font-bold text-foreground tabular-nums leading-none">{k.value}</div>
                <div className={cn("flex items-center gap-1 mt-1.5 text-[11px] font-medium", k.positive ? "text-emerald-600" : "text-red-500")}>
                  {k.positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  <span>{k.delta}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Sales Trend Bar Chart */}
        <Card className="mb-5">
          <CardHeader className="pb-3 flex-row items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-[13px] font-semibold">Sales trend</CardTitle>
              <Info size={13} className="text-muted-foreground/40" />
            </div>
            {/* Legend */}
            <div className="flex items-center gap-4 flex-wrap">
              {[
                { key: "resolutionCenter", label: "Resolution Center", color: TP_COLORS.resolutionCenter },
                { key: "wfpEmail",         label: "WFP Confirmation Email", color: TP_COLORS.wfpEmail },
                { key: "supportAgent",     label: "Support Chat", color: TP_COLORS.supportAgent },
                { key: "searchBar",        label: "Search Bar", color: TP_COLORS.searchBar },
              ].map((s) => (
                <span key={s.key} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: s.color }} />
                  {s.label}
                </span>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }} barSize={tpFilter === "all" ? 6 : 14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} interval={Math.floor(chartData.length / 8)} />
                  <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                  <RechartsTooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }}
                    formatter={(value: number, name: string) => {
                      const labelMap: Record<string, string> = {
                        resolutionCenter: "Resolution Center",
                        wfpEmail: "WFP Email",
                        supportAgent: "Support Agent",
                        searchBar: "Search Bar",
                      };
                      return [`$${value.toLocaleString()}`, labelMap[name] || name];
                    }}
                  />
                  {(tpFilter === "all" || tpFilter === "Seel Resolution Center") && (
                    <Bar dataKey="resolutionCenter" stackId="a" fill={TP_COLORS.resolutionCenter} radius={tpFilter !== "all" ? [3, 3, 0, 0] : undefined} />
                  )}
                  {(tpFilter === "all" || tpFilter === "WFP Policy Email") && (
                    <Bar dataKey="wfpEmail" stackId="a" fill={TP_COLORS.wfpEmail} />
                  )}
                  {(tpFilter === "all" || tpFilter === "Support Agent") && (
                    <Bar dataKey="supportAgent" stackId="a" fill={TP_COLORS.supportAgent} />
                  )}
                  {(tpFilter === "all" || tpFilter === "Search Bar") && (
                    <Bar dataKey="searchBar" stackId="a" fill={TP_COLORS.searchBar} radius={[3, 3, 0, 0]} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Performance Breakdown Table */}
        <Card>
          <CardHeader className="pb-2">
            <div>
              <CardTitle className="text-[13px] font-semibold">Performance breakdown</CardTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Attributed Sales counts only the recommended product value. Click a row to see converted orders.
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 px-4 text-[11px] font-medium text-muted-foreground">Touchpoint</th>
                    <th className="text-right py-2.5 px-4 text-[11px] font-medium text-muted-foreground">
                      Attributed Sales <Info size={11} className="inline mb-0.5 ml-0.5 text-muted-foreground/40" />
                    </th>
                    <th className="text-right py-2.5 px-4 text-[11px] font-medium text-muted-foreground">
                      Converted Orders <Info size={11} className="inline mb-0.5 ml-0.5 text-muted-foreground/40" />
                    </th>
                    <th className="text-right py-2.5 px-4 text-[11px] font-medium text-muted-foreground">
                      CTR <Info size={11} className="inline mb-0.5 ml-0.5 text-muted-foreground/40" />
                    </th>
                    <th className="text-right py-2.5 px-4 text-[11px] font-medium text-muted-foreground">
                      Clicks <Info size={11} className="inline mb-0.5 ml-0.5 text-muted-foreground/40" />
                    </th>
                    <th className="text-right py-2.5 px-4 text-[11px] font-medium text-muted-foreground">
                      Impressions <Info size={11} className="inline mb-0.5 ml-0.5 text-muted-foreground/40" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTouchpoints.map((row) => (
                    <tr
                      key={row.touchpoint}
                      onClick={() => setSelectedRow(row)}
                      className="border-b border-border/40 hover:bg-muted/30 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-foreground">{row.touchpoint}</td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        ${row.attributedSales.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        <span className="ml-1.5 text-[10px] text-emerald-600 font-medium">(+{row.salesDelta}%)</span>
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-muted-foreground">{row.ordersInfluenced}</td>
                      <td className="py-3 px-4 text-right tabular-nums text-muted-foreground">{row.ctr}%</td>
                      <td className="py-3 px-4 text-right tabular-nums text-muted-foreground">{row.clicks.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right tabular-nums text-muted-foreground">{row.impressions.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="h-6" />
      </div>

      {/* Order details panel */}
      <OrderDetailsPanel row={selectedRow} onClose={() => setSelectedRow(null)} />
    </div>
  );
}

/* ── Placeholder sub-tabs ── */
function PlaceholderTab({ label }: { label: string }) {
  return (
    <div className="flex-1 flex items-center justify-center text-muted-foreground text-[13px]">
      {label} — coming soon
    </div>
  );
}

/* ── Main Page ── */
export default function SalesAgentPage() {
  const [subTab, setSubTab] = useState<AgentSubTab>("analytics");
  const [showBanner, setShowBanner] = useState(true);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {showBanner && <SalesAgentBanner onClose={() => setShowBanner(false)} />}
      {/* Sub-tabs */}
      <div className="px-5 py-0 flex items-center gap-1 border-b border-border bg-white shrink-0">
        {(["touchpoints", "strategies", "analytics"] as AgentSubTab[]).map((tab) => (
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

      {subTab === "analytics"   && <AnalyticsTab />}
      {subTab === "touchpoints" && <PlaceholderTab label="Touchpoints" />}
      {subTab === "strategies"  && <PlaceholderTab label="Strategies" />}
    </div>
  );
}
