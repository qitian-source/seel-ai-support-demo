import { useState, useRef, useEffect, KeyboardEvent } from "react";
import {
  Sparkles, Download, SlidersHorizontal, ArrowUp,
  BarChart2, LineChart, Globe, FileText, HelpCircle,
  ChevronDown, Calendar,
} from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { cn } from "@/lib/utils";

/* ── Mock responses ──────────────────────────────────────── */
const RESPONSES: Record<string, string> = {
  trending: `**关键词异动**　"niidor adhesive bra" 过去 7 天提及量暴涨 **43%**，由 3 条 TikTok 病毒视频推动（合计 210 万播放）。\n\n• @fitgirl_reviews："fits perfectly even with 38DDD" — 120 万播放\n• @nakedfashion_："invisible push up" 演示 — 68 万播放\n\n情感倾向 **78% 正向**，建议将 UGC 内容置顶品牌主页。`,
  competitor: `**竞品对比（近 7 天）**\n\nNiidor：1,051 帖 ｜ 7.3M 触达 ｜ **98.2%** 互动率\nNuBra：312 帖 ｜ 2.1M 触达 ｜ 86.4% 互动率\nFashion Forms：198 帖 ｜ 890K 触达 ｜ 74.1% 互动率\n\nNiidor 互动率领先。NuBra 于 5/15 上线新款粘性文胸，建议监控 "sticky bra" 关键词重叠。`,
  tiktok: `**TikTok 情感分布（近 7 天）**　净值 **+58%**\n\n✅ 正向 58%："comfort"、"seamless"、"invisible push up"\n⚠️ 中性 30%：尺码咨询、物流询问\n❌ 负向 12%："洗涤后粘性下降"、"包装损坏"\n\n建议：在产品页面重点回应耐洗性问题。`,
  content: `**本周 Top 内容**\n\n🎬 "Sticky Bra Style Guide"（YouTube）— **530 万播放**，带动 32 万新订阅\n🎬 "Try On And Review"（TikTok）— 180 万播放，好评率 98%\n📸 "38DDD Fit Check"（Instagram）— 4.2 万点赞，本月最高收藏率`,
  keywords: `**新兴关键词机会**\n\n🔥 急速上涨："best adhesive bra for large chest"（周环比 +210%）\n📈 稳定增长："reusable sticky bra"（月环比 +67%）\n💡 蓝海："backless dress bra solution"（高意图、低竞争）`,
  collab: `**联名合作推荐品牌**\n\n基于受众重叠度与内容调性分析：\n\n1. **Skims** — 受众重叠 68%，极简内衣赛道，联名曝光预估 2.3M\n2. **Lululemon** — 运动文胸场景互补，TikTok 受众年龄段高度吻合\n3. **Pepper Bra** — 小胸专属品牌，差异化互补，Reddit 口碑极佳\n\n建议优先接触 Skims，ROI 预估最高。`,
};

function getResponse(q: string) {
  const s = q.toLowerCase();
  if (s.includes("collab") || s.includes("co-brand") || s.includes("联名") || s.includes("合作")) return RESPONSES.collab;
  if (s.includes("trend") || s.includes("adhesive") || s.includes("趋势")) return RESPONSES.trending;
  if (s.includes("nubra") || s.includes("competitor") || s.includes("竞品")) return RESPONSES.competitor;
  if (s.includes("tiktok") || s.includes("sentiment") || s.includes("情感")) return RESPONSES.tiktok;
  if (s.includes("content") || s.includes("perform") || s.includes("内容")) return RESPONSES.content;
  if (s.includes("keyword") || s.includes("关键词")) return RESPONSES.keywords;
  return RESPONSES.trending;
}

function RichText({ text }: { text: string }) {
  return (
    <div className="text-[13px] text-foreground leading-relaxed space-y-1">
      {text.split("\n").map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-0.5" />;
        return (
          <p key={i}>
            {line.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
              p.startsWith("**") && p.endsWith("**")
                ? <strong key={j}>{p.slice(2, -2)}</strong>
                : p
            )}
          </p>
        );
      })}
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#6c47ff] animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  );
}

type Msg = { role: "user" | "ai"; text: string };

const PLACEHOLDERS = [
  "Which brands would be ideal for a co-branding collaboration?",
  'Why is "niidor adhesive bra" trending this week?',
  "What's the TikTok sentiment breakdown?",
  "How does Niidor compare to NuBra in engagement?",
];

