/*
 * /review-agent — Seel Review Agent
 * Same shell as Home (Sidebar + tabs). Tabs: Performance | Settings
 */
import { useState, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import { cn } from "@/lib/utils";
import {
  Star, MessageSquareText, CheckCircle2, AlertCircle, ExternalLink,
  Globe, Pencil, Check, X,
} from "lucide-react";
import { MERCHANT_NAME } from "@/lib/reviewData";

const DEFAULT_TP_URL = "https://www.trustpilot.com/review/alexsong.com";

// ─── Mock data ────────────────────────────────────────────────────────────────

type V2Session = {
  id: string; customerName: string; orderId: string; timestamp: string;
  outcome: "reviewed" | "feedback" | "both" | "pending";
  stars?: number; hasFeedback?: boolean; charged: boolean; amount: number;
};

const V2_SESSIONS: V2Session[] = [
  { id:"s-001", customerName:"Carlos Rivera",     orderId:"10342", timestamp:"2026-05-07T01:20:00Z", outcome:"pending",  charged:false, amount:0 },
  { id:"s-002", customerName:"Sarah Chen",        orderId:"10234", timestamp:"2026-05-01T22:32:00Z", outcome:"reviewed", stars:5, charged:true,  amount:5 },
  { id:"s-003", customerName:"David Wang",        orderId:"10245", timestamp:"2026-05-02T17:15:00Z", outcome:"both",     stars:5, charged:true,  amount:5 },
  { id:"s-004", customerName:"Jennifer Martinez", orderId:"10267", timestamp:"2026-05-03T12:48:00Z", outcome:"reviewed", stars:5, charged:true,  amount:5 },
  { id:"s-005", customerName:"Mike Thompson",     orderId:"10289", timestamp:"2026-05-03T19:22:00Z", outcome:"pending",  charged:false, amount:0 },
  { id:"s-006", customerName:"Amy Liu",           orderId:"10301", timestamp:"2026-05-04T16:05:00Z", outcome:"reviewed", stars:5, charged:true,  amount:5 },
  { id:"s-007", customerName:"James Wilson",      orderId:"10371", timestamp:"2026-05-04T22:22:00Z", outcome:"feedback", charged:false, amount:0 },
  { id:"s-008", customerName:"Robert Kim",        orderId:"10315", timestamp:"2026-05-05T03:30:00Z", outcome:"reviewed", stars:5, charged:true,  amount:5 },
  { id:"s-009", customerName:"Sophie Nguyen",     orderId:"10384", timestamp:"2026-05-05T17:50:00Z", outcome:"both",     stars:3, charged:false, amount:0 },
  { id:"s-010", customerName:"Marcus Johnson",    orderId:"10397", timestamp:"2026-05-05T12:05:00Z", outcome:"feedback", charged:false, amount:0 },
  { id:"s-011", customerName:"Linda Park",        orderId:"10412", timestamp:"2026-05-06T19:33:00Z", outcome:"reviewed", stars:2, charged:false, amount:0 },
  { id:"s-012", customerName:"Emma Davis",        orderId:"10329", timestamp:"2026-05-05T21:45:00Z", outcome:"reviewed", stars:5, charged:true,  amount:5 },
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour:"numeric", minute:"2-digit", hour12:true });
}

function StarRow({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={12} className={i <= n ? "fill-[#00B67A] text-[#00B67A]" : "fill-gray-200 text-gray-200"} />
      ))}
    </div>
  );
}

// ─── Rollout mini-card ────────────────────────────────────────────────────────

const UNLIMITED = 0;
const PRESETS = [
  { label:"Starter",   cap:10,       sub:"10 / day" },
  { label:"Growth",    cap:30,       sub:"30 / day" },
  { label:"Standard",  cap:50,       sub:"50 / day" },
  { label:"Unlimited", cap:UNLIMITED, sub:"∞" },
];

