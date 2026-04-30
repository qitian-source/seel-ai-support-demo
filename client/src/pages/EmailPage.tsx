/*
 * EmailPage — Three-panel Email AI Assistant
 * Training Mode: AI drafts, human reviews & sends
 * Production Mode: AI auto-sends eligible emails; flags others for human
 */
import { useState, useRef, useEffect } from "react";
import { emailThreads, type EmailThread, type EmailStatus, type EmailType } from "@/lib/data";
import { useApp } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Send, Bot, Lock, RefreshCw, CheckCircle2, Clock, Flag,
  AlertTriangle, ChevronRight, Sparkles, Copy, RotateCcw,
  Inbox, User, Zap, Shield, Settings, X, ChevronDown,
  Mail, Check, Eye, EyeOff, Sliders, Languages,
  GraduationCap, Bolt, Tag, Users,
} from "lucide-react";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────

type OperationMode = "training" | "production";

interface FlagRule {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

// ── Constants ──────────────────────────────────────────────────

const INBOX_EMAIL = "service@djiusa.com";

const STATUS_OPTIONS: { value: EmailStatus; label: string; cls: string }[] = [
  { value: "open",    label: "Open",    cls: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "pending", label: "Pending", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "solved",  label: "Solved",  cls: "bg-green-50 text-green-700 border-green-200" },
];

const DEFAULT_FLAG_RULES: FlagRule[] = [
  { id: "sentiment_frustrated", label: "Frustrated / negative sentiment", description: "Flag emails where AI detects angry or frustrated tone", enabled: true },
  { id: "low_confidence",       label: "AI confidence < 90%",             description: "Flag when AI is not confident enough to auto-reply",  enabled: true },
  { id: "complaint_intent",     label: "Complaint intent",                 description: "Flag all emails classified as complaints",            enabled: true },
  { id: "warranty_intent",      label: "Warranty / repair claims",         description: "Flag warranty and repair-related inquiries",         enabled: false },
  { id: "no_order",             label: "No order number found",            description: "Flag emails with no identifiable order reference",   enabled: false },
];

const EMAIL_TYPE_CONFIG: Record<EmailType, { label: string; cls: string; icon: React.ReactNode }> = {
  "user":     { label: "User",     cls: "bg-[#6c47ff]/10 text-[#6c47ff] border-[#6c47ff]/30", icon: <Users size={9} /> },
  "non-user": { label: "Non-user", cls: "bg-orange-50 text-orange-700 border-orange-200", icon: <Tag size={9} /> },
};

// ── Helpers ────────────────────────────────────────────────────

function statusInfo(s: EmailStatus) {
  return STATUS_OPTIONS.find((o) => o.value === s)!;
}

function priorityDot(p: string) {
  if (p === "urgent") return "bg-red-500";
  if (p === "high") return "bg-amber-400";
  return "bg-transparent";
}

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

function evaluateThread(thread: EmailThread, rules: FlagRule[]): { flagged: boolean; reason: string } {
  const { aiCard } = thread;
  const active = (id: string) => rules.find((r) => r.id === id)?.enabled ?? false;

  if (active("sentiment_frustrated") && (aiCard.sentiment === "frustrated" || aiCard.sentiment === "negative"))
    return { flagged: true, reason: "Frustrated customer — human empathy required" };
  if (active("low_confidence") && aiCard.confidence < 0.90)
    return { flagged: true, reason: `AI confidence too low (${Math.round(aiCard.confidence * 100)}%) — manual review needed` };
  if (active("complaint_intent") && aiCard.intent === "Complaint")
    return { flagged: true, reason: "Complaint intent — policy requires human review" };
  if (active("warranty_intent") && (aiCard.intent === "Warranty Coverage" || aiCard.intent === "Repair Status"))
    return { flagged: true, reason: "Warranty / repair case — needs specialist review" };
  if (active("no_order") && !aiCard.orderNumber)
    return { flagged: true, reason: "No order number identified — cannot auto-process" };
  return { flagged: false, reason: "" };
}

// ── Status dropdown ────────────────────────────────────────────

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
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1 border rounded-full font-medium transition-colors hover:opacity-80",
          compact ? "text-[10px] px-1.5 py-0.5" : "text-[11px] px-2.5 py-1",
          info.cls
        )}
      >
        {info.label}
        <ChevronDown size={compact ? 9 : 10} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-lg border border-border shadow-lg py-1 min-w-[110px]">
          {STATUS_OPTIONS.map((opt) => (
            <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] hover:bg-gray-50 transition-colors">
              <span className={cn("w-2 h-2 rounded-full border", opt.cls)} />
              <span className="flex-1 text-left text-gray-700">{opt.label}</span>
              {opt.value === status && <Check size={11} className="text-[#6c47ff]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Mode toggle bar ───────────────────────────────────────────

function ModeBar({ mode, onModeChange, onOpenRules }: {
  mode: OperationMode;
  onModeChange: (m: OperationMode) => void;
  onOpenRules: () => void;
}) {
  return (
    <div className={cn(
      "flex items-center gap-3 px-5 py-2 border-b text-[12px] shrink-0 transition-colors",
      mode === "production" ? "bg-[#6c47ff]/5 border-[#6c47ff]/20" : "bg-gray-50 border-border"
    )}>
      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Mode</span>

      <div className="flex rounded-lg border border-border overflow-hidden bg-white">
        <button
          onClick={() => onModeChange("training")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium transition-colors",
            mode === "training" ? "bg-amber-500 text-white" : "text-gray-500 hover:bg-gray-50"
          )}
        >
          <GraduationCap size={12} />
          Training
        </button>
        <button
          onClick={() => onModeChange("production")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium transition-colors border-l border-border",
            mode === "production" ? "bg-[#6c47ff] text-white" : "text-gray-500 hover:bg-gray-50"
          )}
        >
          <Bolt size={12} />
          Production
        </button>
      </div>

      {mode === "training" ? (
        <span className="text-gray-500">
          AI drafts all replies → <span className="font-medium text-amber-700">you review & send each one</span>
        </span>
      ) : (
        <span className="text-gray-500">
          AI auto-sends eligible emails → <span className="font-medium text-[#6c47ff]">flags others for human review</span>
        </span>
      )}

      <div className="ml-auto flex items-center gap-3">
        {mode === "production" && (
          <button onClick={onOpenRules} className="flex items-center gap-1.5 text-[11px] text-[#6c47ff] hover:underline">
            <Sliders size={11} />
            Flag rules
          </button>
        )}
      </div>
    </div>
  );
}

// ── Flag rules panel ──────────────────────────────────────────

function FlagRulesPanel({ rules, onRulesChange, onClose }: {
  rules: FlagRule[];
  onRulesChange: (r: FlagRule[]) => void;
  onClose: () => void;
}) {
  const toggle = (id: string) =>
    onRulesChange(rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="w-[380px] bg-white flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="text-[14px] font-semibold text-gray-900">Production Flag Rules</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Define when AI should hand off to a human agent</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <div className="text-[11px] text-gray-400 mb-2">
            Emails matching ANY enabled rule will be flagged 🚩 and held for human review. All others are auto-sent by AI.
          </div>
          {rules.map((rule) => (
            <div key={rule.id} className={cn(
              "rounded-xl border p-4 transition-colors",
              rule.enabled ? "border-[#6c47ff]/30 bg-[#6c47ff]/4" : "border-border bg-white"
            )}>
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="text-[12.5px] font-semibold text-gray-800 mb-0.5">{rule.label}</div>
                  <div className="text-[11px] text-gray-500 leading-snug">{rule.description}</div>
                </div>
                <button
                  onClick={() => toggle(rule.id)}
                  className={cn("shrink-0 w-10 rounded-full relative transition-colors mt-0.5", rule.enabled ? "bg-[#6c47ff]" : "bg-gray-200")}
                  style={{ height: "22px" }}
                >
                  <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform", rule.enabled ? "translate-x-5" : "translate-x-0.5")} />
                </button>
              </div>
            </div>
          ))}

          <div className="mt-4 p-3 rounded-lg bg-gray-50 border border-gray-200 text-[11px] text-gray-600">
            <div className="font-semibold text-gray-700 mb-1">Preview with current emails</div>
            <div className="flex gap-4">
              <span>🚩 <strong>{emailThreads.filter(t => evaluateThread(t, rules).flagged).length}</strong> flagged</span>
              <span>⚡ <strong>{emailThreads.filter(t => !evaluateThread(t, rules).flagged).length}</strong> auto-handled</span>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-border">
          <Button className="w-full bg-[#6c47ff] hover:bg-[#5a3ad9] text-white text-[12px]" onClick={onClose}>
            Apply rules
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Email sync modal ──────────────────────────────────────────

interface SyncConfig {
  imap: { host: string; port: string; email: string; password: string; smtpHost: string; smtpPort: string };
}

const defaultSyncConfig: SyncConfig = {
  imap: { host: "imap.dingtalk.com", port: "993", email: INBOX_EMAIL, password: "", smtpHost: "smtp.dingtalk.com", smtpPort: "465" },
};

function SyncModeCard({ icon, title, badge, description, children }: {
  selected?: boolean; icon: React.ReactNode; title: string;
  badge?: string; description: string; children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border-2 p-4 border-[#6c47ff] bg-[#6c47ff]/4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[#6c47ff] text-white">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[13px] font-semibold text-gray-900">{title}</span>
            {badge && <span className={cn("text-[10px] font-medium rounded-full px-1.5 py-0.5", badge === "Recommended" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>{badge}</span>}
          </div>
          <p className="text-[11px] text-gray-500 leading-snug">{description}</p>
        </div>
      </div>
      {children && (
        <div className="mt-4 pt-4 border-t border-[#6c47ff]/20">{children}</div>
      )}
    </div>
  );
}

function FormField({ label, value, onChange, placeholder, type = "text", half = false }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; half?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className={half ? "flex-1 min-w-0" : "w-full"}>
      {label && <label className="block text-[11px] font-medium text-gray-600 mb-1">{label}</label>}
      <div className="relative">
        <input type={type === "password" && show ? "text" : type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="w-full px-2.5 py-1.5 rounded-lg border border-border text-[12px] focus:outline-none focus:ring-2 focus:ring-[#6c47ff]/30 focus:border-[#6c47ff] bg-white pr-7" />
        {type === "password" && (
          <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {show ? <EyeOff size={12} /> : <Eye size={12} />}
          </button>
        )}
      </div>
    </div>
  );
}

function EmailSyncModal({ onClose }: { onClose: () => void }) {
  const [config, setConfig] = useState<SyncConfig>(defaultSyncConfig);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const setImap = (k: keyof SyncConfig["imap"], v: string) => setConfig((c) => ({ ...c, imap: { ...c.imap, [k]: v } }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[560px] max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-[15px] font-semibold text-gray-900">Email Sync Settings</h2>
            <p className="text-[12px] text-gray-400 mt-0.5">Configure how Seel connects to {INBOX_EMAIL}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"><X size={15} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          <SyncModeCard selected icon={<Mail size={15} />} title="IMAP / SMTP" badge="Recommended" description="Connect via standard email protocols. Works with DingTalk Mail out of the box.">
            <div className="space-y-3">
              <div className="flex gap-2">
                <FormField label="IMAP Host" value={config.imap.host} onChange={(v) => setImap("host", v)} placeholder="imap.dingtalk.com" half />
                <FormField label="Port" value={config.imap.port} onChange={(v) => setImap("port", v)} placeholder="993" half />
              </div>
              <FormField label="Email address" value={config.imap.email} onChange={(v) => setImap("email", v)} placeholder="service@djiusa.com" />
              <FormField label="Key" value={config.imap.password} onChange={(v) => setImap("password", v)} placeholder="Enter your API key" type="password" />
              <div className="flex gap-2">
                <FormField label="SMTP Host" value={config.imap.smtpHost} onChange={(v) => setImap("smtpHost", v)} placeholder="smtp.dingtalk.com" half />
                <FormField label="SMTP Port" value={config.imap.smtpPort} onChange={(v) => setImap("smtpPort", v)} placeholder="465" half />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button onClick={() => { setTesting(true); setTestResult(null); setTimeout(() => { setTesting(false); setTestResult("success"); }, 1800); }}
                  disabled={testing} className="text-[12px] px-3 py-1.5 rounded-lg border border-[#6c47ff]/40 text-[#6c47ff] hover:bg-[#6c47ff]/5 transition-colors disabled:opacity-50">
                  {testing ? "Testing…" : "Test connection"}
                </button>
                {testResult === "success" && <span className="text-[11px] text-green-700 flex items-center gap-1"><Check size={11} /> Connection successful</span>}
                {testResult === "error" && <span className="text-[11px] text-red-600 flex items-center gap-1"><X size={11} /> Connection failed</span>}
              </div>
            </div>
          </SyncModeCard>

        </div>
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border bg-gray-50">
          <div className="text-[11px] text-gray-400">Last synced: <span className="text-gray-600 font-medium">Never</span></div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="text-[12px]" onClick={onClose}>Cancel</Button>
            <Button size="sm" className="bg-[#6c47ff] hover:bg-[#5a3ad9] text-white text-[12px]" onClick={() => { toast.success("Email sync settings saved"); onClose(); }}>Save settings</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Left panel: Email list ─────────────────────────────────────

const TYPE_FILTER_TABS: { value: EmailType | "all"; label: string }[] = [
  { value: "all",      label: "All" },
  { value: "user",     label: "User" },
  { value: "non-user", label: "Non-user" },
];

function EmailTypeBadge({ type }: { type: EmailType }) {
  const cfg = EMAIL_TYPE_CONFIG[type];
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[9px] font-semibold border rounded px-1 py-0.5 shrink-0", cfg.cls)}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function EmailList({ threads, selectedId, onSelect, onStatusChange, onOpenSettings, mode, flagRules }: {
  threads: EmailThread[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onStatusChange: (id: string, s: EmailStatus) => void;
  onOpenSettings: () => void;
  mode: OperationMode;
  flagRules: FlagRule[];
}) {
  const [typeFilter, setTypeFilter] = useState<EmailType | "all">("all");

  const filtered = threads.filter((t) => typeFilter === "all" || t.emailType === typeFilter);
  const sorted = [...filtered].sort((a, b) => {
    if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
    const order = { urgent: 0, high: 1, normal: 2 };
    return order[a.priority] - order[b.priority];
  });

  return (
    <div className="w-[240px] shrink-0 flex flex-col border-r border-border bg-white h-full">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Inbox size={15} className="text-[#6c47ff]" />
          <span className="text-[13px] font-semibold text-gray-900">Email Inbox</span>
          {threads.filter((t) => !t.isRead).length > 0 && (
            <span className="text-[11px] text-white bg-[#6c47ff] rounded-full px-1.5 py-0.5 font-medium leading-none">
              {threads.filter((t) => !t.isRead).length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded hover:bg-gray-100"><RefreshCw size={13} /></button>
          <button onClick={onOpenSettings} className="text-gray-400 hover:text-[#6c47ff] transition-colors p-1 rounded hover:bg-gray-100" title="Email sync settings"><Settings size={13} /></button>
        </div>
      </div>

      {/* Type filter tabs */}
      <div className="flex items-center gap-0 px-3 pt-2 pb-0 border-b border-border overflow-x-auto">
        {TYPE_FILTER_TABS.map((tab) => {
          const count = tab.value === "all" ? threads.length : threads.filter((t) => t.emailType === tab.value).length;
          return (
            <button
              key={tab.value}
              onClick={() => setTypeFilter(tab.value)}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium border-b-2 -mb-[1px] whitespace-nowrap transition-colors shrink-0",
                typeFilter === tab.value
                  ? "border-[#6c47ff] text-[#6c47ff]"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              )}
            >
              {tab.label}
              {count > 0 && (
                <span className={cn("text-[9px] font-bold rounded-full px-1 py-0.5 leading-none",
                  typeFilter === tab.value ? "bg-[#6c47ff] text-white" : "bg-gray-100 text-gray-500"
                )}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto">
        {sorted.map((thread) => {
          const isSelected = thread.id === selectedId;
          const { flagged } = mode === "production" ? evaluateThread(thread, flagRules) : { flagged: false };
          const autoHandled = mode === "production" && !flagged;

          return (
            <button key={thread.id} onClick={() => onSelect(thread.id)}
              className={cn(
                "w-full text-left px-4 py-3 border-b border-border/60 transition-colors hover:bg-gray-50",
                isSelected && "bg-[#6c47ff]/5 border-l-2 border-l-[#6c47ff]",
                !isSelected && "border-l-2 border-l-transparent",
                flagged && !isSelected && "border-l-2 border-l-red-400"
              )}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className={cn("w-2 h-2 rounded-full shrink-0", priorityDot(thread.priority))} />
                <span className={cn("text-[12.5px] font-semibold flex-1 truncate", !thread.isRead ? "text-gray-900" : "text-gray-600")}>
                  {thread.customer}
                </span>
                <EmailTypeBadge type={thread.emailType} />
                {mode === "production" && flagged && (
                  <Flag size={10} className="shrink-0 fill-red-500 text-red-500" />
                )}
                {mode === "production" && autoHandled && (
                  <span className="shrink-0 text-[9px] font-bold text-[#6c47ff] bg-[#6c47ff]/10 rounded px-1 py-0.5">AUTO</span>
                )}
                <span className="text-[11px] text-gray-400 shrink-0">{thread.receivedAt.replace("Today ", "").replace("Yesterday ", "Yest ")}</span>
              </div>

              <div className={cn("text-[12px] truncate mb-1", !thread.isRead ? "text-gray-800 font-medium" : "text-gray-500")}>
                {thread.subject}
              </div>

              <div className="flex items-start gap-1.5">
                <Bot size={11} className="text-[#6c47ff] shrink-0 mt-0.5" />
                <span className="text-[11px] text-gray-500 leading-tight line-clamp-2 flex-1">{thread.inboxSummary}</span>
                <div onClick={(e) => e.stopPropagation()}>
                  <StatusDropdown status={thread.status} onChange={(s) => onStatusChange(thread.id, s)} compact />
                </div>
              </div>
            </button>
          );
        })}
        {sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center px-4">
            <span className="text-[12px] text-gray-400">No {typeFilter === "all" ? "" : TYPE_FILTER_TABS.find(t => t.value === typeFilter)?.label + " "}emails</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Middle panel: Thread view ──────────────────────────────────

function ThreadView({ thread, onSend, onStatusChange, mode, flagRules }: {
  thread: EmailThread;
  onSend: (text: string) => void;
  onStatusChange: (s: EmailStatus) => void;
  mode: OperationMode;
  flagRules: FlagRule[];
}) {
  const [draft, setDraft] = useState("");
  const [aiInserted, setAiInserted] = useState(false);
  const [translatedMsgIds, setTranslatedMsgIds] = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const toggleMsgTranslation = (id: string) =>
    setTranslatedMsgIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const { flagged, reason: flagReason } = mode === "production"
    ? evaluateThread(thread, flagRules)
    : { flagged: false, reason: "" };
  const autoHandled = mode === "production" && !flagged;

  useEffect(() => { setDraft(""); setAiInserted(false); setTranslatedMsgIds(new Set()); }, [thread.id]);

  // Auto-resize textarea to fit content
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 320) + "px";
  }, [draft]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [thread.messages.length]);

  const handleSend = () => {
    if (!draft.trim()) return;
    onSend(draft.trim());
    setDraft("");
    setAiInserted(false);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white h-full overflow-hidden">
      {/* Thread header */}
      <div className="px-5 py-3 border-b border-border shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[14px] font-semibold text-gray-900 truncate">{thread.subject}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[12px] text-gray-500">{thread.customer}</span>
              <span className="text-gray-300">·</span>
              <span className="text-[12px] text-gray-400">{thread.customerEmail}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {thread.lockedBy && thread.lockedBy !== "You" && (
              <span className="flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                <Lock size={10} /> Locked by {thread.lockedBy}
              </span>
            )}
            <StatusDropdown status={thread.status} onChange={onStatusChange} />
          </div>
        </div>
      </div>

      {/* Mode banner */}
      {mode === "production" && flagged && (
        <div className="px-4 py-2.5 bg-red-50 border-b border-red-200 flex items-start gap-2 shrink-0">
          <Flag size={13} className="text-red-500 fill-red-500 shrink-0 mt-0.5" />
          <div>
            <div className="text-[12px] font-semibold text-red-700">Flagged — human review required</div>
            <div className="text-[11px] text-red-600">{flagReason}</div>
          </div>
        </div>
      )}
      {mode === "production" && autoHandled && (
        <div className="px-4 py-2 bg-green-50 border-b border-green-200 flex items-center gap-2 shrink-0">
          <Bolt size={12} className="text-green-600 shrink-0" />
          <span className="text-[12px] font-medium text-green-700">AI auto-replied</span>
          <span className="text-[11px] text-green-600">— sent from {INBOX_EMAIL} based on confidence {Math.round(thread.aiCard.confidence * 100)}%</span>
        </div>
      )}
      {mode === "training" && (
        <div className="px-4 py-1.5 bg-amber-50 border-b border-amber-100 flex items-center gap-2 shrink-0">
          <Shield size={11} className="text-amber-600 shrink-0" />
          <span className="text-[11px] text-amber-700">Training Mode — AI draft ready for your review. Email will be sent from {INBOX_EMAIL}.</span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-[#fafafa] min-h-0">
        {autoHandled && thread.messages.every((m) => m.from !== "agent") && (
          <div className="rounded-xl border border-[#6c47ff]/20 bg-[#6c47ff]/5 p-4 text-[13px] leading-relaxed">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-[#6c47ff] text-white flex items-center justify-center text-[10px] font-bold shrink-0">AI</div>
              <span className="text-[12px] font-semibold text-gray-700">DJI USA Support</span>
              <span className="text-[11px] text-[#6c47ff]">via {INBOX_EMAIL}</span>
              <span className="ml-auto flex items-center gap-1 text-[10px] text-green-700 bg-green-100 rounded-full px-1.5 py-0.5">
                <Bolt size={9} /> Auto-sent
              </span>
              <span className="text-[11px] text-gray-400">Just now</span>
            </div>
            <div className="whitespace-pre-wrap text-gray-700">{thread.aiCard.suggestedReply}</div>
          </div>
        )}

        {thread.messages.map((msg) => {
          const hasTranslation = msg.from === "customer" && !!msg.contentZh;
          const showTr = translatedMsgIds.has(msg.id);
          return (
            <div key={msg.id} className={cn(
              "rounded-xl border p-4 text-[13px] leading-relaxed",
              msg.from === "customer" ? "bg-white border-border" : "bg-[#6c47ff]/5 border-[#6c47ff]/20"
            )}>
              <div className="flex items-center gap-2 mb-2">
                <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                  msg.from === "customer" ? "bg-gray-200 text-gray-600" : "bg-[#6c47ff] text-white")}>
                  {msg.from === "customer" ? <User size={12} /> : "AI"}
                </div>
                <span className="text-[12px] font-semibold text-gray-700">{msg.authorName}</span>
                {msg.from === "agent" && <span className="text-[11px] text-[#6c47ff]">via {INBOX_EMAIL}</span>}
                <span className="ml-auto text-[11px] text-gray-400">{msg.timestamp}</span>
                {hasTranslation && (
                  <button
                    onClick={() => toggleMsgTranslation(msg.id)}
                    className={cn(
                      "flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border transition-all",
                      showTr
                        ? "bg-blue-500 text-white border-blue-500"
                        : "text-blue-500 border-blue-200 hover:bg-blue-50"
                    )}
                  >
                    <Languages size={10} />
                    {showTr ? "收起" : "翻译"}
                  </button>
                )}
              </div>
              <div className="whitespace-pre-wrap text-gray-700">{msg.content}</div>
              {showTr && msg.contentZh && (
                <div className="mt-3 pt-3 border-t border-dashed border-blue-100">
                  <div className="flex items-center gap-1 mb-1.5">
                    <Languages size={10} className="text-blue-500" />
                    <span className="text-[10px] font-medium text-blue-500">中文翻译</span>
                  </div>
                  <div className="whitespace-pre-wrap text-gray-600 text-[12px] leading-relaxed">{msg.contentZh}</div>
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Compose area */}
      <div className="border-t border-border bg-white shrink-0">
        <div className="p-4 space-y-2">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              mode === "production" && autoHandled
                ? "AI has already replied. Write here to send a follow-up…"
                : mode === "production" && flagged
                ? "This email needs your reply. AI draft available →"
                : "Write your reply, or insert the AI draft below…"
            }
            style={{ minHeight: "100px", maxHeight: "320px" }}
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-[13px] leading-relaxed resize-none overflow-y-auto focus:outline-none focus:ring-2 focus:ring-[#6c47ff]/30 focus:border-[#6c47ff] placeholder:text-gray-400"
          />
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline"
              className={cn("text-[12px] gap-1.5", flagged && mode === "production" ? "border-red-300 text-red-600 hover:bg-red-50" : "border-[#6c47ff]/40 text-[#6c47ff] hover:bg-[#6c47ff]/5")}
              onClick={() => { setDraft(thread.aiCard.suggestedReply); setAiInserted(true); toast.success("AI draft inserted"); }}>
              <Sparkles size={12} />
              Insert AI Draft
            </Button>
            {aiInserted && (
              <button className="text-[11px] text-gray-400 hover:text-gray-600 flex items-center gap-1"
                onClick={() => { setDraft(""); setAiInserted(false); }}>
                <RotateCcw size={11} /> Clear
              </button>
            )}
            <div className="flex-1" />
            <Button size="sm" disabled={!draft.trim()}
              className={cn("gap-1.5 text-[12px] text-white", flagged && mode === "production" ? "bg-red-500 hover:bg-red-600" : "bg-[#6c47ff] hover:bg-[#5a3ad9]")}
              onClick={handleSend}>
              <Send size={12} />
              {mode === "production" && flagged ? "Send (Override)" : "Send Reply"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Right panel: AI card ───────────────────────────────────────

function AICard({ thread, mode, flagRules }: {
  thread: EmailThread;
  mode: OperationMode;
  flagRules: FlagRule[];
}) {
  const { aiCard } = thread;
  const conf = confidenceBand(aiCard.confidence);
  const { flagged, reason } = mode === "production" ? evaluateThread(thread, flagRules) : { flagged: false, reason: "" };
  const [showSummaryZh, setShowSummaryZh] = useState(false);
  const [showReplyZh, setShowReplyZh] = useState(false);

  // Reset translation state when thread changes
  const threadId = thread.id;
  useEffect(() => { setShowSummaryZh(false); setShowReplyZh(false); }, [threadId]);

  return (
    <div className="w-[380px] shrink-0 flex flex-col border-l border-border bg-white h-full overflow-y-auto">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Bot size={14} className="text-[#6c47ff]" />
        <span className="text-[13px] font-semibold text-gray-900">AI Enhancement</span>
        <span className={cn("ml-auto text-[10px] font-semibold flex items-center gap-0.5", conf.cls)}>
          <Zap size={10} /> {conf.label} ({Math.round(aiCard.confidence * 100)}%)
        </span>
      </div>

      {mode === "production" && (
        <div className={cn("mx-3 mt-3 mb-1 px-3 py-2 rounded-lg flex items-center gap-2 text-[11px] font-medium",
          flagged ? "bg-red-50 border border-red-200 text-red-700" : "bg-green-50 border border-green-200 text-green-700")}>
          {flagged
            ? <><Flag size={11} className="fill-red-500 text-red-500 shrink-0" /> Flagged — {reason}</>
            : <><Bolt size={11} className="shrink-0" /> Auto-handled — no human action needed</>}
        </div>
      )}

      <div className="px-4 py-3 border-b border-border">
        <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5">Customer Summary</div>
        <div className="space-y-2">
          <SummaryRow label="Intent" value={aiCard.intent} />
          <SummaryRow label="Sentiment" value={<span className={cn("text-[11px] font-medium px-1.5 py-0.5 rounded", sentimentColor(aiCard.sentiment))}>{sentimentLabel(aiCard.sentiment)}</span>} />
          {aiCard.orderNumber && <SummaryRow label="Order" value={aiCard.orderNumber} />}
          {aiCard.orderStatus && <SummaryRow label="Status" value={aiCard.orderStatus} />}
          {aiCard.tracking && <SummaryRow label="Tracking" value={<span className="font-mono text-[11px]">{aiCard.tracking}</span>} />}
          {aiCard.estimatedDelivery && <SummaryRow label="ETA" value={aiCard.estimatedDelivery} />}
          {aiCard.relatedPolicy && (
            <div className="mt-2 p-2.5 rounded-lg bg-blue-50 border border-blue-100">
              <div className="text-[10px] font-semibold text-blue-600 mb-1 flex items-center gap-1"><Shield size={10} /> Policy Reference</div>
              <div className="text-[11px] text-blue-800 leading-snug">{aiCard.relatedPolicy}</div>
            </div>
          )}
        </div>
        <div className="mt-3 p-2.5 rounded-lg bg-gray-50 border border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <div className="text-[10px] font-semibold text-gray-500">AI Summary</div>
            {aiCard.summaryZh && (
              <button
                onClick={() => setShowSummaryZh((v) => !v)}
                className={cn(
                  "flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full border transition-all",
                  showSummaryZh
                    ? "bg-blue-500 text-white border-blue-500"
                    : "text-blue-500 border-blue-200 hover:bg-blue-50"
                )}
              >
                <Languages size={9} />
                {showSummaryZh ? "收起" : "翻译"}
              </button>
            )}
          </div>
          <div className="text-[12px] text-gray-700 leading-snug">{aiCard.summary}</div>
          {showSummaryZh && aiCard.summaryZh && (
            <div className="mt-2 pt-2 border-t border-dashed border-blue-100">
              <div className="flex items-center gap-1 mb-1">
                <Languages size={9} className="text-blue-500" />
                <span className="text-[9px] font-medium text-blue-500">中文翻译</span>
              </div>
              <div className="text-[12px] text-gray-600 leading-snug">{aiCard.summaryZh}</div>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-3 flex-1">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Suggested Reply</span>
          <div className="flex items-center gap-2">
            {aiCard.suggestedReplyZh && (
              <button
                onClick={() => setShowReplyZh((v) => !v)}
                className={cn(
                  "flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border transition-all",
                  showReplyZh
                    ? "bg-blue-500 text-white border-blue-500"
                    : "text-blue-500 border-blue-200 hover:bg-blue-50"
                )}
              >
                <Languages size={10} />
                {showReplyZh ? "收起" : "翻译"}
              </button>
            )}
            <button onClick={() => { navigator.clipboard.writeText(aiCard.suggestedReply); toast.success("Copied"); }}
              className="text-[11px] text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors">
              <Copy size={11} /> Copy
            </button>
          </div>
        </div>
        <div className="bg-[#6c47ff]/4 border border-[#6c47ff]/15 rounded-lg p-3 text-[12px] text-gray-700 leading-relaxed whitespace-pre-wrap">
          {aiCard.suggestedReply}
        </div>
        {showReplyZh && aiCard.suggestedReplyZh && (
          <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50/50 p-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1">
                <Languages size={10} className="text-blue-500" />
                <span className="text-[10px] font-semibold text-blue-500">中文翻译</span>
              </div>
              <button onClick={() => { navigator.clipboard.writeText(aiCard.suggestedReplyZh!); toast.success("Copied"); }}
                className="text-[10px] text-blue-400 hover:text-blue-600 flex items-center gap-1">
                <Copy size={9} /> Copy
              </button>
            </div>
            <div className="text-[12px] text-gray-700 leading-relaxed whitespace-pre-wrap">{aiCard.suggestedReplyZh}</div>
          </div>
        )}
        {(flagged || aiCard.confidence < 0.92 || aiCard.sentiment === "frustrated") && (
          <div className={cn("mt-3 flex items-start gap-2 p-2.5 rounded-lg border", flagged ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200")}>
            <AlertTriangle size={13} className={cn("shrink-0 mt-0.5", flagged ? "text-red-500" : "text-amber-600")} />
            <div className={cn("text-[11px] leading-snug", flagged ? "text-red-700" : "text-amber-700")}>
              {flagged ? reason : aiCard.sentiment === "frustrated" ? "Customer shows frustration — review carefully before sending." : "Confidence below threshold — verify facts before sending."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-[11px] text-gray-400 w-16 shrink-0 pt-0.5">{label}</span>
      <span className="text-[11px] text-gray-800 font-medium flex-1">{value}</span>
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
        <div className="text-[14px] font-semibold text-gray-700 mb-1">Select an email</div>
        <div className="text-[12px] text-gray-400">Choose an email from the inbox to view the conversation and AI reply draft.</div>
      </div>
    </div>
  );
}

// ── Stats bar ──────────────────────────────────────────────────

function StatsBar({ threads, mode, flagRules }: { threads: EmailThread[]; mode: OperationMode; flagRules: FlagRule[] }) {
  const flagged = threads.filter((t) => evaluateThread(t, flagRules).flagged).length;
  return (
    <div className="flex items-center gap-6 px-5 py-2 border-b border-border bg-white text-[12px] shrink-0">
      <Stat icon={<AlertTriangle size={11} className="text-red-500" />} label="Urgent" value={threads.filter((t) => t.priority === "urgent").length} />
      <Stat icon={<Clock size={11} className="text-blue-500" />} label="Open" value={threads.filter((t) => t.status === "open").length} />
      <Stat icon={<RefreshCw size={11} className="text-amber-500" />} label="Pending" value={threads.filter((t) => t.status === "pending").length} />
      <Stat icon={<CheckCircle2 size={11} className="text-green-500" />} label="Solved" value={threads.filter((t) => t.status === "solved").length} />
      {mode === "production" && (
        <>
          <div className="w-px h-4 bg-border" />
          <Stat icon={<Flag size={11} className="text-red-500 fill-red-500" />} label="Flagged" value={flagged} />
          <Stat icon={<Bolt size={11} className="text-[#6c47ff]" />} label="Auto-handled" value={threads.length - flagged} />
        </>
      )}
      <div className="ml-auto flex items-center gap-1.5 text-gray-400">
        <Bot size={11} className="text-[#6c47ff]" />
        <span>AI coverage: <strong className="text-gray-700">100%</strong></span>
        <ChevronRight size={11} />
        <span>Avg review time: <strong className="text-gray-700">42s</strong></span>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5 text-gray-600">
      {icon}
      <span>{label}:</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────

export default function EmailPage() {
  const { openEmailSyncModal, setOpenEmailSyncModal } = useApp();
  const [threads, setThreads] = useState<EmailThread[]>(emailThreads);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showSyncSettings, setShowSyncSettings] = useState(false);
  const [mode, setMode] = useState<OperationMode>("training");

  useEffect(() => {
    if (openEmailSyncModal) {
      setShowSyncSettings(true);
      setOpenEmailSyncModal(false);
    }
  }, [openEmailSyncModal, setOpenEmailSyncModal]);
  const [flagRules, setFlagRules] = useState<FlagRule[]>(DEFAULT_FLAG_RULES);
  const [showFlagRules, setShowFlagRules] = useState(false);

  const selectedThread = threads.find((t) => t.id === selectedId) ?? null;

  const handleSelect = (id: string) => {
    setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, isRead: true } : t)));
    setSelectedId(id);
  };

  const handleStatusChange = (id: string, status: EmailStatus) => {
    setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    toast.success(`Marked as ${status}`);
  };

  const handleSend = (text: string) => {
    if (!selectedId) return;
    const newMsg = {
      id: `msg-${Date.now()}`,
      from: "agent" as const,
      authorName: "DJI USA Support",
      authorEmail: INBOX_EMAIL,
      content: text,
      timestamp: "Just now",
    };
    setThreads((prev) =>
      prev.map((t) =>
        t.id === selectedId ? { ...t, status: "solved" as const, messages: [...t.messages, newMsg] } : t
      )
    );
    toast.success(`Reply sent from ${INBOX_EMAIL}`);
  };

  const handleModeChange = (m: OperationMode) => {
    setMode(m);
    toast.success(m === "production" ? "Switched to Production Mode" : "Switched to Training Mode");
  };

  return (
    <>
      {showSyncSettings && <EmailSyncModal onClose={() => setShowSyncSettings(false)} />}
      {showFlagRules && <FlagRulesPanel rules={flagRules} onRulesChange={setFlagRules} onClose={() => setShowFlagRules(false)} />}

      <div className="flex flex-col h-full overflow-hidden">
        <ModeBar mode={mode} onModeChange={handleModeChange} onOpenRules={() => setShowFlagRules(true)} />
        <StatsBar threads={threads} mode={mode} flagRules={flagRules} />
        <div className="flex flex-1 overflow-hidden min-h-0">
          <EmailList
            threads={threads}
            selectedId={selectedId}
            onSelect={handleSelect}
            onStatusChange={handleStatusChange}
            onOpenSettings={() => setShowSyncSettings(true)}
            mode={mode}
            flagRules={flagRules}
          />
          {selectedThread ? (
            <>
              <ThreadView
                thread={selectedThread}
                onSend={handleSend}
                onStatusChange={(s) => handleStatusChange(selectedThread.id, s)}
                mode={mode}
                flagRules={flagRules}
              />
              <AICard
                thread={selectedThread}
                mode={mode}
                flagRules={flagRules}
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
