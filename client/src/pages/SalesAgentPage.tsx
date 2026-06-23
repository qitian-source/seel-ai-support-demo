/*
 * SalesAgentPage — Sales Agent analytics with touchpoints & strategies
 * Analytics tab redesigned around the full funnel: Mode filter →
 * 6 KPI cards → Daily Trend (composed) + Conversion Funnel → Mode Breakdown → table.
 * Metrics are aggregated from salesDaily for the selected time range + modes.
 * Row click → Order Details slide-over panel.
 */
import { useState, useMemo, useRef, useEffect } from "react";
import {
  salesDaily, salesTouchpoints, SALES_MODES,
  type SalesDailyPoint, type SalesOrder,
} from "@/lib/data";
import SalesAgentBanner from "@/components/SalesAgentBanner";
import TimeRangePicker, { type TimeRangeValue } from "@/components/TimeRangePicker";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, X, Info, Sparkles, MessageSquare, ArrowRight, ChevronDown } from "lucide-react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";

type AgentSubTab = "touchpoints" | "strategies" | "analytics";
type TimeRange = "yesterday" | "7d" | "30d" | "90d" | "custom";

const DAYS_MAP: Record<TimeRange, number> = { yesterday: 1, "7d": 7, "30d": 30, "90d": 90, custom: 30 };

/* Series colors (also used in the legend / breakdown) */
const C = { impressions: "#6c47ff", clicks: "#06b6d4", orders: "#f59e0b", revenue: "#10b981" };

/* ── Aggregation helpers ── */
interface Totals { impressions: number; clicks: number; orders: number; revenue: number; }
const emptyTotals = (): Totals => ({ impressions: 0, clicks: 0, orders: 0, revenue: 0 });

function sumModes(point: SalesDailyPoint, keys: string[]): Totals {
  const t = emptyTotals();
  for (const k of keys) {
    const m = point.byMode[k];
    if (!m) continue;
    t.impressions += m.impressions; t.clicks += m.clicks; t.orders += m.orders; t.revenue += m.revenue;
  }
  return t;
}
function aggregate(points: SalesDailyPoint[], keys: string[]): Totals {
  const t = emptyTotals();
  for (const p of points) {
    const s = sumModes(p, keys);
    t.impressions += s.impressions; t.clicks += s.clicks; t.orders += s.orders; t.revenue += s.revenue;
  }
  return t;
}
const ctrOf = (t: Totals) => (t.impressions ? (t.clicks / t.impressions) * 100 : 0);
const cvrOf = (t: Totals) => (t.clicks ? (t.orders / t.clicks) * 100 : 0);

function pctDelta(curV: number, prevV: number): { delta: string; positive: boolean } | null {
  if (!prevV) return null;
  const d = ((curV - prevV) / prevV) * 100;
  return { delta: `${d >= 0 ? "+" : ""}${d.toFixed(1)}%`, positive: d >= 0 };
}

