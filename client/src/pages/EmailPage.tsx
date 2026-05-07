/*
 * EmailPage — Redesigned
 * Layout: ResizableList | ThreadDetail + TicketInfoPanel
 * Status: new → open → pending → solved
 * Mode: configured in Settings > Channels, read from AppContext
 * AI Reply: inline in conversation, mode-colored
 */
import { useState, useRef, useEffect, useCallback } from "react";
import {
  emailThreads, type EmailThread, type EmailStatus, type EmailType,
  type OperationMode, type FlagRule,
} from "@/lib/data";
import { useApp } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Send, Bot, RefreshCw, CheckCircle2, Clock,
  AlertTriangle, Sparkles, Copy, RotateCcw,
  Inbox, User, Zap, Shield, X, ChevronDown,
  Mail, Check, Eye, EyeOff, Languages,
  GraduationCap, Bolt, Tag, Users,
  Bold, Image, Palette, ChevronRight, ChevronLeft,
  ArrowRight, Settings, Paperclip, FileText, XCircle, SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";

// ── Constants ──────────────────────────────────────────────────

const INBOX_EMAIL = "service@djiusa.com";
const CURRENT_USER = "Sarah Chen";

const STATUS_OPTIONS: { value: EmailStatus; label: string; cls: string; dot: string }[] = [
  { value: "new",     label: "New",     cls: "bg-gray-100 text-gray-600 border-gray-300",   dot: "bg-gray-400" },
  { value: "open",    label: "Open",    cls: "bg-blue-50 text-blue-700 border-blue-200",    dot: "bg-blue-500" },
  { value: "pending", label: "Pending", cls: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  { value: "solved",  label: "Solved",  cls: "bg-green-50 text-green-700 border-green-200", dot: "bg-green-500" },
];

const MODE_CONFIG: Record<OperationMode, {
  label: string; tagCls: string; bannerCls: string; replyCls: string; msgsBg: string; icon: React.FC<{ size?: number }>;
}> = {
  training:   { label: "Training",   tagCls: "bg-amber-400 text-white",         bannerCls: "bg-amber-50 border-amber-200 text-amber-700",    replyCls: "bg-amber-50 border-amber-200",    msgsBg: "bg-amber-50/40", icon: GraduationCap },
  production: { label: "Production", tagCls: "bg-blue-600 text-white",           bannerCls: "bg-blue-50 border-blue-200 text-blue-700",       replyCls: "bg-blue-50 border-blue-200",      msgsBg: "bg-blue-50/30",  icon: Bolt },
};

const EMAIL_TYPE_CONFIG: Record<EmailType, { label: string; cls: string; icon: React.ReactNode }> = {
  "user":     { label: "User",     cls: "bg-[#6c47ff]/10 text-[#6c47ff] border-[#6c47ff]/30",  icon: <Users size={9} /> },
  "non-user": { label: "Non-user", cls: "bg-orange-50 text-orange-700 border-orange-200",       icon: <Tag size={9} /> },
};

// ── Helpers ────────────────────────────────────────────────────

function statusInfo(s: EmailStatus) { return STATUS_OPTIONS.find((o) => o.value === s)!; }
function sentimentColor(s: string) {
  if (s === "frustrated" || s === "negative") return "text-red-600 bg-red-50";
  if (s === "positive") return "text-green-700 bg-green-50";
  return "text-gray-600 bg-gray-50";
}
function sentimentLabel(s: string) {
  return ({ frustrated: "Frustrated", negative: "Negative", positive: "Positive", neutral: "Neutral" })[s] ?? s;
}
function confidenceBand(c: number) {
  if (c >= 0.9) return { label: "High", cls: "text-green-700" };
  if (c >= 0.75) return { label: "Medium", cls: "text-amber-600" };
  return { label: "Low", cls: "text-red-600" };
}

function evaluateThread(thread: EmailThread, rules: FlagRule[]): boolean {
  const { aiCard } = thread;
  const on = (id: string) => rules.find(r => r.id === id)?.enabled ?? false;
  if (on("sentiment_frustrated") && (aiCard.sentiment === "frustrated" || aiCard.sentiment === "negative")) return true;
  if (on("low_confidence") && aiCard.confidence < 0.90) return true;
  if (on("complaint_intent") && aiCard.intent === "Complaint") return true;
  if (on("warranty_intent") && (aiCard.intent === "Warranty Coverage" || aiCard.intent === "Repair Status")) return true;
  if (on("no_order") && !aiCard.orderNumber) return true;
  return false;
}

// Date display helpers (today = 2026-05-07)
function parseTo24(raw: string): string {
  const parts = raw.trim().split(" ");
  const [hStr, mStr] = (parts[0] ?? "0:0").split(":");
  let h = parseInt(hStr ?? "0");
  const m = parseInt(mStr ?? "0");
  const ap = (parts[1] ?? "").toUpperCase();
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function shortDate(t: string): string {
  if (!t) return "";
  if (t.startsWith("Today "))     return `05/07 ${parseTo24(t.slice(6))}`;
  if (t.startsWith("Yesterday ")) return `05/06 ${parseTo24(t.slice(10))}`;
  return `05/07 ${parseTo24(t)}`;
}
function fullDate(t: string): string {
  if (!t) return "";
  if (t.startsWith("Today "))     return `2026/05/07 ${parseTo24(t.slice(6))}`;
  if (t.startsWith("Yesterday ")) return `2026/05/06 ${parseTo24(t.slice(10))}`;
  return `2026/05/07 ${parseTo24(t)}`;
}

// Sort key: parse "Today HH:MM" / "Yesterday HH:MM" to a numeric value (smaller = older = higher priority)
function timeToSortKey(t: string): number {
  const [period, time] = t.split(" ");
  const [hStr, mStr] = (time ?? "00:00").split(":");
  const h = parseInt(hStr ?? "0"), m = parseInt(mStr ?? "0");
  if (period === "Yesterday") return h * 60 + m;
  if (period === "Today") return 10000 + h * 60 + m;
  return 99999;
}

// ── Sub-components ─────────────────────────────────────────────

function StatusDropdown({ status, onChange, compact = false }: {
  status: EmailStatus; onChange: (s: EmailStatus) => void; compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const info = statusInfo(status);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button onClick={() => setOpen((v) => !v)}
        className={cn("flex items-center gap-1 border rounded-full font-medium transition-colors hover:opacity-80",
          compact ? "text-[10px] px-1.5 py-0.5" : "text-[11px] px-2.5 py-1", info.cls)}>
        {info.label}<ChevronDown size={compact ? 9 : 10} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-lg border border-border shadow-lg py-1 min-w-[110px]">
          {STATUS_OPTIONS.map((opt) => (
            <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] hover:bg-gray-50 transition-colors">
              <span className={cn("w-2 h-2 rounded-full", opt.dot)} />
              <span className="flex-1 text-left text-gray-700">{opt.label}</span>
              {opt.value === status && <Check size={11} className="text-[#6c47ff]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusFilterDropdown({ selected, onChange, counts }: {
  selected: Set<EmailStatus>;
  onChange: (s: Set<EmailStatus>) => void;
  counts: Record<EmailStatus, number>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const toggle = (v: EmailStatus) => {
    const next = new Set(selected);
    next.has(v) ? next.delete(v) : next.add(v);
    onChange(next);
  };
  const label = selected.size === 0 || selected.size === STATUS_OPTIONS.length
    ? "All statuses" : Array.from(selected).map(s => statusInfo(s).label).join(", ");
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border border-border text-gray-600 hover:bg-gray-50 transition-colors bg-white">
        <span className="truncate max-w-[110px]">{label}</span>
        <ChevronDown size={10} className="shrink-0" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white rounded-lg border border-border shadow-lg py-1 min-w-[160px]">
          <button onClick={() => onChange(new Set())}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-gray-50 text-gray-400">
            Clear filter
          </button>
          <div className="border-t border-border my-1" />
          {STATUS_OPTIONS.map((opt) => (
            <button key={opt.value} onClick={() => toggle(opt.value)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] hover:bg-gray-50">
              <span className={cn("w-3 h-3 rounded border flex items-center justify-center shrink-0",
                selected.has(opt.value) ? "bg-[#6c47ff] border-[#6c47ff]" : "border-gray-300")}>
                {selected.has(opt.value) && <Check size={8} className="text-white" />}
              </span>
              <span className={cn("w-2 h-2 rounded-full shrink-0", opt.dot)} />
              <span className="flex-1 text-left text-gray-700">{opt.label}</span>
              <span className="text-[10px] text-gray-400 shrink-0">{counts[opt.value]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EmailTypeBadge({ type }: { type: EmailType }) {
  const cfg = EMAIL_TYPE_CONFIG[type];
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[9px] font-semibold border rounded px-1 py-0.5 shrink-0", cfg.cls)}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function ModeBadge({ mode }: { mode: OperationMode }) {
  const cfg = MODE_CONFIG[mode];
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[9px] font-bold rounded-sm px-1.5 py-0.5 shrink-0 uppercase tracking-wide", cfg.tagCls)}>
      <Icon size={9} />{cfg.label}
    </span>
  );
}

// ── Escalation Rules Popover ───────────────────────────────────

const ESCALATION_RULE_IDS = ["sentiment_frustrated", "low_confidence", "complaint_intent"];

function EscalationRulesPanel() {
  const { emailFlagRules, setEmailFlagRules } = useApp();
  const toggle = (id: string) =>
    setEmailFlagRules(emailFlagRules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  const rules = emailFlagRules.filter(r => ESCALATION_RULE_IDS.includes(r.id));
  return (
    <div className="border-b border-border bg-gray-50/80">
      <div className="px-3 pt-2.5 pb-1 flex items-center gap-1.5">
        <SlidersHorizontal size={10} className="text-[#6c47ff] shrink-0" />
        <span className="text-[11px] font-semibold text-gray-700">Escalation Rules</span>
        <span className="text-[10px] text-gray-400 ml-1">· production mode</span>
      </div>
      <div className="px-3 pb-2.5 space-y-0.5">
        {rules.map(rule => (
          <button key={rule.id} onClick={() => toggle(rule.id)}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-100 text-left transition-colors">
            <div className={cn("w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors",
              rule.enabled ? "bg-[#6c47ff] border-[#6c47ff]" : "border-gray-300 bg-white")}>
              {rule.enabled && <Check size={8} className="text-white" />}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-medium text-gray-700">{rule.label}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Email List ─────────────────────────────────────────────────

const TYPE_TABS: { value: EmailType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "user", label: "User" },
  { value: "non-user", label: "Non-user" },
];

function EmailList({ threads, selectedId, onSelect, globalMode, onOpenSettings, width, onResizeStart }: {
  threads: EmailThread[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  globalMode: OperationMode;
  onOpenSettings: () => void;
  width: number;
  onResizeStart: (e: React.MouseEvent) => void;
}) {
  const [typeFilter, setTypeFilter] = useState<EmailType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<Set<EmailStatus>>(new Set());
  const [showRules, setShowRules] = useState(false);

  const statusCounts: Record<EmailStatus, number> = {
    new:     threads.filter(t => t.status === "new").length,
    open:    threads.filter(t => t.status === "open").length,
    pending: threads.filter(t => t.status === "pending").length,
    solved:  threads.filter(t => t.status === "solved").length,
  };

  const filtered = threads.filter((t) => {
    const typeOk = typeFilter === "all" || t.emailType === typeFilter;
    const statusOk = statusFilter.size === 0 || statusFilter.has(t.status);
    return typeOk && statusOk;
  });

  // Sort by updatedAt ascending (oldest first = most urgent)
  const sorted = [...filtered].sort((a, b) => timeToSortKey(a.updatedAt) - timeToSortKey(b.updatedAt));

  const typeCounts = {
    all: threads.length,
    user: threads.filter(t => t.emailType === "user").length,
    "non-user": threads.filter(t => t.emailType === "non-user").length,
  };

  return (
    <div className="flex shrink-0 h-full" style={{ width }}>
      <div className="flex-1 flex flex-col border-r border-border bg-white h-full min-w-0 relative">

        {/* Type tabs */}
        <div className="flex border-b border-border">
          {TYPE_TABS.map((tab) => (
            <button key={tab.value} onClick={() => setTypeFilter(tab.value)}
              className={cn("flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium border-b-2 -mb-[1px] transition-colors",
                typeFilter === tab.value ? "border-[#6c47ff] text-[#6c47ff]" : "border-transparent text-gray-400 hover:text-gray-600")}>
              {tab.label}
              <span className={cn("text-[9px] font-bold rounded-full px-1 leading-tight",
                typeFilter === tab.value ? "bg-[#6c47ff] text-white" : "bg-gray-100 text-gray-500")}>
                {typeCounts[tab.value]}
              </span>
            </button>
          ))}
        </div>

        {/* Status filter + Escalation rules toggle */}
        <div className="px-3 py-2 border-b border-border flex items-center gap-1.5">
          <StatusFilterDropdown selected={statusFilter} onChange={setStatusFilter} counts={statusCounts} />
          <span className="text-[10px] text-gray-400">{sorted.length} tickets</span>
          <button onClick={() => setShowRules(v => !v)}
            title="Escalation rules"
            className={cn("ml-auto flex items-center justify-center w-6 h-6 rounded-lg border transition-colors",
              showRules ? "bg-[#6c47ff] border-[#6c47ff] text-white" : "border-border text-gray-400 hover:text-[#6c47ff] hover:border-[#6c47ff]/40 hover:bg-[#6c47ff]/5")}>
            <SlidersHorizontal size={11} />
          </button>
        </div>
        {showRules && <EscalationRulesPanel />}

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {sorted.map((thread) => {
            const isSelected = thread.id === selectedId;
            const threadMode = thread.threadMode ?? globalMode;
            const info = statusInfo(thread.status);
            return (
              <button key={thread.id} onClick={() => onSelect(thread.id)}
                className={cn(
                  "w-full text-left px-3 py-2.5 border-b border-border/60 transition-colors hover:bg-gray-50",
                  isSelected ? "bg-[#6c47ff]/5 border-l-2 border-l-[#6c47ff]" : "border-l-2 border-l-transparent",
                )}>
                {/* Subject */}
                <div className={cn("text-[12px] truncate mb-1.5 leading-tight",
                  !thread.isRead ? "font-semibold text-gray-900" : "text-gray-600")}>
                  {thread.subject}
                </div>
                {/* Badges row */}
                <div className="flex items-center gap-1 flex-wrap">
                  <EmailTypeBadge type={thread.emailType} />
                  <span className={cn("inline-flex items-center gap-0.5 text-[9px] font-semibold border rounded px-1 py-0.5", info.cls)}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", info.dot)} />
                    {info.label}
                  </span>
                  <ModeBadge mode={threadMode} />
                  <span className="ml-auto text-[10px] text-gray-400 shrink-0">{shortDate(thread.updatedAt)}</span>
                </div>
              </button>
            );
          })}
          {sorted.length === 0 && (
            <div className="flex items-center justify-center py-10 text-[12px] text-gray-400">No tickets</div>
          )}
        </div>
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={onResizeStart}
        className="w-1.5 cursor-col-resize bg-transparent hover:bg-[#6c47ff]/20 transition-colors shrink-0 h-full"
        title="Drag to resize"
      />
    </div>
  );
}

// ── Formatting toolbar ──────────────────────────────────────────

function FormatToolbar({ textareaRef, value, onChange, onAttach }: {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  value: string;
  onChange: (v: string) => void;
  onAttach: () => void;
}) {
  const [showColors, setShowColors] = useState(false);
  const colors = ["#dc2626", "#2563eb", "#16a34a", "#d97706", "#7c3aed"];

  const wrapSelection = (before: string, after = before) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart, end = el.selectionEnd;
    const selected = value.slice(start, end);
    const newVal = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(newVal);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  const insertAtCursor = (text: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const pos = el.selectionStart;
    onChange(value.slice(0, pos) + text + value.slice(pos));
    setTimeout(() => { el.focus(); el.setSelectionRange(pos + text.length, pos + text.length); }, 0);
  };

  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-gray-50/80">
      <button onClick={() => wrapSelection("**")} title="Bold"
        className="w-6 h-6 flex items-center justify-center rounded text-[12px] font-bold text-gray-600 hover:bg-gray-200 transition-colors">
        B
      </button>
      <button onClick={() => wrapSelection("_")} title="Italic"
        className="w-6 h-6 flex items-center justify-center rounded text-[12px] italic text-gray-600 hover:bg-gray-200 transition-colors">
        I
      </button>
      <div className="w-px h-4 bg-border mx-0.5" />
      <button onClick={() => insertAtCursor("\n[Image: paste URL here]\n")} title="Insert image"
        className="w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:bg-gray-200 transition-colors">
        <Image size={12} />
      </button>
      <div className="relative">
        <button onClick={() => setShowColors(v => !v)} title="Text color"
          className="w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:bg-gray-200 transition-colors">
          <Palette size={12} />
        </button>
        {showColors && (
          <div className="absolute left-0 top-full mt-1 z-50 bg-white rounded-lg border border-border shadow-lg p-2 flex gap-1.5">
            {colors.map(c => (
              <button key={c} onClick={() => { wrapSelection(`[color:${c}]`, `[/color]`); setShowColors(false); }}
                className="w-4 h-4 rounded-full border border-white/50 hover:scale-125 transition-transform"
                style={{ backgroundColor: c }} />
            ))}
          </div>
        )}
      </div>
      <div className="w-px h-4 bg-border mx-0.5" />
      <button onClick={onAttach} title="Attach file"
        className="w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:bg-gray-200 transition-colors">
        <Paperclip size={12} />
      </button>
    </div>
  );
}

// ── Thread View ────────────────────────────────────────────────

function ThreadView({ thread, onSend, onStatusChange, onGoNext, globalMode }: {
  thread: EmailThread;
  onSend: (text: string) => void;
  onStatusChange: (s: EmailStatus) => void;
  onGoNext: () => void;
  globalMode: OperationMode;
}) {
  const [draft, setDraft] = useState("");
  const [aiInserted, setAiInserted] = useState(false);
  const [translatedMsgIds, setTranslatedMsgIds] = useState<Set<string>>(new Set());
  const [showAiReplyZh, setShowAiReplyZh] = useState(false);
  const [attachments, setAttachments] = useState<{ name: string; size: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const toggleMsgTranslation = (id: string) =>
    setTranslatedMsgIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const mode = thread.threadMode ?? globalMode;

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setAttachments(prev => [...prev, ...files.map(f => ({
      name: f.name,
      size: f.size > 1024 * 1024 ? `${(f.size / 1024 / 1024).toFixed(1)} MB` : `${Math.round(f.size / 1024)} KB`,
    }))]);
    e.target.value = "";
  };

  useEffect(() => { setDraft(""); setAiInserted(false); setTranslatedMsgIds(new Set()); setShowAiReplyZh(false); setAttachments([]); }, [thread.id]);
  useEffect(() => {
    const el = textareaRef.current; if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 280) + "px";
  }, [draft]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [thread.messages.length]);

  const [submitStatus, setSubmitStatus] = useState<EmailStatus>("open");
  const [stayOnTicket, setStayOnTicket] = useState(true);
  const [showSubmitMenu, setShowSubmitMenu] = useState(false);
  const [showStayMenu, setShowStayMenu] = useState(false);
  const submitMenuRef = useRef<HTMLDivElement>(null);
  const stayMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (submitMenuRef.current && !submitMenuRef.current.contains(e.target as Node)) setShowSubmitMenu(false);
      if (stayMenuRef.current && !stayMenuRef.current.contains(e.target as Node)) setShowStayMenu(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const handleSubmit = () => {
    if (draft.trim()) onSend(draft.trim());
    onStatusChange(submitStatus);
    setDraft(""); setAiInserted(false); setAttachments([]);
    toast.success(`Ticket → ${statusInfo(submitStatus).label}`);
    if (!stayOnTicket) onGoNext();
  };

  const modeCfg = MODE_CONFIG[mode];
  const ModeIcon = modeCfg.icon;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white h-full">
      {/* Thread header */}
      <div className="px-4 py-3 border-b border-border shrink-0 bg-white">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[14px] font-semibold text-gray-900 truncate">{thread.subject}</h2>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-[12px] text-gray-700 font-medium">{thread.customer}</span>
              <span className="text-gray-300">·</span>
              <span className="text-[11px] text-gray-400">{thread.customerEmail}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn("inline-flex items-center gap-0.5 text-[9px] font-bold rounded-sm px-1.5 py-0.5 uppercase tracking-wide pointer-events-none select-none", modeCfg.tagCls)}>
              <ModeIcon size={9} />{modeCfg.label}
            </span>
            <StatusDropdown status={thread.status} onChange={onStatusChange} />
          </div>
        </div>
      </div>

      {/* Mode banner */}
      {mode === "production" && (
        <div className="px-4 py-1.5 bg-blue-50 border-b border-blue-100 flex items-center gap-2 shrink-0">
          <Bolt size={11} className="text-blue-600 shrink-0" />
          <span className="text-[11px] text-blue-700 font-medium">Production Mode</span>
          <span className="text-[11px] text-blue-500">— AI replies sent automatically · confidence {Math.round(thread.aiCard.confidence * 100)}%</span>
        </div>
      )}
      {mode === "training" && (
        <div className="px-4 py-1.5 bg-amber-50 border-b border-amber-100 flex items-center gap-2 shrink-0">
          <Shield size={11} className="text-amber-600 shrink-0" />
          <span className="text-[11px] text-amber-700 font-medium">Training Mode</span>
          <span className="text-[11px] text-amber-600">— review AI draft before sending</span>
        </div>
      )}

      {/* Messages */}
      <div className={cn("flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0", modeCfg.msgsBg)}>
        {thread.messages.map((msg) => {
          const isCustomer = msg.from === "customer";
          const hasTranslation = isCustomer && !!msg.contentZh;
          const showTr = translatedMsgIds.has(msg.id);
          return (
            <div key={msg.id} className={cn("rounded-xl border p-3.5 text-[13px] leading-relaxed",
              isCustomer
                ? "bg-white border-border"
                : mode === "production"
                  ? "bg-blue-50/70 border-blue-100"
                  : "bg-amber-50/70 border-amber-100")}>
              <div className="flex items-center gap-2 mb-2">
                <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                  isCustomer ? "bg-gray-200 text-gray-600" : mode === "production" ? "bg-blue-500 text-white" : "bg-amber-400 text-white")}>
                  {isCustomer ? <User size={11} /> : "AI"}
                </div>
                <span className="text-[12px] font-semibold text-gray-700">{msg.authorName}</span>
                {!isCustomer && <span className={cn("text-[11px]", mode === "production" ? "text-blue-500" : "text-amber-600")}>via {INBOX_EMAIL}</span>}
                <span className="ml-auto text-[11px] text-gray-400">{fullDate(msg.timestamp)}</span>
                <button onClick={() => { navigator.clipboard.writeText(msg.content); toast.success("Copied"); }}
                  className="text-gray-300 hover:text-gray-500 transition-colors shrink-0">
                  <Copy size={11} />
                </button>
                {hasTranslation && (
                  <button onClick={() => toggleMsgTranslation(msg.id)}
                    className={cn("flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border transition-all shrink-0",
                      showTr ? "bg-blue-500 text-white border-blue-500" : "text-blue-500 border-blue-200 hover:bg-blue-50")}>
                    <Languages size={9} />{showTr ? "收起" : "翻译"}
                  </button>
                )}
              </div>
              <div className="whitespace-pre-wrap text-gray-700 text-[12.5px]">{msg.content}</div>
              {showTr && msg.contentZh && (
                <div className="mt-2.5 pt-2.5 border-t border-dashed border-blue-100">
                  <div className="flex items-center gap-1 mb-1">
                    <Languages size={9} className="text-blue-500" />
                    <span className="text-[9px] font-medium text-blue-500">中文翻译</span>
                  </div>
                  <div className="whitespace-pre-wrap text-gray-600 text-[12px] leading-relaxed">{msg.contentZh}</div>
                </div>
              )}
            </div>
          );
        })}

        {/* Inline AI Draft */}
        <div className={cn("rounded-xl border p-3.5 text-[13px] leading-relaxed", modeCfg.replyCls)}>
          <div className="flex items-center gap-2 mb-2">
            <div className={cn("w-6 h-6 rounded-full text-white flex items-center justify-center text-[10px] font-bold shrink-0",
              mode === "production" ? "bg-blue-500" : "bg-amber-400")}>AI</div>
            <span className="text-[12px] font-semibold text-gray-700">AI Draft</span>
            {mode === "training" ? (
              <span className="text-[10px] text-amber-600 bg-amber-100 rounded-md px-1.5 py-0.5 font-medium">Review before sending</span>
            ) : (
              <span className="text-[10px] text-blue-600 bg-blue-50 rounded-md px-1.5 py-0.5 flex items-center gap-0.5 font-medium">
                <Bolt size={9} />Auto-sent
              </span>
            )}
            <div className="ml-auto flex items-center gap-1.5">
              {thread.aiCard.suggestedReplyZh && (
                <button onClick={() => setShowAiReplyZh(v => !v)}
                  className={cn("flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border transition-all",
                    showAiReplyZh ? "bg-blue-500 text-white border-blue-500" : "text-blue-500 border-blue-200 hover:bg-blue-50")}>
                  <Languages size={9} />{showAiReplyZh ? "收起" : "翻译"}
                </button>
              )}
              <button onClick={() => { navigator.clipboard.writeText(thread.aiCard.suggestedReply); toast.success("Copied"); }}
                className="text-gray-400 hover:text-gray-600 flex items-center gap-1 text-[10px] transition-colors">
                <Copy size={10} />Copy
              </button>
              {mode === "training" && (
                <button onClick={() => { setDraft(thread.aiCard.suggestedReply); setAiInserted(true); toast.success("Inserted into reply box"); }}
                  className="flex items-center gap-1 text-[10px] font-medium text-[#6c47ff] hover:underline transition-colors">
                  <Sparkles size={9} />Insert
                </button>
              )}
            </div>
          </div>
          <div className="whitespace-pre-wrap text-[12.5px] text-gray-700">{thread.aiCard.suggestedReply}</div>
          {showAiReplyZh && thread.aiCard.suggestedReplyZh && (
            <div className="mt-2.5 pt-2.5 border-t border-dashed border-blue-100">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                  <Languages size={9} className="text-blue-500" />
                  <span className="text-[9px] font-medium text-blue-500">中文翻译</span>
                </div>
                <button onClick={() => { navigator.clipboard.writeText(thread.aiCard.suggestedReplyZh!); toast.success("Copied"); }}
                  className="text-[9px] text-blue-400 hover:text-blue-600 flex items-center gap-1">
                  <Copy size={8} />Copy
                </button>
              </div>
              <div className="whitespace-pre-wrap text-[12px] text-gray-700 leading-relaxed">{thread.aiCard.suggestedReplyZh}</div>
            </div>
          )}
        </div>
        <div ref={bottomRef} />
      </div>

      {/* Compose area */}
      <div className="border-t border-border bg-white shrink-0">
        <div className="px-3 py-1 border-b border-border flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-[#6c47ff]/20 text-[#6c47ff] flex items-center justify-center text-[9px] font-bold shrink-0">SC</div>
          <span className="text-[11px] text-gray-500">Replying as <span className="font-medium text-gray-700">{CURRENT_USER}</span></span>
        </div>
        <FormatToolbar textareaRef={textareaRef} value={draft} onChange={setDraft} onAttach={() => fileInputRef.current?.click()} />
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileAdd} />
        <div className="px-3 pt-3 pb-1 space-y-2">
          <textarea ref={textareaRef} value={draft} onChange={e => setDraft(e.target.value)}
            placeholder="Write your reply, or insert the AI draft above…"
            style={{ minHeight: "80px", maxHeight: "240px" }}
            className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] leading-relaxed resize-none overflow-y-auto focus:outline-none focus:ring-2 focus:ring-[#6c47ff]/30 focus:border-[#6c47ff] placeholder:text-gray-400" />
          {aiInserted && (
            <button className="text-[11px] text-gray-400 hover:text-gray-600 flex items-center gap-1 rounded-md"
              onClick={() => { setDraft(""); setAiInserted(false); }}>
              <RotateCcw size={11} />Clear draft
            </button>
          )}
        </div>

        {/* Attachments list */}
        {attachments.length > 0 && (
          <div className="px-3 pb-2 flex flex-wrap gap-1.5">
            {attachments.map((att, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[11px] text-gray-600 bg-gray-100 rounded-lg px-2 py-1 border border-border">
                <FileText size={11} className="text-gray-400 shrink-0" />
                <span className="max-w-[140px] truncate">{att.name}</span>
                <span className="text-[10px] text-gray-400 shrink-0">{att.size}</span>
                <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                  className="text-gray-400 hover:text-red-500 transition-colors shrink-0 ml-0.5">
                  <XCircle size={11} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Bottom action bar */}
        <div className="flex items-center justify-end gap-2 px-3 py-2.5 border-t border-border bg-gray-50">
          {/* Stay / Next dropdown */}
          <div ref={stayMenuRef} className="relative">
            <button onClick={() => setShowStayMenu(v => !v)}
              className="flex items-center gap-1.5 h-8 px-3 text-[12px] font-medium text-gray-600 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors">
              {stayOnTicket ? "Stay on ticket" : "Go to next ticket"}
              <ChevronDown size={12} />
            </button>
            {showStayMenu && (
              <div className="absolute right-0 bottom-full mb-1 z-50 bg-white rounded-lg border border-border shadow-lg py-1 min-w-[170px]">
                <button onClick={() => { setStayOnTicket(true); setShowStayMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] hover:bg-gray-50 text-gray-700">
                  {stayOnTicket ? <Check size={11} className="text-[#6c47ff]" /> : <span className="w-[11px]" />}
                  Stay on ticket
                </button>
                <button onClick={() => { setStayOnTicket(false); setShowStayMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] hover:bg-gray-50 text-gray-700">
                  {!stayOnTicket ? <Check size={11} className="text-[#6c47ff]" /> : <span className="w-[11px]" />}
                  Go to next ticket
                </button>
              </div>
            )}
          </div>

          {/* Submit — click to open picker, choose status to submit */}
          <div ref={submitMenuRef} className="relative">
            <button
              onClick={() => setShowSubmitMenu(v => !v)}
              className="flex items-center gap-1.5 h-8 px-3 text-[12px] font-medium text-white bg-[#6c47ff] hover:bg-[#5a3ad9] transition-colors rounded-lg">
              <span className={cn("w-2 h-2 rounded-full shrink-0", statusInfo(submitStatus).dot)} />
              Submit as {statusInfo(submitStatus).label}
              <ChevronDown size={12} className="ml-0.5" />
            </button>
            {showSubmitMenu && (
              <div className="absolute right-0 bottom-full mb-1.5 z-[200] bg-white rounded-xl border border-border shadow-xl py-1 min-w-[160px]">
                <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide border-b border-border mb-1">Submit as</div>
                {STATUS_OPTIONS.filter(o => o.value !== "new").map(opt => (
                  <button key={opt.value}
                    onClick={() => {
                      setShowSubmitMenu(false);
                      if (draft.trim()) onSend(draft.trim());
                      onStatusChange(opt.value);
                      setSubmitStatus(opt.value);
                      setDraft(""); setAiInserted(false); setAttachments([]);
                      toast.success(`Submitted as ${opt.label}`);
                      if (!stayOnTicket) onGoNext();
                    }}
                    className={cn("w-full flex items-center gap-2.5 px-3 py-2 text-[12px] hover:bg-gray-50 text-gray-700 transition-colors",
                      opt.value === submitStatus && "bg-[#6c47ff]/5")}>
                    <span className={cn("w-2 h-2 rounded-full shrink-0", opt.dot)} />
                    <span className="flex-1 text-left">{opt.label}</span>
                    {opt.value === submitStatus && <Check size={10} className="text-[#6c47ff]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Ticket Info Panel ──────────────────────────────────────────

function TicketInfoPanel({ thread, globalMode }: {
  thread: EmailThread; globalMode: OperationMode;
}) {
  const { aiCard } = thread;
  const [showSummaryZh, setShowSummaryZh] = useState(false);

  useEffect(() => { setShowSummaryZh(false); }, [thread.id]);

  return (
    <div className="w-[300px] shrink-0 flex flex-col border-l border-border bg-white h-full overflow-y-auto">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Bot size={13} className="text-[#6c47ff]" />
        <span className="text-[13px] font-semibold text-gray-900">Ticket Info</span>
      </div>

      <div className="px-4 py-3 border-b border-border space-y-2">
        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Customer Info</div>
        <InfoRow label="Intent"    value={aiCard.intent} />
        <InfoRow label="Sentiment" value={<span className={cn("text-[11px] font-medium px-1.5 py-0.5 rounded", sentimentColor(aiCard.sentiment))}>{sentimentLabel(aiCard.sentiment)}</span>} />
        <InfoRow label="Order"    value={aiCard.orderNumber ?? <span className="text-gray-400">—</span>} />
        <InfoRow label="Status"   value={aiCard.orderStatus ?? <span className="text-gray-400">—</span>} />
        {aiCard.estimatedDelivery && <InfoRow label="ETA"  value={aiCard.estimatedDelivery} />}
      </div>

      <div className="px-4 py-3 flex-1">
        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">AI Summary</div>
        <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
          {aiCard.summaryZh && (
            <div className="flex justify-end mb-1.5">
              <button onClick={() => setShowSummaryZh(v => !v)}
                className={cn("flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full border transition-all",
                  showSummaryZh ? "bg-blue-500 text-white border-blue-500" : "text-blue-500 border-blue-200 hover:bg-blue-50")}>
                <Languages size={8} />{showSummaryZh ? "收起" : "翻译"}
              </button>
            </div>
          )}
          <div className="text-[11.5px] text-gray-700 leading-snug">{aiCard.summary}</div>
          {showSummaryZh && aiCard.summaryZh && (
            <div className="mt-2 pt-2 border-t border-dashed border-blue-100">
              <div className="flex items-center gap-1 mb-1">
                <Languages size={8} className="text-blue-500" />
                <span className="text-[8px] font-medium text-blue-500">中文翻译</span>
              </div>
              <div className="text-[11.5px] text-gray-600 leading-snug">{aiCard.summaryZh}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-[10px] text-gray-400 w-14 shrink-0 pt-0.5">{label}</span>
      <span className="text-[11px] text-gray-800 font-medium flex-1">{value}</span>
    </div>
  );
}

// ── Stats Bar ──────────────────────────────────────────────────

function StatsBar({ threads }: { threads: EmailThread[] }) {
  const counts = {
    new:     threads.filter(t => t.status === "new").length,
    open:    threads.filter(t => t.status === "open").length,
    pending: threads.filter(t => t.status === "pending").length,
    solved:  threads.filter(t => t.status === "solved").length,
  };
  return (
    <div className="flex items-center gap-5 px-5 py-2 border-b border-border bg-white text-[12px] shrink-0">
      <StatItem dot="bg-gray-400"  label="New"     value={counts.new} />
      <StatItem dot="bg-blue-500"  label="Open"    value={counts.open} />
      <StatItem dot="bg-amber-500" label="Pending" value={counts.pending} />
      <StatItem dot="bg-green-500" label="Solved"  value={counts.solved} />
    </div>
  );
}

function StatItem({ dot, label, value }: { dot: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5 text-gray-600">
      <span className={cn("w-2 h-2 rounded-full shrink-0", dot)} />
      <span>{label}:</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8 bg-[#fafafa]">
      <div className="w-14 h-14 rounded-2xl bg-[#6c47ff]/10 flex items-center justify-center">
        <Inbox size={24} className="text-[#6c47ff]" />
      </div>
      <div>
        <div className="text-[14px] font-semibold text-gray-700 mb-1">Select a ticket</div>
        <div className="text-[12px] text-gray-400">Choose a ticket from the list to view the conversation.</div>
      </div>
    </div>
  );
}

// ── Email Sync Modal ───────────────────────────────────────────

function FormField({ label, value, onChange, placeholder, type = "text", half = false }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; half?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className={half ? "flex-1 min-w-0" : "w-full"}>
      {label && <label className="block text-[11px] font-medium text-gray-600 mb-1">{label}</label>}
      <div className="relative">
        <input type={type === "password" && show ? "text" : type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="w-full px-2.5 py-1.5 rounded-lg border border-border text-[12px] focus:outline-none focus:ring-2 focus:ring-[#6c47ff]/30 focus:border-[#6c47ff] bg-white pr-7" />
        {type === "password" && (
          <button type="button" onClick={() => setShow(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {show ? <EyeOff size={12} /> : <Eye size={12} />}
          </button>
        )}
      </div>
    </div>
  );
}

function EmailSyncModal({ onClose }: { onClose: () => void }) {
  const [host, setHost] = useState("imap.dingtalk.com");
  const [port, setPort] = useState("993");
  const [email, setEmail] = useState(INBOX_EMAIL);
  const [password, setPassword] = useState("");
  const [smtpHost, setSmtpHost] = useState("smtp.dingtalk.com");
  const [smtpPort, setSmtpPort] = useState("465");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[520px] max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-[15px] font-semibold text-gray-900">Email Sync Settings</h2>
            <p className="text-[12px] text-gray-400 mt-0.5">IMAP / SMTP connection</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"><X size={15} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          <div className="flex gap-2">
            <FormField label="IMAP Host" value={host} onChange={setHost} placeholder="imap.dingtalk.com" half />
            <FormField label="Port" value={port} onChange={setPort} placeholder="993" half />
          </div>
          <FormField label="Email address" value={email} onChange={setEmail} placeholder="service@djiusa.com" />
          <FormField label="Key / Password" value={password} onChange={setPassword} placeholder="Enter API key or password" type="password" />
          <div className="flex gap-2">
            <FormField label="SMTP Host" value={smtpHost} onChange={setSmtpHost} placeholder="smtp.dingtalk.com" half />
            <FormField label="SMTP Port" value={smtpPort} onChange={setSmtpPort} placeholder="465" half />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button onClick={() => { setTesting(true); setTestResult(null); setTimeout(() => { setTesting(false); setTestResult("success"); }, 1600); }}
              disabled={testing} className="text-[12px] px-3 py-1.5 rounded-lg border border-[#6c47ff]/40 text-[#6c47ff] hover:bg-[#6c47ff]/5 transition-colors disabled:opacity-50">
              {testing ? "Testing…" : "Test connection"}
            </button>
            {testResult === "success" && <span className="text-[11px] text-green-700 flex items-center gap-1"><Check size={11} />Connected</span>}
            {testResult === "error"   && <span className="text-[11px] text-red-600 flex items-center gap-1"><X size={11} />Failed</span>}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border bg-gray-50">
          <div className="text-[11px] text-gray-400">Last synced: <span className="text-gray-600 font-medium">Never</span></div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="text-[12px]" onClick={onClose}>Cancel</Button>
            <Button size="sm" className="bg-[#6c47ff] hover:bg-[#5a3ad9] text-white text-[12px]" onClick={() => { toast.success("Email sync settings saved"); onClose(); }}>Save</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────

export default function EmailPage() {
  const { openEmailSyncModal, setOpenEmailSyncModal, emailMode: mode } = useApp();
  const [threads, setThreads] = useState<EmailThread[]>(emailThreads);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showSyncSettings, setShowSyncSettings] = useState(false);
  const [listWidth, setListWidth] = useState(260);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  // Resize list panel
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartWidth.current = listWidth;
    e.preventDefault();
  }, [listWidth]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = e.clientX - dragStartX.current;
      setListWidth(Math.max(200, Math.min(420, dragStartWidth.current + delta)));
    };
    const onUp = () => { isDragging.current = false; };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
  }, []);

  useEffect(() => {
    if (openEmailSyncModal) { setShowSyncSettings(true); setOpenEmailSyncModal(false); }
  }, [openEmailSyncModal, setOpenEmailSyncModal]);

  const selectedThread = threads.find(t => t.id === selectedId) ?? null;

  const handleSelect = (id: string) => {
    setThreads(prev => prev.map(t => t.id === id ? { ...t, isRead: true } : t));
    setSelectedId(id);
  };

  const handleStatusChange = (id: string, status: EmailStatus) => {
    setThreads(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    toast.success(`Status → ${status}`);
  };

  const handleSend = (text: string) => {
    if (!selectedId) return;
    const newMsg = {
      id: `msg-${Date.now()}`, from: "agent" as const,
      authorName: CURRENT_USER, authorEmail: INBOX_EMAIL,
      content: text, timestamp: "Just now",
    };
    setThreads(prev => prev.map(t =>
      t.id === selectedId ? { ...t, status: "open" as const, updatedAt: "Just now", messages: [...t.messages, newMsg] } : t
    ));
    toast.success("Reply sent");
  };

  // Go to next unresolved ticket
  const handleGoNext = () => {
    const sorted = [...threads].sort((a, b) => timeToSortKey(a.updatedAt) - timeToSortKey(b.updatedAt));
    const unresolved = sorted.filter(t => t.status !== "solved" && t.id !== selectedId);
    if (unresolved.length > 0) {
      handleSelect(unresolved[0].id);
    } else {
      toast("All tickets resolved 🎉");
    }
  };

  return (
    <>
      {showSyncSettings && <EmailSyncModal onClose={() => setShowSyncSettings(false)} />}

      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex flex-1 overflow-hidden min-h-0 select-none">
          <EmailList
            threads={threads}
            selectedId={selectedId}
            onSelect={handleSelect}
            globalMode={mode}
            onOpenSettings={() => setShowSyncSettings(true)}
            width={listWidth}
            onResizeStart={handleResizeStart}
          />
          {selectedThread ? (
            <>
              <ThreadView
                thread={selectedThread}
                onSend={handleSend}
                onStatusChange={s => handleStatusChange(selectedThread.id, s)}
                onGoNext={handleGoNext}
                globalMode={mode}
              />
              <TicketInfoPanel
                thread={selectedThread}
                globalMode={mode}
              />
            </>
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </>
  );
}