function RolloutCard() {
  const [cap, setCap] = useState(UNLIMITED);
  const isUnlimited = cap === UNLIMITED;
  const displayCap = isUnlimited ? "∞" : String(cap);

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-[14px] font-semibold text-foreground">Daily Invite Limit</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">Max Trustpilot invites sent per calendar day</p>
        </div>
        <span className={cn(
          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold border",
          isUnlimited
            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
            : "bg-amber-50 border-amber-200 text-amber-700"
        )}>
          {isUnlimited ? "∞ Unlimited" : `${cap}/day`}
        </span>
      </div>
      <div className="px-5 py-4">
        <div className="flex items-center gap-4 mb-4">
          <p className="text-[40px] font-bold text-foreground leading-none tracking-tight shrink-0 w-16 text-right">{displayCap}</p>
          <div className="flex-1 space-y-1">
            <input type="range" min={0} max={100} step={5} value={cap}
              onChange={e => setCap(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer" />
            <div className="flex justify-between text-[10px] text-muted-foreground"><span>∞ Unlimited</span><span>100/day</span></div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {PRESETS.map(p => (
            <button key={p.cap} onClick={() => setCap(p.cap)}
              className={cn("rounded-lg border px-3 py-2 text-center transition-colors",
                cap === p.cap ? "border-emerald-400 bg-emerald-50" : "border-border bg-white hover:bg-gray-50")}>
              <p className={cn("text-[12px] font-bold", cap===p.cap ? "text-emerald-700" : "text-foreground")}>{p.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{p.sub}</p>
            </button>
          ))}
        </div>
        <div className={cn("flex items-center gap-2 text-[11px] rounded-lg px-3 py-2.5",
          isUnlimited ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200")}>
          {isUnlimited
            ? <><CheckCircle2 size={13}/> Unlimited · All resolved sessions will trigger an invite</>
            : <><AlertCircle size={13}/> Capped at {cap}/day · Resets at midnight UTC</>}
        </div>
      </div>
    </div>
  );
}

// ─── Performance tab ──────────────────────────────────────────────────────────

function PerformanceTab() {
  const sessions = useMemo(() =>
    V2_SESSIONS.slice().sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  , []);
  const reviewed  = sessions.filter(s => s.outcome === "reviewed" || s.outcome === "both");
  const fiveStars = sessions.filter(s => s.stars === 5);

  const [tpUrl, setTpUrl]     = useState(DEFAULT_TP_URL);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(DEFAULT_TP_URL);
  function saveUrl()    { setTpUrl(draft); setEditing(false); }
  function cancelEdit() { setDraft(tpUrl); setEditing(false); }

  return (
    <div className="p-6 space-y-5 max-w-[960px]">

      {/* Big numbers */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label:"Invites Sent",   value: sessions.length, sub:"All resolved sessions",        icon:<MessageSquareText size={16}/>, accent:"bg-[#6c47ff]/10 text-[#6c47ff]" },
          { label:"Reviews",        value: reviewed.length,  sub:"Any star rating attributed",   icon:<Star size={16}/>,              accent:"bg-[#00B67A]/10 text-[#00B67A]" },
          { label:"5-Star Reviews", value: fiveStars.length, sub:`${Math.round(fiveStars.length/(reviewed.length||1)*100)}% 5-star rate`, icon:<Star size={16}/>, accent:"bg-amber-50 text-amber-500" },
        ].map(c => (
          <div key={c.label} className="rounded-xl border border-border bg-white p-5 flex flex-col gap-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{c.label}</span>
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", c.accent)}>{c.icon}</div>
            </div>
            <div>
              <p className="text-[32px] font-bold text-foreground leading-none">{c.value}</p>
              {c.sub && <p className="text-[11px] text-muted-foreground mt-1.5">{c.sub}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Trustpilot Page */}
      <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe size={14} className="text-[#00B67A]" />
            <h2 className="text-[14px] font-semibold text-foreground">Trustpilot Page</h2>
          </div>
          {!editing && (
            <button onClick={() => { setDraft(tpUrl); setEditing(true); }}
              className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
              <Pencil size={12}/> Edit
            </button>
          )}
        </div>
        <div className="px-5 py-3.5">
          {editing ? (
            <div className="flex items-center gap-2">
              <input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
                className="flex-1 text-[13px] border border-border rounded-lg px-3 py-2 outline-none focus:border-[#00B67A] focus:ring-1 focus:ring-[#00B67A] font-mono"
                placeholder="https://www.trustpilot.com/review/your-domain.com" />
              <button onClick={saveUrl}
                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-[#00B67A] text-white text-[12px] font-semibold hover:bg-[#009e6a] transition-colors">
                <Check size={13}/> Save
              </button>
              <button onClick={cancelEdit}
                className="flex items-center gap-1 px-3 py-2 rounded-lg border border-border text-[12px] text-muted-foreground hover:text-foreground transition-colors">
                <X size={13}/> Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-[#00B67A] shrink-0" />
              <span className="text-[13px] font-mono text-foreground flex-1 truncate">{tpUrl}</span>
              <a href={tpUrl} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 text-[12px] text-[#00B67A] hover:underline shrink-0">
                <ExternalLink size={11}/> Visit
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Rollout config */}
      <RolloutCard />

      {/* All Sessions */}
      <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <h2 className="text-[14px] font-semibold text-foreground">All Sessions</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {sessions.length} conversations · {reviewed.length} reviewed · {sessions.filter(s=>s.outcome==="pending").length} pending
          </p>
        </div>
        <div className="grid grid-cols-[1fr_180px_200px_160px] text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-2.5 border-b border-border bg-[#fafafa]">
          <span>Customer</span><span>Conversation</span><span>Date</span><span>Outcome</span>
        </div>
        {sessions.map(s => (
          <div key={s.id} className="grid grid-cols-[1fr_180px_200px_160px] items-center px-5 py-3.5 border-b border-border last:border-0 text-[13px] hover:bg-[#fafafa] transition-colors">
            <span className="font-medium text-foreground">{s.customerName}</span>
            <a href="/plugin-demo-v2" className="flex items-center gap-1.5 text-[12px] font-mono text-[#6c47ff] hover:underline">
              <ExternalLink size={10}/>conv-{s.orderId}
            </a>
            <span className="text-muted-foreground text-[12px]">{fmtDate(s.timestamp)} · {fmtTime(s.timestamp)}</span>
            <span>
              {s.stars != null ? <StarRow n={s.stars}/> : <span className="text-[12px] text-muted-foreground">—</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "performance", label: "Performance" },
] as const;

type TabId = typeof TABS[number]["id"];

export default function ReviewAgentPage() {
  const [tab, setTab]         = useState<TabId>("performance");
  const [enabled, setEnabled] = useState(true);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar activePage="Review Agent" />

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="border-b border-border bg-white">
          <div className="px-6 pt-4 pb-0">
            {/* Title row with toggle */}
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-[18px] font-bold text-foreground">Review Agent</h1>
              <button
                onClick={() => setEnabled(v => !v)}
                className="flex items-center gap-2.5"
                aria-label="Toggle Review Agent"
              >
                <span className={cn(
                  "text-[12px] font-medium transition-colors",
                  enabled ? "text-emerald-600" : "text-muted-foreground"
                )}>
                  {enabled ? "On" : "Off"}
                </span>
                <div className={cn(
                  "relative w-9 h-5 rounded-full transition-colors duration-200",
                  enabled ? "bg-emerald-500" : "bg-gray-200"
                )}>
                  <div className={cn(
                    "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200",
                    enabled ? "left-[18px]" : "left-0.5"
                  )} />
                </div>
              </button>
            </div>
            {/* Tabs */}
            <div className="flex items-center gap-0">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={cn(
                    "px-4 py-2 text-[13px] font-medium border-b-2 transition-colors -mb-[1px]",
                    tab === t.id
                      ? "border-[#6c47ff] text-[#6c47ff]"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#fafafa]">
          {!enabled && (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <CheckCircle2 size={20} className="text-gray-300" />
              </div>
              <p className="text-[14px] font-medium text-gray-400">Review Agent is off</p>
              <p className="text-[12px] text-gray-300">Toggle on to start sending Trustpilot invites</p>
            </div>
          )}
          {enabled && tab === "performance" && <PerformanceTab />}
        </div>
      </div>
    </div>
  );
}
