import { useState } from "react";
import { Info } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

/* ── Mock data: daily credit usage over ~30 days ── */
const rawDays = [
  "04-14","04-15","04-16","04-17","04-18","04-19","04-20",
  "04-21","04-22","04-23","04-24","04-25","04-26","04-27",
  "04-28","04-29","04-30","05-01","05-02","05-03","05-04",
  "05-05","05-06","05-07","05-08","05-09","05-10","05-11",
];

const chartData = rawDays.map((d, i) => ({
  date: d,
  support: i === 3 ? 100 : i === 4 ? 14 : i === 10 ? 8 : i === 17 ? 5 : 0,
  sales:   i === 3 ? 110 : i === 6 ? 6  : i === 12 ? 4 : 0,
}));

const TABS = ["Payments", "Reimbursements", "Account settings", "Credit"] as const;
type BillingTab = typeof TABS[number];

const SUPPORT_COLOR = "#6c47ff";
const SALES_COLOR   = "#22c55e";

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState<BillingTab>("Credit");

  return (
    <div className="h-full overflow-y-auto bg-[#fafafa]">
      {/* Page header */}
      <div className="bg-white border-b border-border px-8 pt-5 pb-0">
        <h1 className="text-[20px] font-bold text-foreground mb-4">Billing</h1>
        <div className="flex gap-0">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-[13px] font-medium border-b-2 -mb-[1px] transition-colors ${
                activeTab === tab
                  ? "border-[#6c47ff] text-[#6c47ff]"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-8 py-6 max-w-4xl">
        {activeTab === "Credit" ? (
          <>
            <h2 className="text-[16px] font-semibold text-foreground mb-4">Plan &amp; Usage</h2>

            {/* ── Info Banner ── */}
            <div className="flex items-start gap-2.5 bg-[#eff6ff] border border-[#bfdbfe] rounded-lg px-4 py-3 mb-6">
              <Info size={15} className="text-[#1d4ed8] mt-0.5 shrink-0" />
              <p className="text-[13px] text-[#1d4ed8] leading-relaxed">
                Credits are for tracking only — no charges apply. Every merchant has unlimited credits.
              </p>
            </div>

            {/* ── Usage Analytics chart ── */}
            <div className="bg-white rounded-xl border border-border p-5 mb-4">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <span className="text-[14px] font-semibold text-foreground">Usage Analytics</span>
                  <span className="ml-2 text-[13px] text-muted-foreground">
                    Total Spent <span className="font-semibold text-foreground">210</span> credits
                  </span>
                </div>
              </div>

              <div className="h-[200px] mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barSize={14} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                      interval={3}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                      domain={[0, 250]}
                      ticks={[0, 50, 100, 150, 200, 250]}
                    />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                      cursor={{ fill: "#f9fafb" }}
                    />
                    <Bar dataKey="support" name="Support Agent" fill={SUPPORT_COLOR} radius={[3,3,0,0]} />
                    <Bar dataKey="sales"   name="Sales Agent"   fill={SALES_COLOR}   radius={[3,3,0,0]} />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      formatter={(v) => <span style={{ fontSize: 12, color: "#6b7280" }}>{v}</span>}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── Two metric cards ── */}
            <div className="grid grid-cols-2 gap-4">
              {/* Support Agent */}
              <div className="bg-white rounded-xl border border-border p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#6c47ff]" />
                  <span className="text-[13px] font-semibold text-foreground">Support Agent</span>
                </div>
                <div className="mb-1">
                  <span className="text-[22px] font-bold text-foreground">100</span>
                  <span className="text-[13px] text-muted-foreground ml-1">credits</span>
                </div>
                <p className="text-[12px] text-muted-foreground">Total Spent</p>
                <div className="mt-3 pt-3 border-t border-border text-[12px] text-muted-foreground">
                  112 tickets resolved
                </div>
              </div>

              {/* Sales Agent */}
              <div className="bg-white rounded-xl border border-border p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" />
                  <span className="text-[13px] font-semibold text-foreground">Sales Agent</span>
                </div>
                <div className="mb-1">
                  <span className="text-[22px] font-bold text-foreground">110</span>
                  <span className="text-[13px] text-muted-foreground ml-1">credits</span>
                </div>
                <p className="text-[12px] text-muted-foreground">Total Spent</p>
                <div className="mt-3 pt-3 border-t border-border text-[12px] text-muted-foreground">
                  $1 profit · 122 items upsold
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <p className="text-[14px]">{activeTab} — coming soon</p>
          </div>
        )}
      </div>
    </div>
  );
}
