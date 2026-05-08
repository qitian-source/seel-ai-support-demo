/*
 * /merchant-dashboard — Seel Review Agent · Merchant Dashboard
 *
 * Shows:
 *   1. Big Numbers  — Positive Reviews · Risk Saved · Total Billing
 *   2. Billing Evidence  — [Public Review Link] [Matched Order ID] [Charge: $5]
 *   3. All CSAT Sessions  — every session (satisfied / neutral / dissatisfied)
 */
import { useMemo } from "react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import {
  Star, DollarSign, ExternalLink,
  CheckCircle2, MessageSquareText, ArrowLeft,
  ShieldCheck, Zap, Clock,
} from "lucide-react";
import {
  runMatchingEngine, intentLogs,
  getNeutralLogs, getDissatisfiedLogs, getTotalRevenueAtRisk,
  MERCHANT_NAME,
} from "@/lib/reviewData";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

// ─── Metric card ──────────────────────────────────────────────────────────────

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

export default function MerchantDashboardPage() {
  const results = useMemo(() => runMatchingEngine(), []);

  const attributed      = results.filter((r) => r.charged);
  const totalBilled     = attributed.reduce((s, r) => s + r.amount, 0);
  const neutralLogs     = getNeutralLogs();
  const dissatisfiedLogs = getDissatisfiedLogs();
  const totalAtRisk     = getTotalRevenueAtRisk();
  const satisfiedLogs   = intentLogs.filter((l) => l.csatResponse === "satisfied");

  return (
    <div className="min-h-screen bg-[#f4f5f7] flex flex-col">

      {/* ── Header ── */}
      <header className="bg-white border-b border-border px-6 py-3 flex items-center gap-4 shrink-0 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-[#6c47ff] flex items-center justify-center text-white text-[11px] font-bold">S</div>
          <span className="text-[14px] font-bold text-foreground">Seel</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-[14px] font-medium text-foreground">Review Agent</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-[14px] text-muted-foreground">{MERCHANT_NAME}</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Link href="/customer-chat" className="flex items-center gap-1.5 text-[12px] text-[#6c47ff] hover:underline font-medium">
            <MessageSquareText size={14} />Customer Chat Demo
          </Link>
          <span className="text-border">|</span>
          <Link href="/" className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground">
            <ArrowLeft size={14} />Back to App
          </Link>
        </div>
      </header>

      <div className="flex-1 p-8 max-w-[1080px] mx-auto w-full space-y-6">

        {/* ── Big Numbers ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-5">
          <MetricCard
            icon={<Star size={18} />}
            label="5-Star Reviews Generated"
            value={String(attributed.length)}
            sub={`from ${satisfiedLogs.length} satisfied sessions`}
            accent="bg-[#00B67A]/10 text-[#00B67A]"
          />
          <MetricCard
            icon={<DollarSign size={18} />}
            label="Total Billing"
            value={`$${totalBilled.toFixed(2)}`}
            sub={`${attributed.length} reviews × $5`}
            accent="bg-[#6c47ff]/10 text-[#6c47ff]"
          />
          <MetricCard
            icon={<ShieldCheck size={18} />}
            label="Revenue at Risk Saved"
            value={`$${totalAtRisk.toLocaleString()}`}
            sub={`${neutralLogs.length + dissatisfiedLogs.length} negative reviews diverted`}
            accent="bg-amber-50 text-amber-600"
          />
        </div>

        {/* ── Billing ──────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-foreground flex items-center gap-2">
                <DollarSign size={15} className="text-[#6c47ff]" />
                Billing
              </h2>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Charged only on 5-star reviews that can be attributed to a plugin session
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 bg-[#6c47ff]/8 text-[#6c47ff] rounded-full px-3 py-1.5 text-[13px] font-bold border border-[#6c47ff]/20">
              <Zap size={12} />${totalBilled.toFixed(2)}
            </span>
          </div>

          {attributed.length === 0 ? (
            <div className="px-6 py-10 text-center text-[13px] text-muted-foreground">No attributed reviews yet.</div>
          ) : (
            <>
              <div className="grid grid-cols-[1fr_180px_180px_130px] text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3 border-b border-border bg-[#fafafa]">
                <span>Public Review</span>
                <span>Reviewer</span>
                <span>Order ID</span>
                <span className="text-right">Charge</span>
              </div>
              {attributed.map((r) => (
                <div key={r.scrapedReview.id} className="grid grid-cols-[1fr_180px_180px_130px] items-center px-6 py-4 border-b border-border last:border-0 hover:bg-[#fafbff] transition-colors">
                  <a href={r.scrapedReview.reviewUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[13px] text-[#6c47ff] hover:underline font-medium">
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map((n) => <Star key={n} size={12} className="fill-[#00B67A] text-[#00B67A]" />)}
                    </div>
                    View on Trustpilot
                    <ExternalLink size={11} />
                  </a>
                  <div>
                    <p className="text-[13px] font-medium text-foreground">{r.scrapedReview.authorName}</p>
                    {r.intentLog && <p className="text-[11px] text-muted-foreground">matched → {r.intentLog.expectedUsername}</p>}
                  </div>
                  <span className="text-[13px] font-mono text-foreground">#{r.intentLog?.orderId}</span>
                  <div className="flex justify-end">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#6c47ff]/10 text-[#6c47ff] px-3 py-1 text-[12px] font-bold">
                      <DollarSign size={11} />$5
                    </span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* ── All CSAT Sessions ─────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-[15px] font-semibold text-foreground">All CSAT Sessions</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {satisfiedLogs.length} satisfied · {neutralLogs.length} neutral · {dissatisfiedLogs.length} dissatisfied
            </p>
          </div>

          <div className="grid grid-cols-[1fr_1fr_160px_120px_100px] text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3 border-b border-border bg-[#fafafa]">
            <span>Customer</span>
            <span>Order</span>
            <span>Date</span>
            <span>CSAT</span>
            <span className="text-right">Status</span>
          </div>

          {intentLogs
            .slice()
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .map((log) => {
              const matchedResult = results.find((r) => r.intentLog?.id === log.id && r.charged);
              const isSatisfied = log.csatResponse === "satisfied";
              const isNeutral   = log.csatResponse === "neutral";
              const isDis       = log.csatResponse === "dissatisfied";
              return (
                <div key={log.id} className="grid grid-cols-[1fr_1fr_160px_120px_100px] items-center px-6 py-4 border-b border-border last:border-0 text-[13px] hover:bg-[#fafafa] transition-colors">
                  <span className="font-medium text-foreground">{log.expectedUsername}</span>
                  <span className="text-muted-foreground font-mono">#{log.orderId}</span>
                  <span className="text-muted-foreground text-[12px]">{fmtDate(log.timestamp)} · {fmtTime(log.timestamp)}</span>
                  <span>
                    {isSatisfied && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#00B67A]/10 text-[#005a3c] px-2.5 py-0.5 text-[11px] font-medium">😊 Satisfied</span>
                    )}
                    {isNeutral && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 px-2.5 py-0.5 text-[11px] font-medium">😐 Neutral</span>
                    )}
                    {isDis && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-700 px-2.5 py-0.5 text-[11px] font-medium">☹️ Unhappy</span>
                    )}
                  </span>
                  <div className="flex justify-end">
                    {matchedResult ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#6c47ff]/10 text-[#6c47ff] px-2.5 py-0.5 text-[11px] font-bold">
                        <DollarSign size={10} />$5
                      </span>
                    ) : isSatisfied ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock size={11} />Pending
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-600 px-2.5 py-0.5 text-[11px] font-medium">
                        <ShieldCheck size={10} />Protected
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
        </div>

        <p className="text-center text-[11px] text-muted-foreground pb-4">
          Seel Review Agent · Demo build · Data is simulated
        </p>
      </div>
    </div>
  );
}
