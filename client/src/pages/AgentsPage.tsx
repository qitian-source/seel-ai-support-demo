/*
 * AgentsPage — Team Lead + Rep views
 * Round 10: Team Lead conversational flow, proposal-only cards, ConversationLogSidebar,
 *           Rep view with Resolve button, textarea chat input.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { useApp } from "@/contexts/AppContext";
import type { ChannelKey, ChannelMode } from "@/contexts/AppContext";
import { dailyDigest, escalationFeed } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Send, User, Crown, ChevronDown,
  ThumbsUp, ThumbsDown,
  Bot, Plus, MessageSquare,
  FileText, Rocket,
  CheckCircle2, Lock, ArrowRight, Inbox, ExternalLink,
  Mail, Ticket, Sliders,
} from "lucide-react";
import AgentProfileSheet from "@/components/AgentProfileSheet";
import ConversationLogSidebar from "@/components/ConversationLogSidebar";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/* ── AI Badge ── */
function AiBadge() {
  return (
    <span className="inline-flex items-center px-1.5 py-0 rounded text-[9px] font-bold tracking-wider bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-600 border border-indigo-200/60 ml-1.5 select-none">
      <Bot size={9} className="mr-0.5" />AI
    </span>
  );
}

/* ── Auto-expanding Chat Input ── */
function ChatInput({ value, onChange, onSend, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  placeholder: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  // Auto-resize
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const lineHeight = 20;
    const maxLines = 4;
    const maxH = lineHeight * maxLines + 16; // padding
    el.style.height = `${Math.min(el.scrollHeight, maxH)}px`;
  }, [value]);

  return (
    <div className="px-5 py-3 border-t border-border bg-white">
      <div className="flex items-end gap-2">
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className="flex-1 min-h-[36px] max-h-[96px] px-3 py-2 rounded-lg border border-border bg-white text-[13px] leading-5 resize-none focus:outline-none focus:ring-2 focus:ring-[#6c47ff]/30 focus:border-[#6c47ff]"
        />
        <Button size="sm" className="h-9 w-9 p-0 bg-[#6c47ff] hover:bg-[#5a3ad9] shrink-0" onClick={onSend}>
          <Send size={14} />
        </Button>
      </div>
    </div>
  );
}

