/*
 * /customer-chat — 3-tier CSAT widget demo
 *
 *  😊 Satisfied   → Profit Path        → Trustpilot 5-star invite (Powered by Seel)
 *  😐 Neutral     → Improvement Path   → Private "earn 5 stars next time" form
 *  ☹️ Dissatisfied → Crisis Mgmt Path  → Manager escalation (strictly NO TP link)
 */
import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import {
  MessageCircle,
  X,
  Star,
  Send,
  CheckCircle2,
  LayoutDashboard,
  ArrowLeft,
  Lock,
  ExternalLink,
  Zap,
  AlertTriangle,
  ThumbsUp,
  Shield,
} from "lucide-react";
import { DEMO_ORDER_ID, DEMO_CUSTOMER_NAME, MERCHANT_NAME } from "@/lib/reviewData";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "agent" | "user";
  text: string;
  delay: number;
}

type ChatPhase =
  | "playing"
  | "awaiting-end"
  | "csat"
  | "tp-invite"       // Satisfied → Profit Path
  | "neutral-form"    // Neutral   → Improvement Path
  | "dissatisfied-form" // Dissatisfied → Crisis Mgmt
  | "tp-done"
  | "neutral-done"
  | "dissatisfied-done";

// ─── Script ───────────────────────────────────────────────────────────────────

const SCRIPT: ChatMessage[] = [
  { id: "m1", role: "agent",  text: `Hi there! I'm Alex from Seel Support 👋 How can I help you today?`, delay: 600 },
  { id: "m2", role: "user",   text: `Hi, my package for Order #${DEMO_ORDER_ID} hasn't arrived. It was supposed to come 3 days ago.`, delay: 1400 },
  { id: "m3", role: "agent",  text: `I'm sorry to hear that! Let me look into Order #${DEMO_ORDER_ID} right away…`, delay: 1200 },
  { id: "m4", role: "agent",  text: `Great news! Your package is at the local distribution center and is out for delivery today — expected by end of day.`, delay: 1800 },
  { id: "m5", role: "user",   text: `Oh perfect, thank you so much!`, delay: 1200 },
  { id: "m6", role: "agent",  text: `You're welcome, ${DEMO_CUSTOMER_NAME}! Your Seel protection covers any delivery issues. Anything else I can help with?`, delay: 1400 },
  { id: "m7", role: "user",   text: `Nope, that's all. Really appreciate it!`, delay: 1200 },
  { id: "m8", role: "agent",  text: `Happy to help! Marking this as resolved. Have a great day! 😊`, delay: 1000 },
];

// ─── Shared sub-components ────────────────────────────────────────────────────