export default function VocAgentPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [phIdx, setPhIdx] = useState(0);
  const [activeFilter, setActiveFilter] = useState<"collected" | "published">("collected");
  const [activeRange, setActiveRange] = useState("30D");
  const [activeTab, setActiveTab] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  /* cycle placeholder */
  useEffect(() => {
    const t = setInterval(() => setPhIdx((i) => (i + 1) % PLACEHOLDERS.length), 3500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const submit = async (query: string) => {
    const q = query.trim();
    if (!q || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1300));
    setMessages((prev) => [...prev, { role: "ai", text: getResponse(q) }]);
    setLoading(false);
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") submit(input);
  };

  const leftIcons = [
    { Icon: BarChart2, label: "Overview" },
    { Icon: LineChart, label: "Trends" },
    { Icon: Sparkles, label: "AI" },
    { Icon: Globe, label: "Geo" },
    { Icon: FileText, label: "Report" },
  ];

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[#fafafa] relative">
      <div className="p-6">

        {/* ── Ask Me Anything ── */}
        <div className="flex items-start gap-3 mb-5">
          <div className="ml-16 flex-1 bg-white rounded-xl border border-[#c4b0ff]/60 shadow-sm overflow-hidden"
            style={{ boxShadow: "0 0 0 3px rgba(108,71,255,0.06), 0 1px 3px rgba(0,0,0,0.06)" }}>
            <div className="flex items-center gap-0">
              {/* Label */}
              <div className="flex items-center gap-1.5 pl-4 pr-3 py-3 border-r border-[#f0edff] shrink-0">
                <Sparkles size={14} className="text-[#6c47ff]" />
                <span className="text-[13px] font-medium text-[#6c47ff]">Ask Me Anything</span>
              </div>
              {/* Input */}
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={PLACEHOLDERS[phIdx]}
                className="flex-1 px-4 py-3 text-[13px] text-foreground placeholder:text-[#8c9196] bg-transparent outline-none transition-all"
              />
              {/* Send */}
              <button
                onClick={() => submit(input)}
                disabled={!input.trim() || loading}
                className={cn(
                  "m-1.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                  input.trim() && !loading ? "bg-[#6c47ff] hover:bg-[#5a3de0]" : "bg-[#6c47ff] opacity-90"
                )}
              >
                <ArrowUp size={14} className="text-white" />
              </button>
            </div>

            {/* Conversation thread */}
            {(messages.length > 0 || loading) && (
              <div className="border-t border-[#f1f2f3] px-4 py-3 space-y-3 max-h-64 overflow-y-auto">
                {messages.map((msg, i) =>
                  msg.role === "user" ? (
                    <div key={i} className="flex justify-end">
                      <div className="max-w-[72%] bg-[#f0edff] text-[#3d2a8a] text-[13px] px-3.5 py-2 rounded-2xl rounded-tr-sm">
                        {msg.text}
                      </div>
                    </div>
                  ) : (
                    <div key={i} className="flex gap-2.5 items-start">
                      <div className="w-6 h-6 rounded-full bg-[#6c47ff] flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles size={11} className="text-white" />
                      </div>
                      <div className="flex-1"><RichText text={msg.text} /></div>
                    </div>
                  )
                )}
                {loading && (
                  <div className="flex gap-2.5 items-start">
                    <div className="w-6 h-6 rounded-full bg-[#6c47ff] flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles size={11} className="text-white" />
                    </div>
                    <TypingDots />
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          <LanguageSwitcher className="mt-[9px] shrink-0" />
        </div>

        {/* ── Main area: left toolbar + cards ── */}
        <div className="flex gap-0 relative">

          {/* Left floating toolbar */}
          <div className="flex flex-col gap-0.5 bg-white rounded-xl border border-[#e2e4e7] shadow-sm p-1.5 mr-3 self-start sticky top-0">
            {leftIcons.map(({ Icon, label }, i) => (
              <button
                key={label}
                onClick={() => setActiveTab(i)}
                className={cn(
                  "w-7 h-7 flex items-center justify-center rounded-lg transition-colors",
                  activeTab === i ? "bg-[#f0edff] text-[#6c47ff]" : "text-[#8c9196] hover:bg-[#f5f5f5]"
                )}
              >
                <Icon size={14} strokeWidth={1.8} />
              </button>
            ))}
          </div>

          {/* Cards */}
          <div className="flex-1 space-y-4">

            {/* ── Niidor Dashboard Card ── */}
            <div className="bg-white rounded-xl border border-[#e2e4e7] p-5 shadow-sm">
              {/* Top row */}
              <div className="flex items-start justify-between mb-4">
                {/* Brand info */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#6c47ff] flex items-center justify-center text-white text-[14px] font-bold shrink-0">N</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-semibold text-foreground">Niidor</span>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full uppercase tracking-wide">
                        Live Dashboard
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-[12px] text-[#8c9196]">Niidor is a women's lingerie and underwear brand specializing i...</p>
                      <div className="flex items-center gap-1 text-[11px] text-[#8c9196]">
                        <Calendar size={11} strokeWidth={1.6} />
                        <span>2026/5/18 11:47:35</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right controls */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="flex items-center gap-3">
                    <button className="flex items-center gap-1.5 text-[13px] text-[#6d7175] hover:text-foreground transition-colors">
                      <Download size={14} strokeWidth={1.8} />
                      Export Report
                    </button>
                    <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#f5f5f5] transition-colors">
                      <SlidersHorizontal size={14} strokeWidth={1.8} className="text-[#8c9196]" />
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-[#8c9196]">Filter By</span>
                      <div className="flex rounded-lg border border-[#e2e4e7] overflow-hidden text-[12px] font-medium">
                        {(["collected", "published"] as const).map((f) => (
                          <button key={f} onClick={() => setActiveFilter(f)}
                            className={cn("px-3 py-1.5 transition-colors",
                              activeFilter === f ? "bg-foreground text-white" : "text-[#6d7175] hover:bg-[#f5f5f5]")}>
                            {f === "collected" ? "Collected Time" : "Published Time"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end">
                    <span className="text-[12px] text-[#8c9196]">Time Range</span>
                    <div className="flex rounded-lg border border-[#e2e4e7] overflow-hidden text-[12px] font-medium">
                      {["7D", "15D", "30D", "90D", "1Y"].map((r) => (
                        <button key={r} onClick={() => setActiveRange(r)}
                          className={cn("px-2.5 py-1.5 transition-colors",
                            activeRange === r ? "bg-foreground text-white" : "text-[#6d7175] hover:bg-[#f5f5f5]")}>
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Keywords */}
              <div className="flex items-center gap-x-3 gap-y-1.5 mb-2.5 flex-wrap">
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] text-[#8c9196]">◎</span>
                  <span className="text-[12px] text-[#8c9196] font-medium tracking-wide">KEYWORDS:</span>
                </div>
                {["Niidor adhesive bra", "Niidor sticky bra", "Niidor nipple covers", "Niidor strapless bra",
                  "Niidor push up inserts", "Niidor best sticky bra", "Niidor", "Niidor invisible bra"].map((kw) => (
                  <span key={kw}
                    onClick={() => submit(`Tell me about keyword: ${kw}`)}
                    className="text-[12px] text-[#6c47ff] hover:underline cursor-pointer">
                    {kw}
                  </span>
                ))}
                <span className="text-[12px] text-[#8c9196] cursor-pointer hover:text-foreground">+4</span>
              </div>

              {/* Competitors */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-[12px] text-[#8c9196] font-medium tracking-wide">COMPETITORS</span>
                {[
                  { label: "NuBra 12",        color: "text-amber-700 bg-amber-50 border-amber-200" },
                  { label: "Fashion Forms 12", color: "text-sky-700 bg-sky-50 border-sky-200" },
                  { label: "Nippies 12",       color: "text-rose-700 bg-rose-50 border-rose-200" },
                ].map(({ label, color }) => (
                  <span key={label} className={cn("text-[12px] font-medium px-2.5 py-0.5 rounded-full border", color)}>
                    {label}
                  </span>
                ))}
              </div>

              {/* Schedule */}
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={12} strokeWidth={1.6} className="text-[#8c9196]" />
                <span className="text-[12px] text-[#8c9196] font-medium tracking-wide">SCHEDULE</span>
                {/* Toggle */}
                <button className="relative w-8 h-4.5 rounded-full bg-[#e2e4e7] flex items-center px-0.5 transition-colors"
                  style={{ width: 32, height: 18 }}>
                  <span className="w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform" style={{ width: 14, height: 14 }} />
                </button>
                <HelpCircle size={13} strokeWidth={1.6} className="text-[#c9cdd4]" />
              </div>

              {/* More Config */}
              <button className="flex items-center gap-1 text-[12px] text-[#8c9196] hover:text-foreground transition-colors mt-1">
                <ChevronDown size={13} strokeWidth={1.8} />
                More Config
              </button>
            </div>

            {/* ── Market Insight Overview ── */}
            <div className="bg-white rounded-xl border border-[#e2e4e7] p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={15} className="text-[#6c47ff]" />
                  <span className="text-[15px] font-semibold text-foreground">Market Insight Overview</span>
                </div>
                <button className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-[#f5f5f5] transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-[#8c9196]">
                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                  </svg>
                </button>
              </div>

              <div className="space-y-5">
                {/* Global Summary */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] font-semibold text-[#6c47ff]">Global Summary</span>
                    <span className="text-[12px] text-[#6c47ff] cursor-pointer hover:underline">[Ref]</span>
                  </div>
                  <p className="text-[13px] text-foreground leading-relaxed">
                    Niidor maintains a strong market presence with 1051 total posts and a massive reach of 7,338,556,
                    primarily driven by YouTube and TikTok. The brand achieves a high engagement rate of{" "}
                    <span className="bg-[#e6f4ea] text-emerald-700 text-[12px] font-medium px-1.5 py-0.5 rounded">98.23%</span>{" "}
                    and a net sentiment of{" "}
                    <span className="bg-[#f0edff] text-[#6c47ff] text-[12px] font-medium px-1.5 py-0.5 rounded">48.0%</span>
                    , with positive sentiment reaching{" "}
                    <span className="bg-[#e6f4ea] text-emerald-700 text-[12px] font-medium px-1.5 py-0.5 rounded">58%</span>{" "}
                    on TikTok. Key performance indicators are bolstered by high-performing content like the Niidor{" "}
                    <span onClick={() => submit("Tell me about Sticky Bra Style content performance")}
                      className="text-[#6c47ff] underline cursor-pointer">Sticky Bra Style</span>
                    ,{" "}
                    <span onClick={() => submit("Tell me about Try On And Review performance")}
                      className="text-[#6c47ff] underline cursor-pointer">Try On And Review</span>
                    ! which garnered 5,300,000 views on YouTube. Users frequently highlight "{" "}
                    <span className="underline cursor-pointer text-foreground">comfort</span>
                    " and "{" "}
                    <span className="underline cursor-pointer text-foreground">seamless</span>
                    " qualities in their reviews.
                  </p>
                </div>

                {/* Growth Engine */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] font-semibold text-[#6c47ff]">Growth Engine</span>
                    <span className="text-[12px] text-[#6c47ff] cursor-pointer hover:underline">[Ref]</span>
                  </div>
                  <p className="text-[13px] text-foreground leading-relaxed">
                    The primary driver for the brand is the "{" "}
                    <span onClick={() => submit('Tell me about "niidor adhesive bra" keyword performance')}
                      className="text-[#6c47ff] underline cursor-pointer">niidor adhesive bra</span>
                    " which saw 161 mentions, followed by the "{" "}
                    <span className="text-[#6c47ff] underline cursor-pointer">sticky bra</span>
                    " with 63 mentions. TikTok serves as a critical hub for viral demonstrations, such as a user
                    with a 38DDD size reporting the product "{" "}
                    <span className="bg-[#f0edff] text-[#6c47ff] text-[12px] font-medium px-1 py-0.5 rounded">fits perfectly</span>
                    ".{" "}
                    <span className="bg-[#fef3c7] text-amber-700 text-[12px] font-medium px-1.5 py-0.5 rounded">The brand successfully leverages</span>
                    {" "}
                    <span className="text-[#6c47ff] underline cursor-pointer">invisible push up</span>
                    {" "}and "reusable" features to attract consumers looking for "{" "}
                    <span className="text-[#6c47ff] underline cursor-pointer">strapless bra</span>
                    " solutions. These growth keywords are{" "}
                    <span className="underline cursor-pointer text-foreground">support</span>ed by
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
