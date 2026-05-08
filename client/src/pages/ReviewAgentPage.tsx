/*
 * /review-agent — Seel Review Agent
 * Same shell as Home (Sidebar + tabs). Tabs: Performance | Settings
 */
import { useState, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import { cn } from "@/lib/utils";
import {
  Star, MessageSquareText, SlidersHorizontal, Zap, Clock,
  Info, CheckCircle2, AlertCircle, Save, ExternalLink,
} from "lucide-react";
import { MERCHANT_NAME } from "@/lib/reviewData";

// ─── Shared mock data ─────────────────────────────────────────────────────────

type V2Session = {
  id: string; customerName: string; orderId: string; timestamp: string;
  outcome: "reviewed" | "feedback" | "both" | "pending";
  stars?: number; hasFeedback?: boolean; charged: boolean; amount: number;
  reviewUrl?: string;
};

const V2_SESSIONS: V2Session[] = [
  { id:"s-001", customerName:"Carlos Rivera",     orderId:"10342", timestamp:"2026-05-07T01:20:00Z", outcome:"pending",  charged:false, amount:0 },
  { id:"s-002", customerName:"Sarah Chen",        orderId:"10234", timestamp:"2026-05-01T22:32:00Z", outcome:"reviewed", stars:5, charged:true,  amount:5, reviewUrl:"https://www.trustpilot.com" },
  { id:"s-003", customerName:"David Wang",        orderId:"10245", timestamp:"2026-05-02T17:15:00Z", outcome:"both",     stars:5, hasFeedback:true, charged:true, amount:5, reviewUrl:"https://www.trustpilot.com" },
  { id:"s-004", customerName:"Jennifer Martinez", orderId:"10267", timestamp:"2026-05-03T12:48:00Z", outcome:"reviewed", stars:5, charged:true,  amount:5, reviewUrl:"https://www.trustpilot.com" },
  { id:"s-005", customerName:"Mike Thompson",     orderId:"10289", timestamp:"2026-05-03T19:22:00Z", outcome:"pending",  charged:false, amount:0 },
  { id:"s-006", customerName:"Amy Liu",           orderId:"10301", timestamp:"2026-05-04T16:05:00Z", outcome:"reviewed", stars:5, charged:true,  amount:5, reviewUrl:"https://www.trustpilot.com" },
  { id:"s-007", customerName:"James Wilson",      orderId:"10371", timestamp:"2026-05-04T22:22:00Z", outcome:"feedback", hasFeedback:true, charged:false, amount:0 },
  { id:"s-008", customerName:"Robert Kim",        orderId:"10315", timestamp:"2026-05-05T03:30:00Z", outcome:"reviewed", stars:5, charged:true,  amount:5, reviewUrl:"https://www.trustpilot.com" },
  { id:"s-009", customerName:"Sophie Nguyen",     orderId:"10384", timestamp:"2026-05-05T17:50:00Z", outcome:"both",     stars:3, hasFeedback:true, charged:false, amount:0, reviewUrl:"https://www.trustpilot.com" },
  { id:"s-010", customerName:"Marcus Johnson",    orderId:"10397", timestamp:"2026-05-05T12:05:00Z", outcome:"feedback", hasFeedback:true, charged:false, amount:0 },
  { id:"s-011", customerName:"Linda Park",        orderId:"10412", timestamp:"2026-05-06T19:33:00Z", outcome:"reviewed", stars:2, charged:false, amount:0, reviewUrl:"https://www.trustpilot.com" },
  { id:"s-012", customerName:"Emma Davis",        orderId:"10329", timestamp:"2026-05-05T21:45:00Z", outcome:"reviewed", stars:5, charged:true,  amount:5, reviewUrl:"https://www.trustpilot.com" },
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

// ─── Performance tab ──────────────────────────────────────────────────────────

function PerformanceContent() {
  const sessions = useMemo(() =>
    V2_SESSIONS.slice().sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  , []);
  const reviewed  = sessions.filter(s => s.outcome === "reviewed" || s.outcome === "both");
  const fiveStars = sessions.filter(s => s.stars === 5);

  return (
    <div className="p-6 space-y-5 max-w-[960px]">

      {/* Big numbers */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label:"邀请发送", value: sessions.length, sub:"所有已解决会话", icon:<MessageSquareText size={16}/>, accent:"bg-[#6c47ff]/10 text-[#6c47ff]" },
          { label:"收到评价", value: reviewed.length,  sub:"任意星级均归因",  icon:<Star size={16}/>,              accent:"bg-[#00B67A]/10 text-[#00B67A]" },
          { label:"五星好评", value: fiveStars.length, sub:`好评率 ${Math.round(fiveStars.length/(reviewed.length||1)*100)}%`, icon:<Star size={16}/>, accent:"bg-amber-50 text-amber-500" },
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

      {/* All Sessions */}
      <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <h2 className="text-[14px] font-semibold text-foreground">All Sessions</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {sessions.length} conversations · {reviewed.length} reviewed · {sessions.filter(s=>s.outcome==="pending").length} pending
          </p>
        </div>

        <div className="grid grid-cols-[1fr_180px_200px_160px] text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-2.5 border-b border-border bg-[#fafafa]">
          <span>Customer</span>
          <span>Conversation</span>
          <span>Date</span>
          <span>Outcome</span>
        </div>

        {sessions.map(s => (
          <div key={s.id} className="grid grid-cols-[1fr_180px_200px_160px] items-center px-5 py-3.5 border-b border-border last:border-0 text-[13px] hover:bg-[#fafafa] transition-colors">
            <span className="font-medium text-foreground">{s.customerName}</span>
            <a href="/plugin-demo-v2" className="flex items-center gap-1.5 text-[12px] font-mono text-[#6c47ff] hover:underline">
              <ExternalLink size={10} />conv-{s.orderId}
            </a>
            <span className="text-muted-foreground text-[12px]">{fmtDate(s.timestamp)} · {fmtTime(s.timestamp)}</span>
            <span>
              {s.stars != null
                ? <StarRow n={s.stars} />
                : <span className="text-[12px] text-muted-foreground">—</span>
              }
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Settings tab ─────────────────────────────────────────────────────────────

const PRESETS = [
  { label:"测试期", pct:10,  desc:"新商家上线验证" },
  { label:"小流量", pct:25,  desc:"稳定后小范围扩大" },
  { label:"半量",   pct:50,  desc:"AB 测试或过渡" },
  { label:"全量",   pct:100, desc:"所有符合条件用户" },
];

function SettingsContent() {
  const [rollout, setRollout] = useState(100);
  const [triggerDelay, setTriggerDelay] = useState(20);
  const [attributionWindow, setAttributionWindow] = useState(72);
  const [saved, setSaved] = useState(false);

  function save() { setSaved(true); setTimeout(() => setSaved(false), 2000); }

  return (
    <div className="p-6 space-y-5 max-w-[640px]">

      {/* Rollout */}
      <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <h2 className="text-[14px] font-semibold text-foreground">灰度设置 · Rollout</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">控制触发 Trustpilot 邀请的用户比例</p>
        </div>
        <div className="p-5">
          <div className="flex items-end gap-5 mb-4">
            <p className="text-[48px] font-bold text-foreground leading-none tracking-tight">{rollout}%</p>
            <div className="flex-1 pb-1.5 space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground"><span>0%</span><span>100%</span></div>
              <input type="range" min={0} max={100} step={5} value={rollout}
                onChange={e => setRollout(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer" />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-4">
            {PRESETS.map(p => (
              <button key={p.pct} onClick={() => setRollout(p.pct)}
                className={cn("rounded-lg border px-3 py-2.5 text-left transition-colors",
                  rollout === p.pct ? "border-emerald-400 bg-emerald-50" : "border-border bg-white hover:bg-gray-50")}>
                <p className={cn("text-[12px] font-bold", rollout===p.pct ? "text-emerald-700" : "text-foreground")}>{p.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{p.desc}</p>
              </button>
            ))}
          </div>

          <div className={cn("flex items-center gap-2 text-[11px] rounded-lg px-3 py-2.5",
            rollout===100 ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200")}>
            {rollout===100
              ? <><CheckCircle2 size={13}/> 全量推送 · 所有已解决会话均触发邀请</>
              : <><AlertCircle size={13}/> 灰度中 · 约 {rollout}% 的已解决会话触发邀请</>}
          </div>
        </div>
      </div>

      {/* Attribution */}
      <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <h2 className="text-[14px] font-semibold text-foreground">归因触发设置</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">Log 监测与爬虫延迟配置</p>
        </div>
        <div className="p-5 space-y-5">

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div>
                <p className="text-[13px] font-semibold text-foreground flex items-center gap-1.5"><Zap size={12} className="text-amber-500"/>爬虫触发延迟</p>
                <p className="text-[11px] text-muted-foreground">检测到 Intent Log 更新后多久启动爬虫</p>
              </div>
              <span className="text-[20px] font-bold text-foreground">{triggerDelay}<span className="text-[11px] font-normal text-muted-foreground ml-1">min</span></span>
            </div>
            <input type="range" min={5} max={60} step={5} value={triggerDelay}
              onChange={e => setTriggerDelay(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer" />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5"><span>5 min</span><span>60 min</span></div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div>
                <p className="text-[13px] font-semibold text-foreground flex items-center gap-1.5"><Clock size={12} className="text-[#6c47ff]"/>归因匹配窗口</p>
                <p className="text-[11px] text-muted-foreground">Session 结束后多久内提交的评价纳入候选池</p>
              </div>
              <span className="text-[20px] font-bold text-foreground">{attributionWindow}<span className="text-[11px] font-normal text-muted-foreground ml-1">h</span></span>
            </div>
            <input type="range" min={24} max={168} step={24} value={attributionWindow}
              onChange={e => setAttributionWindow(Number(e.target.value))}
              className="w-full accent-[#6c47ff] cursor-pointer" />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5"><span>24h</span><span>168h (7天)</span></div>
          </div>

          <div className="flex items-start gap-2 text-[11px] text-muted-foreground bg-gray-50 rounded-lg px-3 py-2.5 border border-border">
            <Info size={12} className="mt-0.5 shrink-0"/>
            <span>Log 更新后 <strong className="text-foreground">{triggerDelay} 分钟</strong>内爬取 TP · 评价在 <strong className="text-foreground">{attributionWindow}h</strong> 窗口内做模糊匹配</span>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button onClick={save}
          className={cn("flex items-center gap-2 px-5 py-2 rounded-lg text-[13px] font-semibold transition-all",
            saved ? "bg-emerald-500 text-white" : "bg-foreground text-background hover:opacity-90")}>
          {saved ? <><CheckCircle2 size={13}/> Saved</> : <><Save size={13}/> Save Changes</>}
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "performance", label: "Performance" },
  { id: "settings",    label: "Settings" },
] as const;

type TabId = typeof TABS[number]["id"];

export default function ReviewAgentPage() {
  const [tab, setTab] = useState<TabId>("performance");

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar activePage="Review Agent" />

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <div className="border-b border-border bg-white">
          <div className="px-6 pt-4 pb-0">
            <h1 className="text-[18px] font-bold text-foreground mb-3">Review Agent</h1>
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-[#fafafa]">
          {tab === "performance" && <PerformanceContent />}
          {tab === "settings"    && <SettingsContent />}
        </div>
      </div>
    </div>
  );
}