function AgentAvatar({ size = "sm" }: { size?: "sm" | "md" }) {
  return (
    <div className={cn(
      "rounded-full bg-[#6c47ff] flex items-center justify-center text-white font-bold shrink-0",
      size === "sm" ? "w-7 h-7 text-[11px]" : "w-9 h-9 text-[13px]"
    )}>S</div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <AgentAvatar />
      <div className="bg-white border border-border rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map((i) => (
            <span key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
              style={{ animationDelay: `${i * 150}ms`, animationDuration: "900ms" }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function IntentLogBadge({ orderId, username, stars }: { orderId: string; username: string; stars: number }) {
  return (
    <div className="mt-4 rounded-xl border border-[#6c47ff]/20 bg-[#6c47ff]/5 p-4 text-[12px] font-mono">
      <div className="flex items-center gap-2 mb-2">
        <Zap size={13} className="text-[#6c47ff]" />
        <span className="text-[#6c47ff] font-semibold text-[11px] uppercase tracking-wider">Intent Logged</span>
      </div>
      <div className="space-y-1 text-muted-foreground">
        <div><span className="text-foreground/50">MerchantID</span> <span className="text-foreground">SEEL_MERCHANT_001</span></div>
        <div><span className="text-foreground/50">OrderID &nbsp;&nbsp;</span> <span className="text-foreground">#{orderId}</span></div>
        <div><span className="text-foreground/50">Username &nbsp;</span> <span className="text-foreground">{username}</span></div>
        <div><span className="text-foreground/50">Stars &nbsp;&nbsp;&nbsp;</span> <span className="text-yellow-500">{"★".repeat(stars)}</span></div>
        <div><span className="text-foreground/50">Timestamp</span> <span className="text-foreground">{new Date().toISOString()}</span></div>
      </div>
    </div>
  );
}

// ─── Path 1: Trustpilot Invite (Satisfied → Profit Path) ─────────────────────

function TrustpilotInvite({ onStarClick }: { onStarClick: (stars: number) => void }) {
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);

  const handleClick = (n: number) => {
    if (selected) return;
    setSelected(n);
    onStarClick(n);
  };

  return (
    <div className="rounded-2xl border border-[#00B67A]/30 bg-white shadow-md overflow-hidden">
      {/* Trustpilot green header */}
      <div className="bg-[#00B67A] px-5 py-4 flex items-center gap-3">
        <div>
          <span className="text-white font-bold text-[16px] tracking-tight block">Trustpilot</span>
          <span className="text-white/70 text-[11px]">trustpilot.com</span>
        </div>
        <div className="ml-auto flex gap-0.5">
          {[1,2,3,4,5].map((n) => (
            <div key={n} className="w-7 h-7 bg-white flex items-center justify-center rounded-sm">
              <Star size={16} className="fill-[#00B67A] text-[#00B67A]" />
            </div>
          ))}
        </div>
      </div>

      {/* Powered by Seel incentive badge */}
      <div className="px-5 pt-4 flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-full bg-[#6c47ff]/8 border border-[#6c47ff]/20 px-3 py-1.5 text-[11px] text-[#6c47ff] font-semibold">
          <Zap size={11} />
          Powered by Seel · Share your experience &amp; earn 50 loyalty points 🎁
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        <p className="text-[13px] font-semibold text-foreground mb-1">
          How was your experience with {MERCHANT_NAME}?
        </p>
        <p className="text-[12px] text-muted-foreground mb-5">
          Your honest review helps other shoppers and takes less than 30 seconds.
        </p>

        {!selected ? (
          <div className="flex justify-center gap-2 mb-4" onMouseLeave={() => setHovered(0)}>
            {[1,2,3,4,5].map((n) => (
              <button key={n} onMouseEnter={() => setHovered(n)} onClick={() => handleClick(n)}
                className="group transition-transform hover:scale-110 active:scale-95"
                aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}>
                <Star size={38} className={cn("transition-colors",
                  n <= (hovered || selected) ? "fill-[#00B67A] text-[#00B67A]" : "fill-gray-200 text-gray-200"
                )} />
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-2 mb-4">
            <div className="flex gap-1.5">
              {[1,2,3,4,5].map((n) => (
                <Star key={n} size={34} className={
                  n <= selected ? "fill-[#00B67A] text-[#00B67A]" : "fill-gray-200 text-gray-200"
                } />
              ))}
            </div>
            <div className="flex items-center gap-2 text-[#00B67A] font-semibold text-[13px]">
              <CheckCircle2 size={16} />
              Rating submitted — redirecting to Trustpilot…
            </div>
          </div>
        )}
        {!selected && (
          <p className="text-center text-[11px] text-muted-foreground">Click a star to rate your experience</p>
        )}
      </div>

      <div className="px-5 pb-4 flex items-center gap-2 text-[11px] text-muted-foreground border-t border-border pt-3 mt-1">
        <Lock size={11} />
        Your review will be publicly visible on Trustpilot
      </div>
    </div>
  );
}

// ─── Path 2: Neutral Form (Improvement Path) ─────────────────────────────────

function NeutralFeedbackForm({ onSubmit }: { onSubmit: () => void }) {
  const [text, setText] = useState("");
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 shadow-sm overflow-hidden">
      <div className="bg-amber-100 border-b border-amber-200 px-5 py-3.5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-amber-400/20 flex items-center justify-center text-xl">😐</div>
        <div>
          <p className="text-[13px] font-semibold text-amber-900">Thanks for your honesty!</p>
          <p className="text-[11px] text-amber-700">This is private — only our team will see it</p>
        </div>
        <Shield size={14} className="ml-auto text-amber-600 shrink-0" />
      </div>
      <div className="px-5 py-4">
        <p className="text-[13px] text-amber-900 font-medium mb-3">
          What could we do to earn a ⭐⭐⭐⭐⭐ experience next time?
        </p>
        <textarea
          className="w-full rounded-lg border border-amber-300 bg-white text-[13px] p-3 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 text-foreground placeholder:text-muted-foreground/50"
          rows={3}
          placeholder="Tell us what we could improve…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          onClick={onSubmit}
          disabled={!text.trim()}
          className="mt-3 w-full rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-[13px] font-semibold py-2.5 transition-colors"
        >
          Send Private Feedback
        </button>
      </div>
    </div>
  );
}

// ─── Path 3: Dissatisfied Form (Crisis Management Path) ──────────────────────

function DissatisfiedForm({ onSubmit }: { onSubmit: () => void }) {
  const [text, setText] = useState("");
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 shadow-sm overflow-hidden">
      <div className="bg-red-100 border-b border-red-200 px-5 py-3.5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-red-400/20 flex items-center justify-center text-xl">☹️</div>
        <div>
          <p className="text-[13px] font-semibold text-red-900">We sincerely apologise.</p>
          <p className="text-[11px] text-red-700">Your case will be escalated to a manager</p>
        </div>
        <AlertTriangle size={14} className="ml-auto text-red-500 shrink-0" />
      </div>
      <div className="px-5 py-4">
        <p className="text-[13px] text-red-900 font-medium mb-1">
          Our manager will personally review your case within 24 hours.
        </p>
        <p className="text-[12px] text-red-700/80 mb-4">
          Please describe what went wrong so we can make it right.
        </p>
        <textarea
          className="w-full rounded-lg border border-red-300 bg-white text-[13px] p-3 resize-none focus:outline-none focus:ring-2 focus:ring-red-400 text-foreground placeholder:text-muted-foreground/50"
          rows={3}
          placeholder="Please describe your experience…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          onClick={onSubmit}
          disabled={!text.trim()}
          className="mt-3 w-full rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-[13px] font-semibold py-2.5 transition-colors"
        >
          Escalate to Manager
        </button>
        <p className="mt-2 text-center text-[11px] text-red-500/80 flex items-center justify-center gap-1">
          <Lock size={10} /> This is completely private — it will not be posted publicly
        </p>
      </div>
    </div>
  );
}

// ─── 3-Tier CSAT Step ─────────────────────────────────────────────────────────

function CSATStep({
  onSatisfied,
  onNeutral,
  onDissatisfied,
}: {
  onSatisfied: () => void;
  onNeutral: () => void;
  onDissatisfied: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white shadow-sm p-5">
      <p className="text-[14px] font-semibold text-foreground text-center mb-1">How did we do today?</p>
      <p className="text-[12px] text-muted-foreground text-center mb-5">
        Rate your support experience to close this session.
      </p>
      <div className="flex gap-2.5 justify-center">
        {/* Satisfied — Profit Path */}
        <button
          onClick={onSatisfied}
          className="flex-1 flex flex-col items-center gap-2 rounded-xl border-2 border-transparent hover:border-[#00B67A] hover:bg-[#00B67A]/5 px-3 py-4 transition-all group"
        >
          <span className="text-[28px] group-hover:scale-110 transition-transform">😊</span>
          <span className="text-[12px] font-semibold text-foreground">Satisfied</span>
          <span className="text-[10px] text-[#00B67A] font-medium opacity-0 group-hover:opacity-100 transition-opacity">Leave a review →</span>
        </button>

        {/* Neutral — Improvement Path */}
        <button
          onClick={onNeutral}
          className="flex-1 flex flex-col items-center gap-2 rounded-xl border-2 border-transparent hover:border-amber-400 hover:bg-amber-50 px-3 py-4 transition-all group"
        >
          <span className="text-[28px] group-hover:scale-110 transition-transform">😐</span>
          <span className="text-[12px] font-semibold text-foreground">Neutral</span>
          <span className="text-[10px] text-amber-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Share feedback →</span>
        </button>

        {/* Dissatisfied — Crisis Path */}
        <button
          onClick={onDissatisfied}
          className="flex-1 flex flex-col items-center gap-2 rounded-xl border-2 border-transparent hover:border-red-400 hover:bg-red-50 px-3 py-4 transition-all group"
        >
          <span className="text-[28px] group-hover:scale-110 transition-transform">☹️</span>
          <span className="text-[12px] font-semibold text-foreground">Dissatisfied</span>
          <span className="text-[10px] text-red-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Talk to manager →</span>
        </button>
      </div>
    </div>
  );
}

// ─── Path labels ──────────────────────────────────────────────────────────────

const PATH_META: Record<string, { label: string; desc: string; color: string; border: string; bg: string }> = {
  csat: {
    label: "CSAT Filter active",
    desc: "😊 routes to Trustpilot · 😐 routes to private improvement form · ☹️ escalates to manager (NO public review link)",
    color: "text-amber-800", border: "border-amber-200", bg: "bg-amber-50",
  },
  "tp-invite": {
    label: "😊 Profit Path — CSAT gate passed ✓",
    desc: 'Trustpilot invitation shown with "Powered by Seel" incentive. Clicking any star fires POST /intent-log.',
    color: "text-[#005a3c]", border: "border-[#00B67A]/30", bg: "bg-[#00B67A]/8",
  },
  "neutral-form": {
    label: "😐 Improvement Path — Private feedback only",
    desc: "No Trustpilot link shown. Feedback goes to the merchant's internal queue to improve CX.",
    color: "text-amber-800", border: "border-amber-200", bg: "bg-amber-50",
  },
  "dissatisfied-form": {
    label: "☹️ Crisis Management Path — Manager escalation",
    desc: "Strictly NO Trustpilot link. Case routed privately to protect the merchant's public rating.",
    color: "text-red-800", border: "border-red-200", bg: "bg-red-50",
  },
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CustomerChatPage() {
  const demoPhase = new URLSearchParams(window.location.search).get("demo") as ChatPhase | null;
  const [playKey, setPlayKey] = useState(0);
  const [visibleMessages, setVisibleMessages] = useState<ChatMessage[]>(demoPhase ? SCRIPT : []);
  const [isTyping, setIsTyping] = useState(false);
  const [phase, setPhase] = useState<ChatPhase>(demoPhase ?? "playing");
  const [selectedStars, setSelectedStars] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [visibleMessages, phase, isTyping]);

  // Scripted conversation — re-runs on playKey increment (replay)
  useEffect(() => {
    if (demoPhase) return;
    let cumulative = 500;

    SCRIPT.forEach((msg, i) => {
      const typingStart = cumulative;
      const msgReveal = cumulative + msg.delay;
      cumulative = msgReveal + 100;

      if (msg.role === "agent") {
        setTimeout(() => setIsTyping(true), typingStart);
      }

      timerRef.current = setTimeout(() => {
        setIsTyping(false);
        setVisibleMessages((prev) => [...prev, msg]);
        if (i === SCRIPT.length - 1) setTimeout(() => setPhase("awaiting-end"), 600);
      }, msgReveal);
    });

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [playKey]);

  const handleReset = () => {
    setVisibleMessages([]);
    setIsTyping(false);
    setPhase("playing");
    setSelectedStars(0);
    setPlayKey((k) => k + 1);
  };

  const handleStarClick = (stars: number) => {
    setSelectedStars(stars);
    setTimeout(() => setPhase("tp-done"), 1200);
  };

  const isDone = phase === "tp-done" || phase === "neutral-done" || phase === "dissatisfied-done";
  const pathMeta = PATH_META[phase];

  return (
    <div className="min-h-screen bg-[#f4f5f7] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-border px-6 py-3 flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-[#6c47ff] flex items-center justify-center text-white text-[11px] font-bold">S</div>
          <span className="text-[14px] font-bold text-foreground">Seel</span>
          <span className="text-muted-foreground text-[14px]">/</span>
          <span className="text-[14px] text-muted-foreground">Universal Review Plugin</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Link href="/merchant-dashboard" className="flex items-center gap-1.5 text-[12px] text-[#6c47ff] hover:underline font-medium">
            <LayoutDashboard size={14} />Merchant Dashboard
          </Link>
          <span className="text-border">|</span>
          <Link href="/" className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground">
            <ArrowLeft size={14} />Back to App
          </Link>
        </div>
      </header>

      {/* Quick-jump demo tabs */}
      <div className="bg-white border-b border-border px-6 py-2 flex items-center gap-2">
        <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mr-1">Jump to path:</span>
        {[
          { label: "😊 Satisfied", demo: "tp-invite", color: "text-[#00B67A] bg-[#00B67A]/8 border-[#00B67A]/30" },
          { label: "😐 Neutral", demo: "neutral-form", color: "text-amber-700 bg-amber-50 border-amber-200" },
          { label: "☹️ Dissatisfied", demo: "dissatisfied-form", color: "text-red-700 bg-red-50 border-red-200" },
          { label: "▶ Full demo", demo: null, color: "text-[#6c47ff] bg-[#6c47ff]/8 border-[#6c47ff]/20" },
        ].map(({ label, demo, color }) => (
          <a
            key={label}
            href={demo ? `/customer-chat?demo=${demo}` : "/customer-chat"}
            className={cn("rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors hover:opacity-80", color)}
          >
            {label}
          </a>
        ))}
        <span className="text-border mx-1">|</span>
        <a href="/plugin-demo"
          className="rounded-full border border-dashed border-[#6c47ff]/40 px-3 py-1 text-[11px] font-semibold text-[#6c47ff] hover:bg-[#6c47ff]/5 transition-colors">
          🖥 Storefront Demo
        </a>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[440px] flex flex-col gap-4">

          {/* Demo context banner */}
          <div className="rounded-xl bg-[#6c47ff]/8 border border-[#6c47ff]/20 px-4 py-3 flex items-start gap-3">
            <MessageCircle size={16} className="text-[#6c47ff] mt-0.5 shrink-0" />
            <div>
              <p className="text-[12px] font-semibold text-[#6c47ff]">Demo Scenario</p>
              <p className="text-[12px] text-muted-foreground">
                Customer: <strong>{DEMO_CUSTOMER_NAME}</strong> · Order <strong>#{DEMO_ORDER_ID}</strong> · {MERCHANT_NAME}
              </p>
            </div>
          </div>

          {/* Chat window */}
          <div className="rounded-2xl bg-white border border-border shadow-lg overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-[#6c47ff] px-5 py-4 flex items-center gap-3">
              <AgentAvatar size="md" />
              <div>
                <p className="text-white font-semibold text-[14px]">Seel Support</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-white/70 text-[11px]">Online · Typically replies instantly</span>
                </div>
              </div>
              <button className="ml-auto text-white/60 hover:text-white transition-colors"><X size={18} /></button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[280px] max-h-[360px] bg-[#fafafa]">
              {visibleMessages.map((msg) => (
                <div key={msg.id} className={cn(
                  "flex items-end gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}>
                  {msg.role === "agent" && <AgentAvatar />}
                  <div className={cn(
                    "rounded-2xl px-4 py-2.5 text-[13px] max-w-[78%] shadow-sm",
                    msg.role === "user"
                      ? "bg-[#6c47ff] text-white rounded-br-sm"
                      : "bg-white border border-border text-foreground rounded-bl-sm"
                  )}>
                    {msg.text}
                  </div>
                </div>
              ))}

              {isTyping && <TypingIndicator />}

              {/* Phase-driven overlays */}
              {phase === "csat" && (
                <div className="animate-in fade-in slide-in-from-bottom-3 duration-400">
                  <CSATStep
                    onSatisfied={() => setPhase("tp-invite")}
                    onNeutral={() => setPhase("neutral-form")}
                    onDissatisfied={() => setPhase("dissatisfied-form")}
                  />
                </div>
              )}

              {phase === "tp-invite" && (
                <div className="animate-in fade-in slide-in-from-bottom-3 duration-400">
                  <TrustpilotInvite onStarClick={handleStarClick} />
                </div>
              )}

              {phase === "neutral-form" && (
                <div className="animate-in fade-in slide-in-from-bottom-3 duration-400">
                  <NeutralFeedbackForm onSubmit={() => setPhase("neutral-done")} />
                </div>
              )}

              {phase === "dissatisfied-form" && (
                <div className="animate-in fade-in slide-in-from-bottom-3 duration-400">
                  <DissatisfiedForm onSubmit={() => setPhase("dissatisfied-done")} />
                </div>
              )}

              {phase === "tp-done" && (
                <div className="rounded-2xl border border-[#00B67A]/30 bg-[#00B67A]/5 p-5 text-center animate-in fade-in duration-300">
                  <CheckCircle2 size={32} className="text-[#00B67A] mx-auto mb-3" />
                  <p className="font-semibold text-foreground text-[14px]">Thank you for your review!</p>
                  <p className="text-[12px] text-muted-foreground mt-1">
                    You'll be redirected to Trustpilot to complete your {selectedStars}-star review.
                  </p>
                  <a href="https://www.trustpilot.com" target="_blank" rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-[#00B67A] hover:underline font-medium">
                    Open Trustpilot <ExternalLink size={12} />
                  </a>
                  <IntentLogBadge orderId={DEMO_ORDER_ID} username={DEMO_CUSTOMER_NAME} stars={selectedStars} />
                </div>
              )}

              {phase === "neutral-done" && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center animate-in fade-in duration-300">
                  <ThumbsUp size={32} className="text-amber-500 mx-auto mb-3" />
                  <p className="font-semibold text-amber-900 text-[14px]">Feedback received — thank you!</p>
                  <p className="text-[12px] text-amber-700 mt-1">
                    Our team will review your suggestions and work to earn that 5-star rating next time.
                  </p>
                </div>
              )}

              {phase === "dissatisfied-done" && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center animate-in fade-in duration-300">
                  <Shield size={32} className="text-red-500 mx-auto mb-3" />
                  <p className="font-semibold text-red-900 text-[14px]">Case escalated to our manager.</p>
                  <p className="text-[12px] text-red-700 mt-1">
                    You'll receive a personal follow-up within 24 hours. We're committed to making this right.
                  </p>
                </div>
              )}
            </div>

            {/* Input bar */}
            <div className="border-t border-border px-4 py-3 bg-white">
              {phase === "playing" || phase === "awaiting-end" ? (
                <div className="flex items-center gap-2">
                  <input disabled placeholder={phase === "awaiting-end" ? "Session resolved — click End Session below" : "Chat in progress…"}
                    className="flex-1 text-[13px] bg-muted/30 rounded-lg px-3 py-2 outline-none text-muted-foreground placeholder:text-muted-foreground/60 cursor-not-allowed" />
                  <button disabled className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center opacity-40 cursor-not-allowed">
                    <Send size={14} className="text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <div className="text-center text-[12px] text-muted-foreground">Session closed</div>
              )}
            </div>
          </div>

          {/* End Session button */}
          {phase === "awaiting-end" && (
            <button onClick={() => setPhase("csat")}
              className="w-full rounded-xl bg-foreground hover:bg-foreground/90 text-background text-[13px] font-semibold py-3 transition-colors animate-in fade-in duration-300">
              End Session &amp; Rate Experience
            </button>
          )}

          {/* Replay */}
          {isDone && (
            <button onClick={handleReset}
              className="w-full rounded-xl border border-border hover:bg-muted/50 text-foreground text-[13px] font-medium py-3 transition-colors">
              ↩ Replay Demo
            </button>
          )}

          {/* Path explainer banner */}
          {pathMeta && (
            <div className={cn("rounded-xl border px-4 py-3 text-[12px] animate-in fade-in duration-300", pathMeta.bg, pathMeta.border, pathMeta.color)}>
              <strong>{pathMeta.label}:</strong> {pathMeta.desc}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
