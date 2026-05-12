/*
 * /review-agent-settings — Seel Review Agent · Settings
 */
import { useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, SlidersHorizontal, Zap, Clock, Info,
  CheckCircle2, AlertCircle, Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MERCHANT_NAME } from "@/lib/reviewData";

const UNLIMITED = 0;
const PRESETS = [
  { label: "测试期", cap: 10,       desc: "新商家上线，先观察 10 人/天的归因质量" },
  { label: "小流量", cap: 30,       desc: "稳定后扩大至 30 人/天" },
  { label: "标准",   cap: 50,       desc: "日常运营推荐量级" },
  { label: "无限制", cap: UNLIMITED, desc: "所有符合条件用户均触发邀请" },
];

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
        {sub && <p className="text-[12px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

export default function ReviewAgentSettingsPage() {
  const [cap, setCap] = useState(UNLIMITED);
  const isUnlimited = cap === UNLIMITED;
  const [triggerDelay, setTriggerDelay] = useState(20);
  const [attributionWindow, setAttributionWindow] = useState(72);
  const [saved, setSaved] = useState(false);

  function save() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

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
          <span className="text-muted-foreground">/</span>
          <span className="text-[14px] font-medium text-foreground">Settings</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Link href="/merchant-dashboard-v2" className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground">
            <ArrowLeft size={14} />Dashboard
          </Link>
        </div>
      </header>

      <div className="flex-1 p-8 max-w-[720px] mx-auto w-full space-y-6">

        {/* ── Daily Invite Limit ── */}
        <Section title="每日邀请上限 · Daily Invite Limit" sub="每自然日最多向多少用户发送 Trustpilot 邀请">

          {/* Big number + bar */}
          <div className="flex items-end gap-5 mb-5">
            <p className="text-[56px] font-bold text-foreground leading-none tracking-tight w-24">
              {isUnlimited ? "∞" : cap}
            </p>
            <div className="flex-1 pb-2 space-y-1.5">
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>∞ 无限制</span><span>100 / 天</span>
              </div>
              <input
                type="range" min={0} max={100} step={5}
                value={cap}
                onChange={e => setCap(Number(e.target.value))}
                className="w-full accent-emerald-500 h-2 cursor-pointer"
              />
            </div>
          </div>

          {/* Presets */}
          <div className="grid grid-cols-4 gap-2 mb-5">
            {PRESETS.map(p => (
              <button
                key={p.cap}
                onClick={() => setCap(p.cap)}
                className={cn(
                  "rounded-xl border px-3 py-3 text-left transition-colors",
                  cap === p.cap
                    ? "border-emerald-400 bg-emerald-50"
                    : "border-border bg-white hover:bg-gray-50"
                )}
              >
                <p className={cn("text-[13px] font-bold", cap === p.cap ? "text-emerald-700" : "text-foreground")}>
                  {p.label}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{p.desc}</p>
              </button>
            ))}
          </div>

          <div className={cn(
            "flex items-center gap-2 text-[12px] rounded-xl px-4 py-3",
            isUnlimited
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-amber-50 text-amber-700 border border-amber-200"
          )}>
            {isUnlimited
              ? <><CheckCircle2 size={14} /> 无限制 · 所有符合条件的已解决会话均会触发邀请</>
              : <><AlertCircle size={14} /> 每日上限 {cap} 人 · 达到上限后当日不再触发邀请，次日零点重置</>
            }
          </div>
        </Section>

        {/* ── Attribution Trigger ── */}
        <Section title="归因触发设置" sub="Log 监测与爬虫延迟配置">
          <div className="space-y-6">

            {/* Crawler delay */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-[13px] font-semibold text-foreground flex items-center gap-1.5">
                    <Zap size={13} className="text-amber-500" />爬虫触发延迟
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    检测到 Intent Log 更新后，延迟多久启动 TP 爬虫
                  </p>
                </div>
                <span className="text-[22px] font-bold text-foreground">{triggerDelay}<span className="text-[13px] font-normal text-muted-foreground ml-1">min</span></span>
              </div>
              <input
                type="range" min={5} max={60} step={5}
                value={triggerDelay}
                onChange={e => setTriggerDelay(Number(e.target.value))}
                className="w-full accent-amber-500 h-2 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>5 min（实时）</span><span>60 min</span>
              </div>
            </div>

            {/* Attribution window */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-[13px] font-semibold text-foreground flex items-center gap-1.5">
                    <Clock size={13} className="text-[#6c47ff]" />归因匹配窗口
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Session 结束后多长时间内提交的 TP 评价纳入候选池
                  </p>
                </div>
                <span className="text-[22px] font-bold text-foreground">{attributionWindow}<span className="text-[13px] font-normal text-muted-foreground ml-1">h</span></span>
              </div>
              <input
                type="range" min={24} max={168} step={24}
                value={attributionWindow}
                onChange={e => setAttributionWindow(Number(e.target.value))}
                className="w-full accent-[#6c47ff] h-2 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>24h</span><span>168h（7天）</span>
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-start gap-2 text-[11px] text-muted-foreground bg-gray-50 rounded-xl px-4 py-3 border border-border">
            <Info size={13} className="mt-0.5 shrink-0" />
            <span>当前配置：Log 更新后 <strong className="text-foreground">{triggerDelay} 分钟</strong>内爬取 TP，爬取到的新评价在 <strong className="text-foreground">{attributionWindow}h</strong> 窗口内与 Intent Log 做模糊匹配。</span>
          </div>
        </Section>

        {/* ── Save ── */}
        <div className="flex justify-end">
          <button
            onClick={save}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-semibold transition-all",
              saved
                ? "bg-emerald-500 text-white"
                : "bg-foreground text-background hover:opacity-90"
            )}
          >
            {saved ? <><CheckCircle2 size={14} /> Saved</> : <><Save size={14} /> Save Changes</>}
          </button>
        </div>

        <p className="text-center text-[11px] text-muted-foreground pb-4">
          Seel Review Agent · Settings · Demo build
        </p>
      </div>
    </div>
  );
}
