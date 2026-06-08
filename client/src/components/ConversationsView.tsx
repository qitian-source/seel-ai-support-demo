/*
 * ConversationsView — shared conversation-log table with filters.
 * Used by:
 *   - PerformancePage  → Conversations sub-tab (all channels)
 *   - LiveWidgetPage   → Conversations sub-tab (lockedChannel="Live Chat Widget")
 *
 * Pass `lockedChannel` to pin the channel filter (the Channel control is then
 * hidden and shown as a non-removable context chip).
 */
import { useState, useMemo } from "react";
import { conversationLogs } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowUpDown, Search, SlidersHorizontal, X, Download } from "lucide-react";
import ConversationLogSidebar from "@/components/ConversationLogSidebar";
import TimeRangePicker, { type TimeRangeValue } from "@/components/TimeRangePicker";
import { type ChannelValue } from "@/components/ChannelPicker";

type TimeRange = "yesterday" | "7d" | "30d" | "90d" | "custom";
type OutcomeFilter = "all" | "Resolved" | "Escalated" | "Handling";
type IntentFilter = "all" | "WISMO" | "Cancellation" | "Address Change" | "Refund" | "Complaint";
type SentimentFilter = "all" | "Satisfied" | "Positive" | "Neutral" | "Negative" | "Furious";
type EntrySentimentFilter = "all" | "Satisfied" | "Positive" | "Neutral" | "Negative" | "Furious";
type ModeFilter = "all" | "Production" | "Training";
type SortField = "ticketId" | "intent" | "sentiment" | "outcome" | "mode" | "turns" | "time";
type SortDir = "asc" | "desc";