const usd = (v: number, dp = 2) => `$${v.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;

/* View-model row for table + slide-over */
interface ModeRow {
  key: string; label: string; color: string;
  impressions: number; clicks: number; orders: number; revenue: number;
  ctr: number; cvr: number;
  salesDelta: number; sampleOrders: SalesOrder[];
}

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
function OrderDetailsPanel({ row, onClose }: { row: ModeRow | null; onClose: () => void }) {
  const [convOrder, setConvOrder] = useState<SalesOrder | null>(null);
  if (!row) return null;
  const stats = [
    { label: "CTR", value: `${row.ctr.toFixed(2)}%` },
    { label: "CVR", value: `${row.cvr.toFixed(2)}%` },
  ];
  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[480px] bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-[14px] font-semibold text-foreground">{row.label}</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {row.orders.toLocaleString()} converted orders · {usd(row.revenue)} revenue
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted/60 text-muted-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 gap-0 border-b border-border">
          {stats.map((s) => (
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
            <span className="text-[11px] text-muted-foreground">{row.sampleOrders.length} shown</span>
          </div>
          <div className="space-y-3">
            {row.sampleOrders.map((order) => (
              <div key={order.id} className="border border-border rounded-lg p-3.5 hover:bg-muted/20 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[12px] font-mono font-medium text-[#6c47ff]">{order.id}</span>
                  <StatusBadge status={order.status} />
                  <span className="text-[11px] text-muted-foreground ml-1">{order.email}</span>
                </div>
                <div className="bg-muted/30 rounded-md px-3 py-2 space-y-1 mb-2">
                  {order.items.map((item, idx) => {
                    const isRecommended = item.name === order.recommendedItem;
                    return (
                      <div key={idx} className={cn("flex items-center justify-between text-[11px] rounded px-2 py-1 -mx-2", isRecommended ? "bg-[#f0edff]" : "")}>
                        <span className={cn("flex items-center gap-1.5", isRecommended ? "text-[#6c47ff] font-medium" : "text-foreground")}>
                          {isRecommended && <Sparkles size={10} className="text-[#6c47ff] shrink-0" />}
                          {item.name} ×{item.qty}
                          {isRecommended && (
                            <span className="text-[9px] font-semibold tracking-wide bg-[#6c47ff] text-white px-1.5 py-0.5 rounded-full">Recommended</span>
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
                {/* Conversation that drove this order — click to view the thread */}
                <button
                  onClick={() => setConvOrder(order)}
                  className="mt-2 flex items-center gap-1.5 text-[11px] text-[#6c47ff] hover:underline"
                >
                  <MessageSquare size={12} />
                  <span className="font-mono">{order.conversationId}</span>
                  <span className="text-muted-foreground">· View conversation</span>
                  <ArrowRight size={11} />
                </button>
              </div>
            ))}
          </div>
          {row.sampleOrders.length < row.orders && (
            <p className="text-center text-[11px] text-muted-foreground mt-4">
              Showing {row.sampleOrders.length} of {row.orders.toLocaleString()} orders
            </p>
          )}
        </div>
      </div>

      {/* Sales conversation thread for the clicked order */}
      <SalesConversationPanel order={convOrder} onClose={() => setConvOrder(null)} />
    </>
  );
}

/* ── Sales conversation slide-over — the thread that drove a converted order ── */
function buildSalesThread(order: SalesOrder): { from: "customer" | "agent" | "system"; text: string }[] {
  const opener: Record<string, string> = {
    "Resolution Center": `Hi, I was sorting out my recent order and wanted to ask about ${order.items[0]?.name ?? "a product"}.`,
    "WFP Confirmation Email": `Thanks for the email — while I'm here, is ${order.recommendedItem} a good fit for me?`,
    "Support Chat": `Hey! I'm looking for ${order.recommendedItem} — is it in stock?`,
    "Search Bar": `Searching for ${order.recommendedItem}… do you have it?`,
  };
  const firstMsg = opener[order.touchpoint] ?? `Hi, I'm interested in ${order.recommendedItem}.`;
  return [
    { from: "system", text: `Sales conversation started · ${order.touchpoint} · ${order.channel}` },
    { from: "customer", text: firstMsg },
    { from: "agent", text: `Great choice! ${order.recommendedItem} is one of our most-loved picks and pairs well with what you're viewing. I can add it to your cart now.` },
    { from: "customer", text: `Sounds good, let's do it.` },
    { from: "agent", text: `Done — I've added ${order.recommendedItem} to your cart. Your order total is ${order.total}.` },
    { from: "system", text: `Order ${order.id} placed · ${order.total} · ${order.status}` },
  ];
}

