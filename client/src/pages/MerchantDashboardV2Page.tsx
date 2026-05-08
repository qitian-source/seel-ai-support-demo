/*
 * /merchant-dashboard-v2 — Seel Review Agent Dashboard
 */
import { useMemo } from "react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import {
  Star, DollarSign, ExternalLink, MessageSquareText,
  ArrowLeft, Zap, Clock, SlidersHorizontal,
} from "lucide-react";
import { MERCHANT_NAME } from "@/lib/reviewData";

// ─── V2 Mock Data ─────────────────────────────────────────────────────────────

type V2Session = {
  id: string;
  customerName: string;
  orderId: string;
  timestamp: string;
  outcome: "reviewed" | "feedback" | "both" | "pending";
  stars?: number;           // if reviewed
  hasFeedback?: boolean;
  charged: boolean;
  amount: number;
  reviewUrl?: string;
};

const V2_SESSIONS: V2Session[] = [
  { id: "s-001", customerName: "Carlos Rivera",    orderId: "10342", timestamp: "2026-05-07T01:20:00Z", outcome: "pending",  charged: false, amount: 0 },
  { id: "s-002", customerName: "Sarah Chen",       orderId: "10234", timestamp: "2026-05-01T22:32:00Z", outcome: "reviewed", stars: 5, charged: true,  amount: 5, reviewUrl: "https://www.trustpilot.com" },
  { id: "s-003", customerName: "David Wang",       orderId: "10245", timestamp: "2026-05-02T17:15:00Z", outcome: "both",     stars: 5, hasFeedback: true, charged: true,  amount: 5, reviewUrl: "https://www.trustpilot.com" },
  { id: "s-004", customerName: "Jennifer Martinez",orderId: "10267", timestamp: "2026-05-03T12:48:00Z", outcome: "reviewed", stars: 5, charged: true,  amount: 5, reviewUrl: "https://www.trustpilot.com" },
  { id: "s-005", customerName: "Mike Thompson",    orderId: "10289", timestamp: "2026-05-03T19:22:00Z", outcome: "pending",  charged: false, amount: 0 },
  { id: "s-006", customerName: "Amy Liu",          orderId: "10301", timestamp: "2026-05-04T16:05:00Z", outcome: "reviewed", stars: 5, charged: true,  amount: 5, reviewUrl: "https://www.trustpilot.com" },
  { id: "s-007", customerName: "James Wilson",     orderId: "10371", timestamp: "2026-05-04T22:22:00Z", outcome: "feedback", hasFeedback: true, charged: false, amount: 0 },
  { id: "s-008", customerName: "Robert Kim",       orderId: "10315", timestamp: "2026-05-05T03:30:00Z", outcome: "reviewed", stars: 5, charged: true,  amount: 5, reviewUrl: "https://www.trustpilot.com" },
  { id: "s-009", customerName: "Sophie Nguyen",    orderId: "10384", timestamp: "2026-05-05T17:50:00Z", outcome: "both",     stars: 3, hasFeedback: true, charged: false, amount: 0, reviewUrl: "https://www.trustpilot.com" },
  { id: "s-010", customerName: "Marcus Johnson",   orderId: "10397", timestamp: "2026-05-05T12:05:00Z", outcome: "feedback", hasFeedback: true, charged: false, amount: 0 },
  { id: "s-011", customerName: "Linda Park",       orderId: "10412", timestamp: "2026-05-06T19:33:00Z", outcome: "reviewed", stars: 2, charged: false, amount: 0, reviewUrl: "https://www.trustpilot.com" },
  { id: "s-012", customerName: "Emma Davis",       orderId: "10329", timestamp: "2026-05-05T21:45:00Z", outcome: "reviewed", stars: 5, charged: true,  amount: 5, reviewUrl: "https://www.trustpilot.com" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function StarRow({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map((i) => (
        <Star key={i} size={12} className={i <= n ? "fill-[#00B67A] text-[#00B67A]" : "fill-gray-200 text-gray-200"} />
      ))}
    </div>
  );
}

function MetricCard({ icon, label, value, sub, accent }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-6 flex flex-col gap-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", accent ?? "bg-[#6c47ff]/10 text-[#6c47ff]")}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-[36px] font-bold text-foreground leading-none tracking-tight">{value}</p>
        {sub && <p className="text-[12px] text-muted-foreground mt-2">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MerchantDashboardV2Page() {
  const sessions = useMemo(() => V2_SESSIONS.slice().sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  ), []);

  const charged     = sessions.filter(s => s.charged);
  const reviewed    = sessions.filter(s => s.outcome === "reviewed" || s.outcome === "both");
  const totalBilled = charged.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="min-h-screen bg-[#f4f5f7] flex flex-col">

      {/* ── Header ── */}
      <header className="bg-white border-b border-border px-6 py-3 flex items-center gap-4 shrink-0 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-emerald-600 flex items-center justify-center text-white text-[11px] font-bold">S</div>
          <span className="text-[14px] font-bold text-foreground">Seel</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-[14px] font-medium text-foreground">Review Agent</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-[14px] text-muted-foreground">{MERCHANT_NAME}</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Link href="/plugin-demo-v2" className="flex items-center gap-1.5 text-[12px] text-emerald-600 hover:underline font-medium">
            <MessageSquareText size={14} />Demo V2
          </Link>
          <span className="text-border">|</span>
          <Link href="/" className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground">
            <ArrowLeft size={14} />Back
          </Link>
        </div>
      </header>

      <div className="flex-1 p-8 max-w-[1080px] mx-auto w-full space-y-6">

        {/* ── Big Numbers ── */}
        <div className="grid grid-cols-3 gap-4">
          <MetricCard
            icon={<MessageSquareText size={18} />}
            label="邀请发送"
            value={String(sessions.length)}
            sub="所有用户均收到邀请"
            accent="bg-[#6c47ff]/10 text-[#6c47ff]"
          />
          <MetricCard
            icon={<Star size={18} />}
            label="收到评价"
            value={String(reviewed.length)}
            sub="任意星级均可归因"
            accent="bg-[#00B67A]/10 text-[#00B67A]"
          />
          <MetricCard
            icon={<DollarSign size={18} />}
            label="Total Billing"
            value={`$${totalBilled.toFixed(2)}`}
            sub={`${charged.length} 条 5星归因评价 × $5`}
            accent="bg-emerald-50 text-emerald-600"
          />
        </div>

        {/* ── Grayscale / Rollout Config ── */}
        <div className="rounded-2xl border border-border bg-white shadow-sm p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center">
                <SlidersHorizontal size={18} />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold text-foreground">灰度设置 · Rollout Config</h2>
                <p className="text-[12px] text-muted-foreground mt-0.5">控制触发评价邀请的用户比例</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 text-[11px] font-semibold">
              Active
            </span>
          </div>
          <div className="mt-5 flex items-end gap-6">
            <p className="text-[48px] font-bold text-foreground leading-none tracking-tight">100%</p>
            <div className="flex-1 pb-2">
              <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: "100%" }} />
              </div>
            </div>
          </div>
          <p className="text-[12px] text-muted-foreground mt-3">
            当前配置：全量推送 · 所有符合条件用户均触发邀请
          </p>
        </div>

        {/* ── Billing ── */}
        <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-foreground flex items-center gap-2">
                <DollarSign size={15} className="text-emerald-600" />
                Billing
              </h2>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                仅 5 星评价且归因成功才计费 $5
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 rounded-full px-3 py-1.5 text-[13px] font-bold border border-emerald-200">
              <Zap size={12} />${totalBilled.toFixed(2)}
            </span>
          </div>

          {charged.length === 0 ? (
            <div className="px-6 py-10 text-center text-[13px] text-muted-foreground">暂无归因评价。</div>
          ) : (
            <>
              <div className="grid grid-cols-[1fr_160px_140px_100px_120px] text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3 border-b border-border bg-[#fafafa]">
                <span>Public Review</span>
                <span>Reviewer</span>
                <span>Order ID</span>
                <span>Rating</span>
                <span className="text-right">Charge</span>
              </div>
              {charged.map(s => (
                <div key={s.id} className="grid grid-cols-[1fr_160px_140px_100px_120px] items-center px-6 py-4 border-b border-border last:border-0 hover:bg-[#f9fffc] transition-colors">
                  <a href={s.reviewUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[13px] text-emerald-700 hover:underline font-medium">
                    <ExternalLink size={11} />View on Trustpilot
                  </a>
                  <span className="text-[13px] font-medium text-foreground">{s.customerName}</span>
                  <span className="text-[13px] font-mono text-foreground">#{s.orderId}</span>
                  <StarRow n={s.stars ?? 5} />
                  <div className="flex justify-end">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 text-[12px] font-bold">
                      <DollarSign size={11} />$5
                    </span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* ── All Sessions ── */}
        <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-[15px] font-semibold text-foreground">All Sessions</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              所有用户均收到邀请 · {reviewed.length} reviewed · {sessions.filter(s => s.outcome === "pending").length} pending
            </p>
          </div>

          <div className="grid grid-cols-[1fr_120px_180px_120px_110px] text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3 border-b border-border bg-[#fafafa]">
            <span>Customer</span>
            <span>Order</span>
            <span>Date</span>
            <span>Outcome</span>
            <span className="text-right">Status</span>
          </div>

          {sessions.map(s => (
            <div key={s.id} className="grid grid-cols-[1fr_120px_180px_120px_110px] items-center px-6 py-4 border-b border-border last:border-0 text-[13px] hover:bg-[#fafafa] transition-colors">
              <span className="font-medium text-foreground">{s.customerName}</span>
              <span className="text-muted-foreground font-mono">#{s.orderId}</span>
              <span className="text-muted-foreground text-[12px]">{fmtDate(s.timestamp)} · {fmtTime(s.timestamp)}</span>
              <span>
                {s.outcome === "reviewed" && <span className="inline-flex items-center gap-1 rounded-full bg-[#00B67A]/10 text-[#005a3c] px-2.5 py-0.5 text-[11px] font-medium">⭐ Reviewed</span>}
                {s.outcome === "feedback" && <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">—</span>}
                {s.outcome === "both"     && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-0.5 text-[11px] font-medium">✦ Both</span>}
                {s.outcome === "pending"  && <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-500 px-2.5 py-0.5 text-[11px] font-medium">Pending</span>}
              </span>
              <div className="flex justify-end">
                {s.charged ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold">
                    <DollarSign size={10} />$5
                  </span>
                ) : s.outcome === "pending" ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock size={11} />Pending
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">—</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-[11px] text-muted-foreground pb-4">
          Seel Review Agent · Demo build · Data is simulated
        </p>
      </div>
    </div>
  );
}