/* Parse a ConversationLog.startedAt ("Today 9:41 AM" or "2026/3/29 00:10:00") to a date-only Date */
function parseLogDate(startedAt: string): Date {
  if (startedAt.startsWith("Today")) {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  }
  const m = startedAt.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  const d = new Date(); d.setHours(0, 0, 0, 0); return d;
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

export default function ConversationsView({ lockedChannel }: { lockedChannel?: ChannelValue }) {
  const [convTimeRange, setConvTimeRange] = useState<TimeRange>("7d");
  const [convCustomRange, setConvCustomRange] = useState<{ from: string; to: string } | undefined>();
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>("all");
  const [intentFilter, setIntentFilter] = useState<IntentFilter>("all");
  const [sentimentFilter, setSentimentFilter] = useState<SentimentFilter>("all");
  const [entrySentimentFilter, setEntrySentimentFilter] = useState<EntrySentimentFilter>("all");
  const [modeFilter, setModeFilter] = useState<ModeFilter>("all");
  const [convChannelFilter, setConvChannelFilter] = useState<ChannelValue>(lockedChannel ?? "all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("time");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const exportEmail = "mstar@seel.com";
  const toggleRowSelect = (id: string) =>
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // When a channel is locked, that filter is always applied and not user-editable.
  const effectiveChannel = lockedChannel ?? convChannelFilter;

  /* baseLogs = search + secondary filters (intent / sentiments), but NOT outcome —
     so the outcome segmented control can show live counts per segment. */
  const baseLogs = useMemo(() => {
    let logs = [...conversationLogs];
    // Time range
    if (convTimeRange === "custom" && convCustomRange?.from && convCustomRange?.to) {
      const from = new Date(convCustomRange.from); from.setHours(0, 0, 0, 0);
      const to   = new Date(convCustomRange.to);   to.setHours(23, 59, 59, 999);
      logs = logs.filter((l) => { const d = parseLogDate(l.startedAt); return d >= from && d <= to; });
    } else if (convTimeRange !== "custom") {
      const days = { yesterday: 1, "7d": 7, "30d": 30, "90d": 90, custom: 30 }[convTimeRange];
      const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - (days - 1));
      logs = logs.filter((l) => parseLogDate(l.startedAt) >= start);
    }
    if (intentFilter !== "all")         logs = logs.filter((l) => l.intent === intentFilter);
    if (entrySentimentFilter !== "all") logs = logs.filter((l) => l.entrySentiment === entrySentimentFilter);
    if (sentimentFilter !== "all")      logs = logs.filter((l) => l.sentiment === sentimentFilter);
    if (modeFilter !== "all")           logs = logs.filter((l) => l.mode === modeFilter);
    if (effectiveChannel !== "all")     logs = logs.filter((l) => l.channel === effectiveChannel);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      logs = logs.filter((l) =>
        l.ticketId.toLowerCase().includes(q) ||
        l.customer.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.summary.toLowerCase().includes(q)
      );
    }
    return logs;
  }, [convTimeRange, convCustomRange, intentFilter, entrySentimentFilter, sentimentFilter, modeFilter, effectiveChannel, searchQuery]);

  const outcomeCounts = useMemo(() => ({
    all:       baseLogs.length,
    Resolved:  baseLogs.filter((l) => l.outcome === "Resolved").length,
    Escalated: baseLogs.filter((l) => l.outcome === "Escalated").length,
    Handling:  baseLogs.filter((l) => l.outcome === "Handling").length,
  }), [baseLogs]);

  const filteredLogs = useMemo(() => {
    let logs = outcomeFilter === "all" ? baseLogs : baseLogs.filter((l) => l.outcome === outcomeFilter);
    logs = [...logs].sort((a, b) => {
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
  }, [baseLogs, outcomeFilter, sortField, sortDir]);

  /* Secondary (popover) filter bookkeeping — Channel omitted when locked */
  const activeFilters = useMemo(() => {
    const chips: { key: string; label: string; value: string; clear: () => void }[] = [];
    if (modeFilter !== "all")           chips.push({ key: "mode",    label: "Mode",     value: modeFilter,           clear: () => setModeFilter("all") });
    if (!lockedChannel && convChannelFilter !== "all")
      chips.push({ key: "channel", label: "Channel",  value: convChannelFilter,    clear: () => setConvChannelFilter("all") });
    if (intentFilter !== "all")         chips.push({ key: "intent",  label: "Intent",   value: intentFilter,         clear: () => setIntentFilter("all") });
    if (entrySentimentFilter !== "all") chips.push({ key: "entry",   label: "Incoming", value: entrySentimentFilter, clear: () => setEntrySentimentFilter("all") });
    if (sentimentFilter !== "all")      chips.push({ key: "exit",    label: "Exit",     value: sentimentFilter,      clear: () => setSentimentFilter("all") });
    return chips;
  }, [intentFilter, entrySentimentFilter, sentimentFilter, modeFilter, convChannelFilter, lockedChannel]);

  const clearAllFilters = () => {
    setIntentFilter("all");
    setEntrySentimentFilter("all");
    setSentimentFilter("all");
    setModeFilter("all");
    if (!lockedChannel) setConvChannelFilter("all");
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  };

  const SortIcon = ({ field }: { field: SortField }) => (
    <ArrowUpDown className={cn("w-3 h-3 inline ml-0.5", sortField === field ? "text-foreground" : "text-muted-foreground/30")} />
  );

  return (
    <>
      {/* Title + count */}
      <div className="flex items-baseline gap-2 mb-3">
        <h1 className="text-[15px] font-semibold text-foreground">Conversations</h1>
        <span className="text-[12px] text-muted-foreground">{filteredLogs.length} results</span>
        {selectedIds.size > 0 && (
          <span className="text-[12px] font-medium text-[#6c47ff]">· {selectedIds.size} rows selected</span>
        )}
      </div>

      {/* Toolbar: primary outcome segments (left) + search & filter (right) */}
      <div className="flex items-center justify-between gap-3 mb-3">
        {/* Outcome segmented control */}
        <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-muted/60 border border-border/50">
          {([
            { v: "all" as OutcomeFilter,       label: "All" },
            { v: "Resolved" as OutcomeFilter,  label: "Resolved" },
            { v: "Escalated" as OutcomeFilter, label: "Escalated" },
            { v: "Handling" as OutcomeFilter,  label: "Handling" },
          ]).map(({ v, label }) => (
            <button
              key={v}
              onClick={() => setOutcomeFilter(v)}
              className={cn(
                "flex items-center gap-1.5 px-3 h-7 rounded-md text-[12px] font-medium transition-colors",
                outcomeFilter === v
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
              <span className={cn(
                "text-[10px] tabular-nums px-1.5 rounded-full",
                outcomeFilter === v ? "bg-muted text-foreground" : "bg-muted-foreground/10 text-muted-foreground"
              )}>
                {outcomeCounts[v]}
              </span>
            </button>
          ))}
        </div>

        {/* Search + Time range + Filter */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search ticket ID, email…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 h-8 rounded-lg border border-border/50 bg-white text-[12px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30 w-[220px]"
            />
          </div>

          <TimeRangePicker
            value={convTimeRange as TimeRangeValue}
            customRange={convCustomRange}
            onChange={(v, custom) => {
              setConvTimeRange(v as TimeRange);
              if (custom) setConvCustomRange(custom);
            }}
          />

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 gap-1.5 text-[12px] bg-white",
                  activeFilters.length > 0 && "border-primary/40 text-primary"
                )}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filter
                {activeFilters.length > 0 && (
                  <span className="ml-0.5 text-[10px] tabular-nums bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center">
                    {activeFilters.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-3">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] font-semibold text-foreground">Filters</span>
                {activeFilters.length > 0 && (
                  <button onClick={clearAllFilters} className="text-[11px] text-muted-foreground hover:text-foreground">
                    Clear all
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {/* Mode */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">Mode</label>
                  <Select value={modeFilter} onValueChange={(v) => setModeFilter(v as ModeFilter)}>
                    <SelectTrigger className="h-8 text-[12px] bg-white">
                      <SelectValue placeholder="All modes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All modes</SelectItem>
                      <SelectItem value="Production">Production</SelectItem>
                      <SelectItem value="Training">Training</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Channel — hidden when locked to a specific channel */}
                {!lockedChannel && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">Channel</label>
                    <Select value={convChannelFilter} onValueChange={(v) => setConvChannelFilter(v as ChannelValue)}>
                      <SelectTrigger className="h-8 text-[12px] bg-white">
                        <SelectValue placeholder="All channels" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All channels</SelectItem>
                        <SelectItem value="Zendesk">Zendesk</SelectItem>
                        <SelectItem value="Live Chat Widget">Live Chat Widget</SelectItem>
                        <SelectItem value="Email">Email</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {/* Intent */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">Intent</label>
                  <Select value={intentFilter} onValueChange={(v) => setIntentFilter(v as IntentFilter)}>
                    <SelectTrigger className="h-8 text-[12px] bg-white">
                      <SelectValue placeholder="All intents" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All intents</SelectItem>
                      {(["WISMO", "Cancellation", "Address Change", "Refund", "Complaint"] as IntentFilter[]).filter(v => v !== "all").map((i) => (
                        <SelectItem key={i} value={i}>{i}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Incoming Sentiment */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">Incoming sentiment</label>
                  <Select value={entrySentimentFilter} onValueChange={(v) => setEntrySentimentFilter(v as EntrySentimentFilter)}>
                    <SelectTrigger className="h-8 text-[12px] bg-white">
                      <SelectValue placeholder="All incoming sentiments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All incoming sentiments</SelectItem>
                      <SelectItem value="Satisfied">Satisfied</SelectItem>
                      <SelectItem value="Positive">Positive</SelectItem>
                      <SelectItem value="Neutral">Neutral</SelectItem>
                      <SelectItem value="Negative">Negative</SelectItem>
                      <SelectItem value="Furious">Furious</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Exit Sentiment */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">Exit sentiment</label>
                  <Select value={sentimentFilter} onValueChange={(v) => setSentimentFilter(v as SentimentFilter)}>
                    <SelectTrigger className="h-8 text-[12px] bg-white">
                      <SelectValue placeholder="All exit sentiments" />
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
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            size="sm"
            disabled={selectedIds.size === 0}
            className="h-8 gap-1.5 text-[12px] bg-[#6c47ff] hover:bg-[#5a3ad9] text-white disabled:opacity-50"
            onClick={() => setExportOpen(true)}
          >
            <Download className="w-3.5 h-3.5" />
            Download CSV
          </Button>
        </div>
      </div>

      {/* Active filter chips */}
      {(lockedChannel || activeFilters.length > 0) && (
        <div className="flex items-center gap-1.5 flex-wrap mb-3">
          {/* Locked channel — non-removable context chip */}
          {lockedChannel && (
            <span className="inline-flex items-center gap-1 h-6 pl-2 pr-2 rounded-full bg-muted border border-border/50 text-[11px] text-foreground">
              <span className="text-muted-foreground">Channel:</span>
              <span className="font-medium">{lockedChannel}</span>
            </span>
          )}
          {activeFilters.map((f) => (
            <button
              key={f.key}
              onClick={f.clear}
              className="group inline-flex items-center gap-1 h-6 pl-2 pr-1.5 rounded-full bg-primary/5 border border-primary/20 text-[11px] text-foreground hover:bg-primary/10 transition-colors"
            >
              <span className="text-muted-foreground">{f.label}:</span>
              <span className="font-medium">{f.value}</span>
              <X className="w-3 h-3 text-muted-foreground group-hover:text-foreground" />
            </button>
          ))}
          {activeFilters.length > 0 && (
            <button onClick={clearAllFilters} className="text-[11px] text-muted-foreground hover:text-foreground ml-1">
              Clear all
            </button>
          )}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b bg-muted/20">
                  <th className="py-2.5 px-3 w-9">
                    <Checkbox
                      checked={filteredLogs.length > 0 && filteredLogs.every((l) => selectedIds.has(l.ticketId))}
                      onCheckedChange={(c) =>
                        setSelectedIds(c ? new Set(filteredLogs.map((l) => l.ticketId)) : new Set())
                      }
                      aria-label="Select all"
                    />
                  </th>
                  {[
                    { label: "Ticket",    field: "ticketId"  as SortField },
                    { label: "Customer",  field: null },
                    { label: "Email",     field: null },
                    { label: "Intent",    field: "intent"    as SortField },
                    { label: "Exit Sent.", field: "sentiment" as SortField },
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
                    <td className="py-2.5 px-3 w-9" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(log.ticketId)}
                        onCheckedChange={() => toggleRowSelect(log.ticketId)}
                        aria-label={`Select ${log.ticketId}`}
                      />
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="text-primary font-mono text-[11px]">{log.ticketId}</span>
                    </td>
                    <td className="py-2.5 px-3 text-[11px] whitespace-nowrap">{log.customer}</td>
                    <td className="py-2.5 px-3 text-[11px] text-muted-foreground whitespace-nowrap">{log.email}</td>
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

      <ConversationLogSidebar ticketId={selectedTicketId} onClose={() => setSelectedTicketId(null)} />

      {/* Export conversation records — emailed download link */}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-[15px]">Export conversation records</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            Exporting <span className="font-medium text-foreground">{selectedIds.size}</span> selected record{selectedIds.size === 1 ? "" : "s"}.
            The export process may take several minutes depending on the amount of data.
            Once completed, we'll send a download link to your email:{" "}
            <span className="font-medium text-foreground">{exportEmail}</span>
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportOpen(false)}>Cancel</Button>
            <Button
              className="bg-[#6c47ff] hover:bg-[#5a3ad9] text-white"
              onClick={() => {
                setExportOpen(false);
                toast.success("Export started", { description: `We'll email the download link for ${selectedIds.size} record(s) to ${exportEmail} when it's ready.` });
              }}
            >
              Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