function SalesConversationPanel({ order, onClose }: { order: SalesOrder | null; onClose: () => void }) {
  if (!order) return null;
  const thread = buildSalesThread(order);
  const meta: { label: string; value: string }[] = [
    { label: "Conversation", value: order.conversationId },
    { label: "Order", value: order.id },
    { label: "Customer", value: `${order.customer} (${order.email})` },
    { label: "Touchpoint", value: order.touchpoint },
    { label: "Channel", value: order.channel },
    { label: "Recommended", value: order.recommendedItem },
    { label: "Total", value: order.total },
    { label: "Date", value: order.date },
  ];
  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-[60]" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[440px] bg-white shadow-2xl z-[70] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-[14px] font-semibold text-foreground flex items-center gap-1.5">
              <MessageSquare size={14} className="text-[#6c47ff]" />
              Sales conversation
              <span className="font-mono text-[12px] text-muted-foreground ml-1">{order.conversationId}</span>
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Recommended <span className="text-[#6c47ff] font-medium">{order.recommendedItem}</span> → order {order.id}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted/60 text-muted-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 px-5 py-3 border-b border-border">
          {meta.map((m) => (
            <div key={m.label} className="min-w-0">
              <div className="text-[10px] text-muted-foreground">{m.label}</div>
              <div className="text-[11px] text-foreground truncate">{m.value}</div>
            </div>
          ))}
        </div>

        {/* Thread */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {thread.map((msg, i) => {
            if (msg.from === "system") {
              return (
                <div key={i} className="text-center">
                  <span className="text-[10px] text-muted-foreground bg-muted/50 rounded-full px-2.5 py-1">{msg.text}</span>
                </div>
              );
            }
            const isCustomer = msg.from === "customer";
            return (
              <div key={i} className={cn("flex", isCustomer ? "justify-start" : "justify-end")}>
                <div className={cn("max-w-[80%] rounded-lg px-3 py-2 text-[12px]", isCustomer ? "bg-muted/50 text-foreground" : "bg-[#f0edff] text-foreground")}>
                  <div className={cn("text-[10px] font-medium mb-0.5", isCustomer ? "text-muted-foreground" : "text-[#6c47ff]")}>
                    {isCustomer ? order.customer : "Sales Agent"}
                  </div>
                  {msg.text}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

/* ── Touchpoint dropdown filter (Clear All + checkboxes + Apply) ── */
function TouchpointPicker({
  selected,
  onApply,
}: {
  selected: string[];
  onApply: (keys: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(selected);
  const ref = useRef<HTMLDivElement>(null);

  // Re-sync the draft with the applied selection whenever the panel opens.
  useEffect(() => {
    if (open) setDraft(selected);
  }, [open, selected]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const label =
    selected.length === SALES_MODES.length
      ? "All touchpoints"
      : selected.length === 1
        ? SALES_MODES.find((m) => m.key === selected[0])!.label
        : `${selected.length} touchpoints`;

  function toggle(key: string) {
    setDraft((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  function apply() {
    // Empty selection falls back to all touchpoints ("All touchpoints").
    onApply(draft.length ? draft : SALES_MODES.map((m) => m.key));
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-white text-[12px] text-foreground hover:bg-[#f5f5f5] transition-colors"
      >
        <span>{label}</span>
        <ChevronDown size={13} className="text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 top-10 w-[260px] bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.10)] border border-border z-50 overflow-hidden">
          <button
            onClick={() => setDraft([])}
            className="w-full text-left px-4 pt-3 pb-2 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear All
          </button>
          <div className="px-2 pb-1">
            {SALES_MODES.map((m) => (
              <label
                key={m.key}
                className="flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-muted/40 cursor-pointer select-none"
              >
                <Checkbox
                  checked={draft.includes(m.key)}
                  onCheckedChange={() => toggle(m.key)}
                  className="size-4"
                />
                <span className="text-[13px] text-foreground">{m.label}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end px-3 py-2.5 border-t border-border">
            <button
              onClick={apply}
              className="h-8 px-4 rounded-lg bg-[#6c47ff] text-white text-[12px] font-medium hover:bg-[#5a39d6] transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Analytics sub-tab ── */
function AnalyticsTab() {
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [customRange, setCustomRange] = useState<{ from: string; to: string } | undefined>();
  const [selKeys, setSelKeys] = useState<string[]>(SALES_MODES.map((m) => m.key));
  const [selectedRow, setSelectedRow] = useState<ModeRow | null>(null);

  const days = DAYS_MAP[timeRange];
  const cur  = useMemo(() => salesDaily.slice(-days), [days]);
  const prev = useMemo(() => salesDaily.slice(-days * 2, -days), [days]);

  const curAgg  = useMemo(() => aggregate(cur, selKeys), [cur, selKeys]);
  const prevAgg = useMemo(() => aggregate(prev, selKeys), [prev, selKeys]);

  const kpis = useMemo(() => [
    { label: "Impressions", value: curAgg.impressions.toLocaleString(), d: pctDelta(curAgg.impressions, prevAgg.impressions) },
    { label: "Clicks",      value: curAgg.clicks.toLocaleString(),      d: pctDelta(curAgg.clicks, prevAgg.clicks) },
    { label: "CTR",         value: `${ctrOf(curAgg).toFixed(2)}%`,      d: pctDelta(ctrOf(curAgg), ctrOf(prevAgg)) },
    { label: "Orders",      value: curAgg.orders.toLocaleString(),      d: pctDelta(curAgg.orders, prevAgg.orders) },
    { label: "CVR",         value: `${cvrOf(curAgg).toFixed(2)}%`,      d: pctDelta(cvrOf(curAgg), cvrOf(prevAgg)) },
    { label: "Revenue",     value: usd(curAgg.revenue),                 d: pctDelta(curAgg.revenue, prevAgg.revenue) },
  ], [curAgg, prevAgg]);

  const chartData = useMemo(
    () => cur.map((p) => ({ date: p.date, ...sumModes(p, selKeys) })),
    [cur, selKeys]
  );

  const modeRows: ModeRow[] = useMemo(
    () => SALES_MODES.filter((m) => selKeys.includes(m.key)).map((m) => {
      const agg = aggregate(cur, [m.key]);
      const meta = salesTouchpoints.find((s) => s.key === m.key)!;
      return {
        key: m.key, label: m.label, color: m.color,
        ...agg, ctr: ctrOf(agg), cvr: cvrOf(agg),
        salesDelta: meta.salesDelta, sampleOrders: meta.orders,
      };
    }),
    [cur, selKeys]
  );

  const tooltipLabels: Record<string, string> = {
    impressions: "Impressions", clicks: "Clicks", orders: "Orders", revenue: "Revenue",
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[1240px] mx-auto px-6 py-5">

        {/* Filters */}
        <div className="flex items-center gap-4 mb-5 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-muted-foreground">Time range</span>
            <TimeRangePicker
              value={timeRange as TimeRangeValue}
              customRange={customRange}
              onChange={(v, custom) => { setTimeRange(v as TimeRange); if (custom) setCustomRange(custom); }}
            />
          </div>
          <TouchpointPicker selected={selKeys} onApply={setSelKeys} />
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
          {kpis.map((k) => (
            <Card key={k.label}>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-start justify-between">
                  <span className="text-[11px] text-muted-foreground leading-tight">{k.label}</span>
                  <Info size={12} className="text-muted-foreground/40 mt-0.5 shrink-0" />
                </div>
                <div className="mt-2 text-[20px] font-bold text-foreground tabular-nums leading-none">{k.value}</div>
                {k.d && (
                  <div className={cn("flex items-center gap-1 mt-1.5 text-[11px] font-medium", k.d.positive ? "text-emerald-600" : "text-red-500")}>
                    {k.d.positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    <span>{k.d.delta}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Daily Trend */}
        <div className="mb-5">
          <Card>
            <CardHeader className="pb-3 flex-row items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-[13px] font-semibold">Daily trend</CardTitle>
                <Info size={13} className="text-muted-foreground/40" />
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                {[
                  { label: "Impressions", color: C.impressions },
                  { label: "Clicks",      color: C.clicks },
                  { label: "Orders",      color: C.orders },
                  { label: "Revenue",     color: C.revenue },
                ].map((s) => (
                  <span key={s.label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: s.color }} />
                    {s.label}
                  </span>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} interval={Math.max(0, Math.floor(chartData.length / 8))} />
                    <YAxis yAxisId="left" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                    <RechartsTooltip
                      contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }}
                      formatter={(value: number, name: string) => {
                        const v = name === "revenue" ? usd(value) : value.toLocaleString();
                        return [v, tooltipLabels[name] || name];
                      }}
                    />
                    <Bar yAxisId="left" dataKey="impressions" fill={C.impressions} radius={[2, 2, 0, 0]} maxBarSize={18} opacity={0.85} />
                    <Line yAxisId="left" type="monotone" dataKey="revenue" stroke={C.revenue} strokeWidth={2} strokeDasharray="4 3" dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="clicks" stroke={C.clicks} strokeWidth={2} dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="orders" stroke={C.orders} strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Breakdown Table */}
        <Card>
          <CardHeader className="pb-2">
            <div>
              <CardTitle className="text-[13px] font-semibold">Performance breakdown</CardTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Revenue counts only the recommended product value. Click a row to see converted orders.
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 px-4 text-[11px] font-medium text-muted-foreground">Touchpoint</th>
                    {["Impressions", "Clicks", "CTR", "Orders", "CVR", "Revenue"].map((h) => (
                      <th key={h} className="text-right py-2.5 px-4 text-[11px] font-medium text-muted-foreground">
                        {h} <Info size={11} className="inline mb-0.5 ml-0.5 text-muted-foreground/40" />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {modeRows.map((row) => (
                    <tr
                      key={row.key}
                      onClick={() => setSelectedRow(row)}
                      className="border-b border-border/40 hover:bg-muted/30 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-foreground">{row.label}</td>
                      <td className="py-3 px-4 text-right tabular-nums text-muted-foreground">{row.impressions.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right tabular-nums text-muted-foreground">{row.clicks.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right tabular-nums text-muted-foreground">{row.ctr.toFixed(2)}%</td>
                      <td className="py-3 px-4 text-right tabular-nums text-muted-foreground">{row.orders.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right tabular-nums text-muted-foreground">{row.cvr.toFixed(2)}%</td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        {usd(row.revenue)}
                        <span className="ml-1.5 text-[10px] text-emerald-600 font-medium">(+{row.salesDelta}%)</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="h-6" />
      </div>

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
