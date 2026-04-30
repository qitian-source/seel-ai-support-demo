/*
 * ConversationLogSidebar — unified right-side slide-out panel for viewing
 * ticket conversation logs. Supports both conversationLogs (TK-xxxx) and
 * escalationFeed (#xxxx) ticket formats with a consistent layout.
 *
 * Layout order:
 *   1. Header (ticket ID + close)
 *   2. Subject / Customer name
 *   3. Metadata grid (Customer, Intent, Sentiment, Outcome, Mode, Turns, Started)
 *   4. Thread / Reasoning toggle (only for conversationLogs)
 *   5. Conversation thread
 *   6. Escalation note (only for escalation tickets, below thread)
 */
import { useState } from "react";
import {
  conversationLogs,
  escalationFeed,
  type ConversationLog,
  type ReasoningTurn,
  type EscalationCard,
} from "@/lib/data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X, Brain, MessageSquare, Search, ArrowRight,
  Play, CheckCircle, XCircle, Shield, User, Bot,
} from "lucide-react";

/* ── Public API ── */
interface ConversationLogSidebarProps {
  ticketId: string | null;
  onClose: () => void;
}

export default function ConversationLogSidebar({ ticketId, onClose }: ConversationLogSidebarProps) {
  if (!ticketId) return null;

  const convo = conversationLogs.find((c) => c.ticketId === ticketId) ?? null;
  const escalation = !convo ? escalationFeed.find((e) => e.ticketId === ticketId) ?? null : null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-[520px] bg-white border-l border-border z-50 flex flex-col animate-in slide-in-from-right duration-200 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
          <h3 className="text-[14px] font-semibold">
            Conversation Log
            {ticketId && <span className="text-muted-foreground font-normal ml-1.5">{ticketId}</span>}
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 text-muted-foreground transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {convo ? (
            <UnifiedConvoDetail convo={convo} />
          ) : escalation ? (
            <UnifiedEscalationDetail escalation={escalation} />
          ) : (
            <div className="flex items-center justify-center h-full text-center px-8">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Conversation not found</p>
                <p className="text-xs text-muted-foreground/70">
                  No conversation log matches ticket {ticketId}.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ================================================================
   SHARED: Metadata Grid
   ================================================================ */
interface MetaField {
  label: string;
  value: string;
  badge?: boolean;
  badgeVariant?: "default" | "outline" | "secondary";
  badgeClass?: string;
}

function MetadataGrid({ fields }: { fields: MetaField[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 px-5 py-3 border-b border-border">
      {fields.map((f) => (
        <div key={f.label} className="flex items-baseline gap-1.5">
          <span className="text-[11px] text-muted-foreground shrink-0">{f.label}:</span>
          {f.badge ? (
            <Badge
              variant={f.badgeVariant ?? "outline"}
              className={cn("text-[10px] h-5 font-medium", f.badgeClass)}
            >
              {f.value}
            </Badge>
          ) : (
            <span className="text-[12px] font-medium text-foreground truncate">{f.value}</span>
          )}
        </div>
      ))}
    </div>
  );
}

/* ================================================================
   UNIFIED: Escalation Detail
   ================================================================ */
function UnifiedEscalationDetail({ escalation }: { escalation: EscalationCard }) {
  const isResolved = escalation.status === "resolved";

  const outcomeBadgeClass = isResolved
    ? "border-green-300 text-green-700 bg-green-50"
    : "border-red-200 text-red-700 bg-red-50";

  const sentimentColor =
    escalation.sentiment === "frustrated" ? "text-red-600" :
    escalation.sentiment === "urgent" ? "text-amber-600" : "text-foreground";

  const fields: MetaField[] = [
    { label: "Customer", value: `${escalation.customer} (${escalation.email})` },
    { label: "Intent", value: escalation.intent },
    { label: "Sentiment", value: escalation.sentiment, badge: true, badgeVariant: "outline", badgeClass: cn("capitalize", escalation.sentiment === "frustrated" ? "border-red-200 text-red-700 bg-red-50" : escalation.sentiment === "urgent" ? "border-amber-200 text-amber-700 bg-amber-50" : "") },
    { label: "Outcome", value: isResolved ? "Resolved" : "Escalated", badge: true, badgeVariant: "outline", badgeClass: outcomeBadgeClass },
    { label: "Mode", value: escalation.mode, badge: true, badgeVariant: "outline", badgeClass: "" },
    { label: "Turns", value: String(escalation.turns) },
    { label: "Started", value: escalation.startedAt },
  ];

  return (
    <div className="flex flex-col">
      {/* Subject */}
      <div className="px-5 pt-4 pb-3 border-b border-border">
        <h4 className="text-[15px] font-semibold leading-snug">{escalation.subject}</h4>
        <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">{escalation.summary}</p>
      </div>

      {/* Metadata grid */}
      <MetadataGrid fields={fields} />

      {/* Thread */}
      <div className="px-5 py-4">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Conversation Thread</p>
        <div className="space-y-2.5">
          {escalation.thread.map((msg, i) => {
            const isCustomer = msg.role === "customer";
            return (
              <div key={i} className={cn(
                "rounded-lg p-3 text-[12px]",
                isCustomer
                  ? "bg-[#f8f8f8] border border-border"
                  : "bg-[#f0edff] border border-[#e0d8ff]"
              )}>
                <div className="flex items-center gap-2 mb-1.5">
                  {isCustomer ? (
                    <User size={12} className="text-muted-foreground" />
                  ) : (
                    <Bot size={12} className="text-[#6c47ff]" />
                  )}
                  <span className="font-semibold text-[12px]">
                    {isCustomer ? "Customer" : "AI Rep"}
                  </span>
                </div>
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Escalation note — below thread */}
      <div className="px-5 pb-5">
        <div className="bg-amber-50/60 border border-amber-100 rounded-lg p-3">
          <p className="text-[11px] font-semibold text-amber-700 mb-1">Escalation Note</p>
          <p className="text-[12px] text-foreground leading-relaxed">{escalation.reason}</p>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   UNIFIED: Conversation Detail (from conversationLogs)
   ================================================================ */
function UnifiedConvoDetail({ convo }: { convo: ConversationLog }) {
  const [showReasoning, setShowReasoning] = useState(false);

  const outcomeBadgeClass =
    convo.outcome === "Resolved" ? "border-green-300 text-green-700 bg-green-50" :
    convo.outcome === "Escalated" ? "border-red-200 text-red-700 bg-red-50" :
    "border-blue-300 text-blue-700 bg-blue-50";

  const fields: MetaField[] = [
    { label: "Customer", value: `${convo.customer} (${convo.email})` },
    { label: "Intent", value: convo.intent },
    { label: "Sentiment", value: convo.sentiment, badge: true, badgeVariant: "outline", badgeClass: cn("capitalize", convo.sentiment === "Frustrated" ? "border-red-200 text-red-700 bg-red-50" : convo.sentiment === "Positive" ? "border-green-200 text-green-700 bg-green-50" : "") },
    { label: "Outcome", value: convo.outcome, badge: true, badgeVariant: "outline", badgeClass: outcomeBadgeClass },
    { label: "Mode", value: convo.mode, badge: true, badgeVariant: "outline", badgeClass: "" },
    { label: "Turns", value: String(convo.turns) },
    { label: "Started", value: convo.startedAt },
  ];

  return (
    <div className="flex flex-col">
      {/* Subject / Customer */}
      <div className="px-5 pt-4 pb-3 border-b border-border">
        <h4 className="text-[15px] font-semibold leading-snug">{convo.customer}</h4>
        <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">{convo.summary}</p>
      </div>

      {/* Metadata grid */}
      <MetadataGrid fields={fields} />

      {/* Toggle */}
      <div className="px-5 py-2.5 flex items-center gap-2 border-b border-border">
        <Button
          size="sm"
          variant={!showReasoning ? "default" : "outline"}
          className={cn("text-[12px] h-7", !showReasoning && "bg-[#6c47ff] hover:bg-[#5a3ad9]")}
          onClick={() => setShowReasoning(false)}
        >
          <MessageSquare size={12} className="mr-1" /> Thread
        </Button>
        <Button
          size="sm"
          variant={showReasoning ? "default" : "outline"}
          className={cn("text-[12px] h-7", showReasoning && "bg-[#6c47ff] hover:bg-[#5a3ad9]")}
          onClick={() => setShowReasoning(true)}
        >
          <Brain size={12} className="mr-1" /> Reasoning
        </Button>
      </div>

      {/* Content */}
      <div className="px-5 py-4">
        {showReasoning ? (
          <div className="space-y-5">
            {convo.reasoning.map((turn) => (
              <ReasoningTurnView key={turn.turn} turn={turn} />
            ))}
          </div>
        ) : (
          <div className="space-y-2.5">
            {convo.thread.map((msg, i) => (
              <ThreadMessageView key={i} msg={msg} />
            ))}
          </div>
        )}
      </div>

      {/* Escalation note — below thread, only if escalated */}
      {convo.escalationReason && (
        <div className="px-5 pb-5">
          <div className="bg-amber-50/60 border border-amber-100 rounded-lg p-3">
            <p className="text-[11px] font-semibold text-amber-700 mb-1">Escalation Note</p>
            <p className="text-[12px] text-foreground leading-relaxed">{convo.escalationReason}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Reasoning Turn ── */
function ReasoningTurnView({ turn }: { turn: ReasoningTurn }) {
  return (
    <div className="space-y-3">
      <h4 className="text-[12px] font-semibold text-muted-foreground">Turn {turn.turn}</h4>

      <div className="bg-[#f8f8f8] rounded-lg p-3">
        <p className="text-[11px] font-semibold text-muted-foreground mb-1">Customer Input</p>
        <p className="text-[12px] italic">"{turn.customerInput}"</p>
      </div>

      <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Search size={12} className="text-blue-600" />
          <p className="text-[11px] font-semibold text-blue-700">Context Enrichment</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {turn.contextEnrichment.map((item, i) => (
            <Badge key={i} variant="secondary" className="text-[10px] bg-blue-100 text-blue-700 border-0">{item}</Badge>
          ))}
        </div>
      </div>

      <div className="bg-purple-50/50 border border-purple-100 rounded-lg p-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <ArrowRight size={12} className="text-purple-600" />
          <p className="text-[11px] font-semibold text-purple-700">Rule Routing</p>
        </div>
        <p className="text-[12px]">
          Intent: <span className="font-semibold">{turn.ruleRouting.intent}</span>
          <span className="text-muted-foreground ml-2">(confidence: {(turn.ruleRouting.confidence * 100).toFixed(0)}%)</span>
        </p>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {turn.ruleRouting.matchedRules.map((rule, i) => (
            <Badge key={i} variant="secondary" className="text-[10px] bg-purple-100 text-purple-700 border-0">{rule}</Badge>
          ))}
        </div>
      </div>

      <div className="bg-green-50/50 border border-green-100 rounded-lg p-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Play size={12} className="text-green-600" />
          <p className="text-[11px] font-semibold text-green-700">Actions Executed</p>
        </div>
        <div className="space-y-1.5">
          {turn.actionsExecuted.map((action, i) => (
            <div key={i} className="flex items-center gap-2 text-[12px]">
              {action.status === "Success" ? (
                <CheckCircle size={12} className="text-green-600 shrink-0" />
              ) : (
                <XCircle size={12} className="text-red-500 shrink-0" />
              )}
              <span className="font-mono text-[11px]">{action.name}</span>
              <span className="text-muted-foreground">→ {action.result}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Shield size={12} className="text-amber-600" />
          <p className="text-[11px] font-semibold text-amber-700">Guardrail Check</p>
        </div>
        <p className="text-[12px]">{turn.guardrailCheck}</p>
      </div>

      <div className="border-t border-border my-2" />
    </div>
  );
}

/* ── Thread Message ── */
function ThreadMessageView({ msg }: { msg: { from: string; type: string; author: string; text: string; time: string; channel: string } }) {
  const isSystem = msg.from === "system";
  const isCustomer = msg.from === "customer";
  const isInternal = msg.type === "internal-note";

  if (isSystem) {
    return (
      <div className="flex items-center gap-2 py-1.5">
        <div className="flex-1 border-t border-border/50" />
        <span className="text-[11px] text-muted-foreground shrink-0">{msg.text}</span>
        <div className="flex-1 border-t border-border/50" />
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-lg p-3 text-[12px]",
      isInternal ? "bg-amber-50 border border-amber-200" :
      isCustomer ? "bg-[#f8f8f8] border border-border" :
      "bg-[#f0edff] border border-[#e0d8ff]"
    )}>
      <div className="flex items-center gap-2 mb-1.5">
        {isCustomer ? (
          <User size={12} className="text-muted-foreground" />
        ) : (
          <Bot size={12} className="text-[#6c47ff]" />
        )}
        <span className="font-semibold text-[12px]">{msg.author}</span>
        {isInternal && (
          <Badge variant="outline" className="text-[9px] border-amber-300 text-amber-700">Internal Note</Badge>
        )}
        <span className="text-[10px] text-muted-foreground ml-auto">{msg.time} · {msg.channel}</span>
      </div>
      <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
    </div>
  );
}
