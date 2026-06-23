/*
 * SalesAgentBanner — Product intro modal for Sales Agent
 * Two-panel layout: marketing left + live preview right
 */
import { X, CheckCircle2, TrendingUp } from "lucide-react";

interface Props {
  onClose: () => void;
}

const features = [
  {
    title: "Plug-and-Play Setup",
    body: "No engineering needed. Connect your touchpoints and see attributed revenue in minutes.",
  },
  {
    title: "Flexible Product Strategy",
    body: "Choose what to promote at each touchpoint — new arrivals, bestsellers, or hand-picked products — and let the agent do the selling.",
  },
  {
    title: "Cross-Touchpoint Attribution",
    body: "Track exactly which interaction drove the sale — resolution center, email, chat, or search.",
  },
];

const kpis = [
  { label: "Attributed Sales", value: "$42,259" },
  { label: "Converted Orders", value: "607" },
  { label: "CTR",              value: "4.4%" },
  { label: "AOV",              value: "$105.09" },
];

const touchpoints = [
  { name: "Resolution Center",      sales: "$11,611" },
  { name: "WFP Confirmation Email", sales: "$10,870" },
  { name: "Support Chat",           sales: "$10,234" },
  { name: "Search Bar",             sales:  "$9,542"  },
];

export default function SalesAgentBanner({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-[2px]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden flex w-[900px] max-h-[85vh] mx-4">

        {/* ── Left panel ── */}
        <div className="flex-1 px-12 py-10 flex flex-col overflow-y-auto">
          {/* NEW badge */}
          <span className="self-start inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#6c47ff] text-white text-[11px] font-bold tracking-wide mb-8">
            NEW
            <span className="font-normal opacity-90">Now available for your store</span>
          </span>

          <h1 className="text-[36px] font-extrabold text-foreground leading-tight tracking-tight mb-4">
            AI Sales Agent
          </h1>

          <p className="text-[15px] text-muted-foreground leading-relaxed mb-10">
            An autonomous sales layer that turns every customer touchpoint into a revenue opportunity —
            attributed, auditable, and optimized in real time.
          </p>

          {/* Feature bullets */}
          <ul className="space-y-6 mb-10">
            {features.map((f) => (
              <li key={f.title} className="flex gap-4">
                <CheckCircle2 size={18} className="text-[#6c47ff] shrink-0 mt-0.5" />
                <div>
                  <p className="text-[14px] font-semibold text-foreground mb-0.5">{f.title}</p>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">{f.body}</p>
                </div>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <div className="mt-auto">
            <div className="flex items-center gap-3 bg-[#f5f3ff] rounded-xl px-5 py-4">
              <TrendingUp size={17} className="text-[#6c47ff] shrink-0" />
              <p className="text-[13px] text-foreground">
                Ready to grow revenue?{" "}
                <button onClick={onClose} className="font-semibold text-[#6c47ff] hover:underline">
                  Get started
                </button>{" "}
                and explore your analytics.
              </p>
            </div>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="w-[400px] shrink-0 bg-[#f5f3ff] flex flex-col py-7 px-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <span className="text-[10px] font-bold tracking-[0.12em] text-[#6c47ff] uppercase">
              Product Preview
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[#6c47ff]/10 text-[#6c47ff] transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          {/* KPI cards — 4 individual cards */}
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            {kpis.map((k) => (
              <div key={k.label} className="bg-white rounded-xl shadow-sm px-4 py-3.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">{k.label}</p>
                <p className="text-[22px] font-bold text-foreground leading-none">{k.value}</p>
              </div>
            ))}
          </div>

          {/* Touchpoint performance */}
          <div className="flex-1 bg-white rounded-2xl shadow-sm flex flex-col overflow-hidden">
            <div className="px-5 pt-4 pb-3 border-b border-border/30">
              <p className="text-[12px] font-semibold text-foreground">Touchpoint Performance</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Attributed sales by channel</p>
            </div>
            <div className="flex flex-col divide-y divide-border/30">
              {touchpoints.map((tp) => (
                <div key={tp.name} className="flex items-center justify-between px-5 py-2.5">
                  <span className="text-[13px] text-foreground font-medium">{tp.name}</span>
                  <span className="text-[13px] font-bold text-foreground tabular-nums">{tp.sales}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