/* ── PROPOSAL CARD — no confidence, "What changed" visual, New Rule instead of Current Rule ── */
function ProposalCard({ topic, onAccept, onReject, onTicketClick }: {
  topic: { id: string; badge: string; title: string; summary: string; ruleContent?: string; currentRuleContent?: string; newRuleContent?: string; sourceTickets: string[]; status: string };
  onAccept: () => void;
  onReject: () => void;
  onTicketClick: (ticketId: string) => void;
}) {
  const [ruleExpanded, setRuleExpanded] = useState(false);
  const [newRuleExpanded, setNewRuleExpanded] = useState(false);
  const isUpdate = !!topic.currentRuleContent;

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      {/* Header — no confidence badge */}
      <div className="px-4 py-3 flex items-center gap-2">
        <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider shrink-0 py-0 h-5 border-[#6c47ff] text-[#6c47ff] bg-[#f0edff]">
          {topic.badge}
        </Badge>
        <span className="text-[13px] font-medium text-foreground flex-1">{topic.title}</span>

      </div>

      {/* Body */}
      <div className="px-4 pb-4 pt-0 border-t border-border/50">
        <p className="text-[12px] text-muted-foreground leading-relaxed mt-3 mb-3">{topic.summary}</p>

        {/* What changed — strong visual differentiation with left accent border + tinted bg */}
        {topic.ruleContent && isUpdate && (
          <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-3 mb-3 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400 rounded-l-lg" />
            <p className="text-[10px] font-semibold text-amber-700 mb-1.5 uppercase tracking-wider pl-2">
              What Changed
            </p>
            <p className={cn(
              "text-[12px] text-foreground leading-relaxed whitespace-pre-wrap pl-2",
              !ruleExpanded && "line-clamp-3"
            )}>
              {topic.ruleContent}
            </p>
            {topic.ruleContent.split("\n").length > 3 && !ruleExpanded && (
              <button
                onClick={() => setRuleExpanded(true)}
                className="text-[11px] text-[#6c47ff] hover:text-[#5a3ad9] font-medium mt-1 pl-2"
              >
                Show full rule
              </button>
            )}
          </div>
        )}

        {/* Proposed Rule — for new rules (not updates) */}
        {topic.ruleContent && !isUpdate && (
          <div className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-lg p-3 mb-3">
            <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
              New Rule
            </p>
            <p className={cn(
              "text-[12px] text-foreground leading-relaxed whitespace-pre-wrap",
              !ruleExpanded && "line-clamp-3"
            )}>
              {topic.ruleContent}
            </p>
            {topic.ruleContent.split("\n").length > 3 && !ruleExpanded && (
              <button
                onClick={() => setRuleExpanded(true)}
                className="text-[11px] text-[#6c47ff] hover:text-[#5a3ad9] font-medium mt-1"
              >
                Show full rule
              </button>
            )}
          </div>
        )}

        {/* New Rule (the final result after update) — replaces old "Current Rule" */}
        {topic.newRuleContent && (
          <div className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-lg p-3 mb-3">
            <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">New Rule</p>
            <p className={cn(
              "text-[12px] text-foreground leading-relaxed whitespace-pre-wrap",
              !newRuleExpanded && "line-clamp-3"
            )}>
              {topic.newRuleContent}
            </p>
            {topic.newRuleContent.split("\n").length > 3 && !newRuleExpanded && (
              <button
                onClick={() => setNewRuleExpanded(true)}
                className="text-[11px] text-[#6c47ff] hover:text-[#5a3ad9] font-medium mt-1"
              >
                Show full rule
              </button>
            )}
          </div>
        )}

        {/* Source tickets — clickable links */}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-3 flex-wrap">
          <span>Source: {topic.sourceTickets.length} tickets</span>
          <span>&middot;</span>
          {topic.sourceTickets.map((t) => (
            <button
              key={t}
              onClick={() => onTicketClick(t)}
              className="text-[10px] text-[#6c47ff] hover:text-[#5a3ad9] underline underline-offset-2 font-medium"
            >
              {t}
            </button>
          ))}
        </div>

        {/* Action buttons — Accept / Reject only */}
        {topic.status === "pending" && (
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-[11px] bg-[#6c47ff] hover:bg-[#5a3ad9] text-white" onClick={onAccept}>
              <ThumbsUp size={11} className="mr-1" /> Accept
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-[11px] text-muted-foreground" onClick={onReject}>
              <ThumbsDown size={11} className="mr-1" /> Reject
            </Button>
          </div>
        )}
        {topic.status === "accepted" && (
          <Badge className="bg-green-50 text-green-700 border-green-200 text-[10px]">Accepted</Badge>
        )}
        {topic.status === "rejected" && (
          <Badge className="bg-red-50 text-red-600 border-red-200 text-[10px]">Rejected</Badge>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   SETUP PROGRESS — the only content when setup is incomplete
   ================================================================ */
function SetupProgress() {
  const {
    step1Complete, step2Complete, step4Complete, step4Status,
    goToChannelSettings, primaryChannel,
    setMainTab, setPlaybookDeepLink,
    setShowGoLiveGuide, goLiveGuideShown, setGoLiveGuideShown,
    resetDocuments, completeSetupDemo,
  } = useApp();

  // Dynamic prerequisite copy for the locked Go-live step.
  const goLiveMissing: string[] = [];
  if (!step1Complete) goLiveMissing.push("connect a channel");

  const steps = [
    {
      id: 1,
      label: "Connect a channel",
      description: "Connect Support Chat, Email, or Zendesk so your AI can start answering.",
      icon: MessageSquare,
      complete: step1Complete,
      locked: false,
      optional: false,
      cta: "Manage channels",
      // Land on the global Settings → Channels picker so the merchant chooses
      // which channel to connect (Settings defaults to the Channels sub-tab).
      action: () => setMainTab("settings"),
    },
    {
      id: 2,
      label: "Import Policies (optional)",
      description: step2Complete
        ? "Your SOP documents are imported — the AI is using your support rules."
        : "Upload your SOP documents to boost answer accuracy. You can do this anytime — it's not required to go live.",
      icon: FileText,
      complete: step2Complete,
      locked: false,
      optional: true,
      cta: "View parsed rules",
      action: () => {
        setPlaybookDeepLink("documents");
        setMainTab("playbook");
      },
    },
    {
      id: 3,
      label: "Go live",
      description: step4Status === "locked"
        ? `First ${goLiveMissing.join(" and ")}.`
        : `Set each channel's Mode to Training or Production to go live.`,
      icon: Rocket,
      complete: step4Complete,
      locked: step4Status === "locked",
      optional: false,
      cta: undefined as string | undefined,
      action: () => {
        if (step4Status === "locked") return;
        // Mode (Training / Production) is set per-channel — send the merchant to
        // the primary channel's settings to flip it live.
        goToChannelSettings(primaryChannel ?? "chat");
        if (!goLiveGuideShown) {
          setShowGoLiveGuide(true);
          setGoLiveGuideShown(true);
        }
      },
    },
  ];

  // Progress tracks only the essential (non-optional) steps.
  const essentialSteps = steps.filter((s) => !s.optional);
  const completedCount = essentialSteps.filter((s) => s.complete).length;
  const essentialTotal = essentialSteps.length;

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Get Started</h2>
          <p className="text-sm text-gray-500">Connect a channel to go live — importing policies is optional.</p>
        </div>

        {/* Progress bar — counts essential steps only */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>{completedCount} of {essentialTotal} essentials</span>
            <span>{Math.round((completedCount / essentialTotal) * 100)}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${(completedCount / essentialTotal) * 100}%` }}
            />
          </div>
        </div>

        {/* Demo controls */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="text-[10px] text-gray-400 uppercase tracking-wider">Demo:</span>
          <button
            onClick={() => { resetDocuments(); toast.success("Documents reset — Import Policies is now empty."); }}
            className="text-[11px] text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
          >
            Reset Documents
          </button>
          <span className="text-[10px] text-gray-300">|</span>
          <button
            onClick={() => { completeSetupDemo(); toast.success("All setup steps completed!"); }}
            className="text-[11px] text-green-600 hover:text-green-800 underline underline-offset-2"
          >
            Complete All Steps
          </button>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <button
                key={step.id}
                onClick={step.action}
                disabled={step.locked}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all",
                  step.complete
                    ? "bg-green-50/50 border-green-200 cursor-pointer hover:bg-green-50"
                    : step.locked
                    ? "bg-gray-50 border-gray-200 cursor-not-allowed opacity-60"
                    : "bg-white border-gray-200 hover:border-indigo-300 hover:shadow-sm cursor-pointer"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                  step.complete ? "bg-green-100" : step.locked ? "bg-gray-100" : "bg-indigo-50"
                )}>
                  {step.complete ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : step.locked ? (
                    <Lock className="w-5 h-5 text-gray-400" />
                  ) : (
                    <Icon className="w-5 h-5 text-indigo-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-sm font-medium",
                      step.complete ? "text-green-700" : step.locked ? "text-gray-400" : "text-gray-900"
                    )}>
                      {step.label}
                    </span>
                    {step.complete && (
                      <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] h-5">Done</Badge>
                    )}
                  </div>
                  <p className={cn(
                    "text-xs mt-0.5",
                    step.complete ? "text-green-600" : step.locked ? "text-gray-400" : "text-gray-500"
                  )}>
                    {step.description}
                  </p>
                </div>
                {step.complete && step.cta ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-green-700 shrink-0">
                    {step.cta}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                ) : !step.complete && !step.locked ? (
                  <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   CHANNEL OVERVIEW PANEL — post-setup "配置后效果"
   Shows each connected channel's Mode + which reps staff it.
   ================================================================ */
const MODE_BADGE: Record<ChannelMode, { label: string; cls: string }> = {
  production: { label: "Production", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  training: { label: "Training", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  off: { label: "Off", cls: "bg-gray-100 text-gray-500 border-gray-200" },
};

function ChannelOverviewPanel() {
  const {
    liveChatConnected, liveChatMode,
    emailChannelConnected, emailChannelAddress, emailMode,
    zendeskConnected, zendesk, zendeskMode,
    channelReps, reps, primaryChannel,
    goToChannelSettings,
  } = useApp();

  const repById = (id: string) => reps.find((r) => r.id === id);

  const rows: {
    key: ChannelKey;
    icon: typeof MessageSquare;
    name: string;
    sub: string;
    connected: boolean;
    mode: ChannelMode;
  }[] = [
    { key: "chat", icon: MessageSquare, name: "Support Chat", sub: "Live widget", connected: liveChatConnected, mode: liveChatMode },
    { key: "email", icon: Mail, name: "Email", sub: emailChannelAddress || "Shared mailbox", connected: emailChannelConnected, mode: emailMode },
    { key: "zendesk", icon: Ticket, name: "Zendesk", sub: zendesk?.subdomain ? `${zendesk.subdomain}.zendesk.com` : "Ticketing", connected: zendeskConnected, mode: zendeskMode },
  ];

  const openSettings = () => goToChannelSettings(primaryChannel ?? "chat");

  return (
    <div className="bg-white border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sliders size={15} className="text-[#6c47ff]" />
        <p className="text-[13px] font-semibold">Channel overview</p>
        <span className="text-[11px] text-muted-foreground">Live configuration</span>
        <button
          onClick={openSettings}
          className="ml-auto text-[12px] text-[#6c47ff] hover:text-[#5a3ad9] font-medium inline-flex items-center gap-1"
        >
          Manage channels <ArrowRight size={12} />
        </button>
      </div>

      <div className="space-y-2">
        {rows.map((row) => {
          const Icon = row.icon;
          const staff = (channelReps[row.key] ?? []).map(repById).filter(Boolean);
          const isPrimary =
            (primaryChannel === "chat" && row.key === "chat") ||
            (primaryChannel === "email" && row.key === "email") ||
            (primaryChannel === "zendesk" && row.key === "zendesk");
          return (
            <button
              key={row.key}
              type="button"
              onClick={() => goToChannelSettings(row.key)}
              className={cn(
                "w-full text-left flex items-center gap-3 rounded-lg border p-3 transition-colors hover:border-[#6c47ff]/40 hover:bg-[#faf9ff]",
                row.connected ? "border-gray-200" : "border-dashed border-gray-200 opacity-60"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                row.connected ? "bg-[#f3f0ff] text-[#6c47ff]" : "bg-gray-100 text-gray-400"
              )}>
                <Icon size={15} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] font-semibold text-foreground truncate">{row.name}</span>
                  {isPrimary && (
                    <span className="text-[9px] font-bold tracking-wide px-1.5 py-px rounded bg-indigo-50 text-indigo-600 border border-indigo-200">
                      PRIMARY
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground truncate">{row.sub}</p>
              </div>

              {!row.connected ? (
                <span className="text-[11px] text-gray-400">Not connected</span>
              ) : (
                <>
                  <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", MODE_BADGE[row.mode].cls)}>
                    {MODE_BADGE[row.mode].label}
                  </span>
                  <div className="flex items-center min-w-[112px] justify-end">
                    {staff.length === 0 ? (
                      <span className="text-[11px] text-amber-600">⚠ No rep</span>
                    ) : (
                      <div className="flex items-center -space-x-1.5">
                        {staff.map((rep) => (
                          <div
                            key={rep!.id}
                            title={rep!.name}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-white"
                            style={{ background: rep!.color }}
                          >
                            {rep!.name.charAt(0).toUpperCase()}
                          </div>
                        ))}
                        <span className="text-[11px] text-muted-foreground ml-2.5">
                          {staff.length === 1 ? staff[0]!.name : `${staff.length} reps`}
                        </span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================
   TEAM LEAD VIEW — conversational message flow
   Daily Digest + Proposals appear as messages from Alex
   ================================================================ */
function TeamLeadView() {
  const { topicsData, updateTopic, hiredRepName, setMainTab } = useApp();
  const [chatMessages, setChatMessages] = useState<{ sender: string; text: string }[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [sidebarTicketId, setSidebarTicketId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Only proposals (filter out question type)
  const proposals = topicsData.filter((t) => t.type === "proposal");

  const handleSendChat = useCallback(() => {
    if (!inputValue.trim()) return;
    setChatMessages((prev) => [...prev, { sender: "user", text: inputValue }]);
    setInputValue("");
    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        { sender: "alex", text: `I'll look into that. Let me analyze the relevant ticket data and get back to you with findings.` },
      ]);
    }, 1000);
  }, [inputValue]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chatMessages]);

  const teamLead = { name: "Alex", initials: "AL", color: "#6c47ff" };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border bg-white flex items-center gap-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: teamLead.color }}>
          <Crown size={14} />
        </div>
        <div className="flex items-center gap-1 flex-1">
          <span className="text-[13px] font-semibold">{teamLead.name}</span>
          <AiBadge />
          <span className="text-[12px] text-muted-foreground ml-2">Team Lead</span>
        </div>
      </div>

      {/* Content — conversational flow */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

        {/* ── Channel Overview ── */}
        <div className="max-w-[640px] ml-11">
          <ChannelOverviewPanel />
        </div>

        {/* ── Message 1: Daily Digest ── */}
        <div className="flex gap-3 items-start">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5" style={{ background: teamLead.color }}>
            <Crown size={12} />
          </div>
          <div className="flex-1 max-w-[640px]">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[11px] font-semibold text-foreground">{teamLead.name}</span>
              <AiBadge />
              <span className="text-[10px] text-muted-foreground ml-auto">{dailyDigest.date}</span>
            </div>
            <div className="bg-white border border-border rounded-xl p-4">
              <p className="text-[13px] font-semibold mb-3">Daily Digest <span className="text-[11px] font-normal text-muted-foreground ml-1.5">{dailyDigest.date}</span></p>
              <div className="grid grid-cols-3 gap-3 mb-3">
                {[
                  { label: "Tickets handled", value: String(dailyDigest.totalTickets), trend: dailyDigest.deltaTickets, positive: true },
                  { label: "Auto-resolution", value: dailyDigest.resolutionRate, trend: dailyDigest.deltaResolution, positive: true },
                  { label: "Escalation", value: dailyDigest.escalationRate, trend: dailyDigest.deltaEscalation, positive: false },
                ].map((stat) => {
                  // For escalation, negative trend is good (fewer escalations)
                  const trendColor = stat.trend?.startsWith("+")
                    ? (stat.positive ? "text-green-600" : "text-red-500")
                    : stat.trend?.startsWith("-")
                    ? (stat.positive ? "text-red-500" : "text-green-600")
                    : "text-gray-500";
                  return (
                    <div key={stat.label} className="bg-[#f8f9fa] rounded-lg p-2.5 text-center">
                      <p className="text-[18px] font-bold text-foreground">{stat.value}</p>
                      <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                      {stat.trend && (
                        <p className={cn("text-[10px] font-medium", trendColor)}>
                          {stat.trend}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-border/50 pt-3">
                <button
                  onClick={() => setMainTab("performance")}
                  className="text-[12px] text-[#6c47ff] hover:text-[#5a3ad9] font-medium inline-flex items-center gap-1"
                >
                  View full dashboard <ArrowRight size={12} />
                </button>
                <p className="text-[12px] text-muted-foreground leading-relaxed mt-1.5">
                  {proposals.filter(t => t.status === "pending").length} items below need your review.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Messages 2+: Proposal cards ── */}
        {proposals.map((topic) => (
          <div key={topic.id} className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5" style={{ background: teamLead.color }}>
              <Crown size={12} />
            </div>
            <div className="flex-1 max-w-[640px]">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[11px] font-semibold text-foreground">{teamLead.name}</span>
                <AiBadge />
                <span className="text-[10px] text-muted-foreground ml-auto">Today</span>
              </div>
              <ProposalCard
                topic={topic}
                onAccept={() => { updateTopic(topic.id, { status: "accepted" }); toast.success("Accepted"); }}
                onReject={() => { updateTopic(topic.id, { status: "rejected" }); toast.success("Rejected"); }}
                onTicketClick={(ticketId) => setSidebarTicketId(ticketId)}
              />
            </div>
          </div>
        ))}

        {/* ── User chat messages ── */}
        {chatMessages.map((msg, i) => {
          const isUser = msg.sender === "user";
          return (
            <div key={`chat-${i}`} className={cn("flex gap-3 items-start", isUser && "flex-row-reverse")}>
              {isUser ? (
                <div className="w-8 h-8 rounded-full bg-[#e5e7eb] flex items-center justify-center text-[#6d7175] shrink-0">
                  <User size={14} />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: teamLead.color }}>
                  <Crown size={12} />
                </div>
              )}
              <div className={cn(
                "max-w-[560px] rounded-xl px-4 py-3 text-[13px] leading-relaxed",
                isUser ? "bg-[#6c47ff] text-white rounded-tr-sm" : "bg-[#fffbf0] border border-[#f5e6c8] rounded-tl-sm text-foreground"
              )}>
                {!isUser && (
                  <div className="flex items-center gap-1 mb-1 -mt-0.5">
                    <span className="text-[11px] font-semibold text-muted-foreground">{teamLead.name}</span>
                    <AiBadge />
                  </div>
                )}
                {msg.text}
              </div>
            </div>
          );
        })}
      </div>

      {/* Chat Input — textarea */}
      <ChatInput
        value={inputValue}
        onChange={setInputValue}
        onSend={handleSendChat}
        placeholder="Message Alex..."
      />

      {/* ConversationLogSidebar */}
      <ConversationLogSidebar ticketId={sidebarTicketId} onClose={() => setSidebarTicketId(null)} />
    </div>
  );
}

/* ================================================================
   REP VIEW — conversational escalation feed with Resolve
   ================================================================ */
function RepView({ agentId }: { agentId: string }) {
  const {
    agentsData, hiredRepName, agentMode, setAllChannelModes,
    zendeskConnected, zendesk, anyChannelConnected,
    showGoLiveGuide, setShowGoLiveGuide,
    goToChannelSettings,
  } = useApp();
  const agent = agentsData.find((a) => a.id === agentId) || agentsData[1];
  const [profileOpen, setProfileOpen] = useState(false);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [pendingMode, setPendingMode] = useState<"production" | "training" | "off" | null>(null);
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [chatMessages, setChatMessages] = useState<{ sender: string; text: string }[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [sidebarTicketId, setSidebarTicketId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const zdOk = anyChannelConnected;

  const handleSendChat = useCallback(() => {
    if (!inputValue.trim()) return;
    setChatMessages((prev) => [...prev, { sender: "user", text: inputValue }]);
    setInputValue("");
    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        { sender: "rep", text: `Got it! I'll handle that right away. Is there anything else you'd like me to focus on?` },
      ]);
    }, 1000);
  }, [inputValue]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chatMessages]);

  const modeConfig = {
    production: { label: "Production", color: "bg-green-50 border-green-200 text-green-700", dot: "bg-green-500" },
    training: { label: "Training", color: "bg-blue-50 border-blue-200 text-blue-700", dot: "bg-blue-500" },
    off: { label: "Off", color: "bg-gray-50 border-gray-200 text-gray-600", dot: "bg-gray-400" },
  };
  const currentMode = modeConfig[agentMode];

  // Get transition warning message based on from → to
  const getTransitionMessage = (from: string, to: string): string | null => {
    if (from === "production" && to === "off")
      return "There are 3 in-progress tickets. They will be reassigned to human agents.";
    if (from === "production" && to === "training")
      return "In-progress tickets will complete in Production mode. New tickets will use Training mode.";
    if (from === "training" && to === "production")
      return "Your Rep will start replying directly to customers.";
    if (from === "off" && to === "production")
      return "Your Rep will start replying directly to customers immediately.";
    return null;
  };

  const handleModeClick = (mode: "production" | "training" | "off") => {
    if ((mode === "production" || mode === "training") && !zdOk) return;
    if (mode === agentMode) return;
    const msg = getTransitionMessage(agentMode, mode);
    if (msg) {
      setPendingMode(mode);
      setShowModeDropdown(false);
    } else {
      confirmModeChange(mode);
    }
  };

  const confirmModeChange = (mode: "production" | "training" | "off") => {
    // Bulk action — set every connected channel to this mode. agentMode then derives from channels.
    setAllChannelModes(mode);
    setShowModeDropdown(false);
    setPendingMode(null);
    if (showGoLiveGuide) setShowGoLiveGuide(false);
    toast.success(`All connected channels set to ${modeConfig[mode].label}`);
  };

  const handleResolve = (id: string) => {
    setResolvedIds((prev) => new Set(prev).add(id));
    toast.success("Escalation marked as resolved");
  };

  // All escalations: needs_attention first, then resolved
  const allEscalations = [
    ...escalationFeed.filter((c) => c.status === "needs_attention"),
    ...escalationFeed.filter((c) => c.status === "resolved"),
  ];

  const displayName = hiredRepName || "AI Rep";

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border bg-white flex items-center gap-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: agent.color }}>
          {hiredRepName ? hiredRepName.slice(0, 2).toUpperCase() : agent.initials}
        </div>
        <div className="flex items-center gap-1 flex-1">
          <span className="text-[13px] font-semibold">{displayName}</span>
          <AiBadge />
          <span className="text-[12px] text-muted-foreground ml-2">AI Support Rep</span>
        </div>

        {/* Go Live Mode */}
        <div className="relative">
          <button
            onClick={() => setShowModeDropdown(!showModeDropdown)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors",
              currentMode.color
            )}
          >
            <div className={cn("w-2 h-2 rounded-full", currentMode.dot)} />
            {currentMode.label}
            <ChevronDown className="w-3 h-3 ml-0.5" />
          </button>

          {/* Go Live Guide spotlight */}
          {showGoLiveGuide && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-indigo-600 text-white rounded-xl shadow-xl z-50 p-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="absolute -top-2 right-6 w-4 h-4 bg-indigo-600 rotate-45" />
              <p className="text-sm font-medium mb-1">Activate your Rep</p>
              <p className="text-xs opacity-90 mb-3">
                Choose Training mode to have your Rep write internal notes, or Production to respond directly to customers.
              </p>
              <button
                onClick={() => { setShowGoLiveGuide(false); setShowModeDropdown(true); }}
                className="text-xs bg-white text-indigo-600 px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-50 transition-colors"
              >
                Got it, let me choose →
              </button>
            </div>
          )}

          {showModeDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowModeDropdown(false)} />
              <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="p-2 space-y-0.5">
                  <button
                    onClick={() => handleModeClick("production")}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2",
                      agentMode === "production" ? "bg-green-50 text-green-700" : "hover:bg-gray-50 text-gray-700",
                      !zdOk && "opacity-50 cursor-not-allowed"
                    )}
                    disabled={!zdOk}
                  >
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <div className="flex-1">
                      <p className="font-medium">Production</p>
                      <p className="text-[10px] text-gray-500">Responds to customers directly</p>
                    </div>
                  </button>
                  <button
                    onClick={() => handleModeClick("training")}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2",
                      agentMode === "training" ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50 text-gray-700",
                      !zdOk && "opacity-50 cursor-not-allowed"
                    )}
                    disabled={!zdOk}
                  >
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <div className="flex-1">
                      <p className="font-medium">Training</p>
                      <p className="text-[10px] text-gray-500">Writes internal notes only</p>
                    </div>
                  </button>
                  <button
                    onClick={() => handleModeClick("off")}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2",
                      agentMode === "off" ? "bg-gray-100 text-gray-600" : "hover:bg-gray-50 text-gray-700"
                    )}
                  >
                    <div className="w-2 h-2 rounded-full bg-gray-400" />
                    <div className="flex-1">
                      <p className="font-medium">Off</p>
                      <p className="text-[10px] text-gray-500">Agent is inactive</p>
                    </div>
                  </button>
                </div>
                {!zdOk && (
                  <div className="px-3 py-2 border-t border-gray-100 bg-amber-50">
                    <p className="text-[10px] text-amber-700">
                      Connect a channel to enable Training and Production modes.
                      <button onClick={() => { setShowModeDropdown(false); goToChannelSettings("chat"); }} className="text-indigo-600 font-medium ml-1 hover:underline">
                        Complete setup →
                      </button>
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <Button
          size="sm"
          variant="outline"
          className="text-[11px] h-7"
          onClick={() => setProfileOpen(true)}
        >
          Profile
        </Button>
      </div>

      {/* Content — Conversational Escalation Feed */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {/* Empty state */}
        {allEscalations.length === 0 && chatMessages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-3">
              <Inbox size={20} className="text-green-500" />
            </div>
            <p className="text-[14px] font-medium text-foreground mb-1">All caught up</p>
            <p className="text-[12px] text-muted-foreground">No escalations right now</p>
          </div>
        )}

        {/* Escalation messages */}
        {allEscalations.map((card) => {
          const isUserResolved = resolvedIds.has(card.id);
          const isOriginallyResolved = card.status === "resolved";
          const isResolved = isUserResolved || isOriginallyResolved;
          const isNeedsAttention = !isResolved;

          // Build Zendesk ticket URL
          const zendeskUrl = zendesk.subdomain
            ? `https://${zendesk.subdomain}.zendesk.com/agent/tickets/${card.ticketId.replace("#", "")}`
            : null;

          return (
            <div key={card.id} className="flex gap-3 items-start">
              {/* Rep avatar — never changes opacity */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5"
                style={{ background: agent.color }}
              >
                {hiredRepName ? hiredRepName.slice(0, 2).toUpperCase() : agent.initials}
              </div>

              {/* Message bubble */}
              <div className="flex-1 max-w-[600px]">
                {/* Sender + time */}
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[11px] font-semibold text-foreground">{displayName}</span>
                  <AiBadge />
                  <span className="text-[10px] text-muted-foreground ml-auto">{card.time}</span>
                </div>

                {/* Escalation message card — clickable to open sidebar */}
                <div
                  className={cn(
                    "rounded-xl border px-4 py-3 cursor-pointer transition-all",
                    isNeedsAttention
                      ? "bg-[#fffbf0] border-[#f5e6c8] hover:border-[#e8d4a8]"
                      : "bg-white border-border opacity-50"
                  )}
                  onClick={() => setSidebarTicketId(card.ticketId)}
                >
                  {/* Ticket ID + status line */}
                  <div className="flex items-center gap-2 mb-1.5">
                    {/* Ticket ID — links to Zendesk */}
                    {zendeskUrl ? (
                      <a
                        href={zendeskUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[12px] font-semibold text-[#6c47ff] hover:text-[#5a3ad9] underline underline-offset-2 inline-flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {card.ticketId}
                        <ExternalLink size={10} className="opacity-50" />
                      </a>
                    ) : (
                      <span className="text-[12px] font-semibold text-foreground">{card.ticketId}</span>
                    )}
                    <span className={cn(
                      "text-[11px] font-medium",
                      isResolved ? "text-green-600" : "text-amber-600"
                    )}>
                      {isResolved ? "Resolved" : "Escalated"}
                    </span>

                    {/* Resolve button — subtle text-only style */}
                    {isNeedsAttention && (
                      <button
                        className="ml-auto text-[10px] text-muted-foreground hover:text-green-700 transition-colors inline-flex items-center gap-1"
                        onClick={(e) => { e.stopPropagation(); handleResolve(card.id); }}
                      >
                        <CheckCircle2 size={10} /> Resolve
                      </button>
                    )}
                  </div>

                  {/* Summary message */}
                  <p className="text-[13px] text-foreground leading-relaxed">
                    {isNeedsAttention && !isUserResolved ? (
                      <>I need your help with <span className="font-medium">{card.subject.toLowerCase()}</span>. {card.reason}</>
                    ) : (
                      <>Resolved: <span className="font-medium">{card.subject}</span> — {card.summary}</>
                    )}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {/* User chat messages */}
        {chatMessages.map((msg, i) => {
          const isUser = msg.sender === "user";
          return (
            <div key={`chat-${i}`} className={cn("flex gap-3 items-start", isUser && "flex-row-reverse")}>
              {isUser ? (
                <div className="w-8 h-8 rounded-full bg-[#e5e7eb] flex items-center justify-center text-[#6d7175] shrink-0">
                  <User size={14} />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: agent.color }}>
                  {hiredRepName ? hiredRepName.slice(0, 2).toUpperCase() : agent.initials}
                </div>
              )}
              <div className={cn(
                "max-w-[560px] rounded-xl px-4 py-3 text-[13px] leading-relaxed",
                isUser ? "bg-[#6c47ff] text-white rounded-tr-sm" : "bg-[#fffbf0] border border-[#f5e6c8] rounded-tl-sm text-foreground"
              )}>
                {!isUser && (
                  <div className="flex items-center gap-1 mb-1 -mt-0.5">
                    <span className="text-[11px] font-semibold text-muted-foreground">{displayName}</span>
                    <AiBadge />
                  </div>
                )}
                {msg.text}
              </div>
            </div>
          );
        })}
      </div>

      <AgentProfileSheet
        agent={agent}
        open={profileOpen}
        onOpenChange={setProfileOpen}
      />

      {/* ConversationLogSidebar */}
      <ConversationLogSidebar ticketId={sidebarTicketId} onClose={() => setSidebarTicketId(null)} />

      {/* Mode transition confirmation dialog */}
      <AlertDialog open={!!pendingMode} onOpenChange={(open) => { if (!open) setPendingMode(null); }}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px]">
              Switch to {pendingMode ? modeConfig[pendingMode].label : ""} mode?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px]">
              {pendingMode && getTransitionMessage(agentMode, pendingMode)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-[12px] h-8">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="text-[12px] h-8 bg-[#6c47ff] hover:bg-[#5a3ad9]"
              onClick={() => { if (pendingMode) confirmModeChange(pendingMode); }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ================================================================
   NORMAL VIEW — Agent sidebar + main content
   ================================================================ */
function NormalView() {
  const { setupFullyComplete } = useApp();

  // AI Manager is the "workforce" hub — the Team Lead (Alex) walks the merchant
  // through onboarding, then surfaces daily performance and rule proposals.
  return (
    <div className="flex-1 flex h-full">
      {setupFullyComplete ? <TeamLeadView /> : <SetupProgress />}
    </div>
  );
}

/* MAIN AGENTS PAGE — Operations only (settings now live in the global Settings tab) */
export default function AgentsPage() {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="flex-1 min-h-0 overflow-hidden flex">
        <NormalView />
      </div>
    </div>
  );
}
