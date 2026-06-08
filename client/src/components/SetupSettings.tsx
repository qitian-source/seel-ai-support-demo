/*
 * SetupSettings — channel + agent settings building blocks.
 * Exposes named sections (ChannelsSection, ConfigureAgentSection, etc.) that the
 * per-channel pages (Live Widget / Email / Zendesk) and AI Manager embed in their
 * Settings sub-tabs. First-time agent config shows "Hire Rep" instead of "Save Changes".
 * Zendesk sub-steps: progressive disclosure (hide later steps if earlier not done).
 */
import { useState, useMemo } from "react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Check, AlertTriangle, Loader2, RefreshCw,
  Globe, Bot, Shield, ExternalLink, Mail,
  MessageSquare, Smartphone, Tag, Users, UserCheck,
  Info, ChevronDown, HelpCircle, Eye, EyeOff, Plus,
  Bolt, Sliders, Star,
  Copy, Webhook, Ticket, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FlagRule } from "@/lib/data";
import LiveChatWidgetCustomizer from "@/components/LiveChatWidgetCustomizer";

/* ================================================================
   TOOLTIP — lightweight hover tooltip
   ================================================================ */
function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex items-center" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 rounded-lg bg-gray-900 text-white text-[11px] leading-snug whitespace-normal max-w-[240px] shadow-lg pointer-events-none animate-in fade-in zoom-in-95 duration-150">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-gray-900" />
        </span>
      )}
    </span>
  );
}

/* ================================================================
   PERSONALITY EXAMPLES
   ================================================================ */
const PERSONALITY_EXAMPLES: Record<string, { description: string; sample: string }> = {
  Friendly: {
    description: "Warm, empathetic, uses casual language and emoji occasionally.",
    sample: "Hey there! 😊 I totally understand how frustrating that must be. Let me look into your order right away and get this sorted out for you!",
  },
  Professional: {
    description: "Formal, precise, maintains a business-appropriate tone.",
    sample: "Thank you for reaching out. I understand your concern regarding the order. Allow me to review the details and provide you with an update shortly.",
  },
  Casual: {
    description: "Relaxed, conversational, like chatting with a friend.",
    sample: "No worries at all! Let me pull up your order real quick — we'll get this figured out in no time.",
  },
  Customize: {
    description: "Define your own tone and style guidelines.",
    sample: "",
  },
};

/* ================================================================
   SECTION 1 — Ticketing System (Zendesk)
   Progressive disclosure: hide later sub-steps if earlier not done
   ================================================================ */
function TicketingSystemSection() {
  const { zendesk, setZendesk, zendeskConnected, setAsyncBackbone, primaryChannel, setPrimaryChannel } = useApp();
  const [demoBranch, setDemoBranch] = useState<"success" | "error">("success");

  const sub = zendesk.subdomain.trim() || "your-subdomain";
  const callbackUrl = `https://api.seel.ai/v1/zendesk/${sub}/inbound`;

  const copy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text).then(
      () => toast.success(`${label} copied`),
      () => toast.error("Copy failed — please copy manually"),
    );
  };

  /* Step 1 — subdomain / authorize */
  const handleAuthorize = () => {
    if (!zendesk.subdomain.trim()) {
      setZendesk({ authError: "Please enter your Zendesk subdomain" });
      return;
    }
    setZendesk({ authStatus: "loading", authError: "" });
    setTimeout(() => {
      if (demoBranch === "success") {
        setZendesk({ authStatus: "success", authError: "" });
        toast.success("Zendesk subdomain verified");
      } else {
        setZendesk({
          authStatus: "error",
          authError: "Unable to reach this subdomain. Double-check the spelling — it's the part before .zendesk.com.",
        });
      }
    }, 1200);
  };

  /* Step 2 — create agent seat (People → Team → Team members) */
  const handleVerifySeat = () => {
    setZendesk({ seatStatus: "loading", seatError: "" });
    setTimeout(() => {
      if (demoBranch === "success") {
        setZendesk({
          seatStatus: "verified",
          seatError: "",
          availableSeats: [
            { id: "seat-1", name: "Support Agent (AI)", email: `support-ai@${sub}.zendesk.com` },
          ],
          selectedSeat: "seat-1",
        });
        toast.success("Agent seat detected");
      } else {
        setZendesk({ seatStatus: "error", seatError: "No matching agent seat found. Create a team member with the email support-ai@" + sub + ".zendesk.com and assign the Agent role." });
      }
    }, 1200);
  };

  /* Step 3 — create webhook (Apps and integrations → Webhooks) */
  const handleVerifyWebhook = () => {
    setZendesk({ webhookStatus: "loading", webhookError: "" });
    setTimeout(() => {
      if (demoBranch === "success") {
        setZendesk({ webhookStatus: "verified", webhookError: "" });
        toast.success("Webhook reachable");
      } else {
        setZendesk({ webhookStatus: "error", webhookError: "No webhook is pointing at the callback URL yet. Create one under Apps and integrations → Webhooks." });
      }
    }, 1200);
  };

  /* Step 4 — create trigger (Objects and rules → Business rules → Triggers) */
  const handleVerifyTrigger = () => {
    setZendesk({ triggerStatus: "loading", triggerError: "" });
    setTimeout(() => {
      if (demoBranch === "success") {
        setZendesk({ triggerStatus: "verified", triggerError: "" });
        toast.success("Trigger detected");
      } else {
        setZendesk({ triggerStatus: "error", triggerError: "No active trigger is calling the webhook. Add one under Objects and rules → Business rules → Triggers." });
      }
    }, 1200);
  };

  /* Step 5 — verify via test ticket */
  const handleVerifyConnection = () => {
    setZendesk({ verifyStatus: "loading", verifyError: "" });
    setTimeout(() => {
      if (demoBranch === "success") {
        setZendesk({ verifyStatus: "verified", verifyError: "" });
        setAsyncBackbone("zendesk");
        if (!primaryChannel) setPrimaryChannel("zendesk");
        toast.success("Connection verified");
      } else {
        setZendesk({ verifyStatus: "error", verifyError: "No test ticket received. Create a ticket in Zendesk and assign it to the agent seat, then verify again." });
      }
    }, 1200);
  };

  const showStep2 = zendesk.authStatus === "success";
  const showStep3 = zendesk.seatStatus === "verified";
  const showStep4 = zendesk.webhookStatus === "verified";
  const showStep5 = zendesk.triggerStatus === "verified";

  function SubStepStatus({ done }: { done: boolean }) {
    return done ? (
      <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
        <Check className="w-3 h-3 text-green-600" />
      </div>
    ) : null;
  }

  function StepHeader({ n, icon: Icon, title, done, path }: { n: number; icon: typeof Webhook; title: string; done: boolean; path?: string }) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold", done ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600")}>{n}</span>
          <Icon className="w-3.5 h-3.5 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
          <SubStepStatus done={done} />
        </div>
        {path && (
          <p className="ml-7 text-[11px] text-gray-400">
            In Zendesk: <span className="font-medium text-gray-500">{path}</span>
          </p>
        )}
      </div>
    );
  }

  function CopyField({ value, label }: { value: string; label: string }) {
    return (
      <div className="flex items-center gap-2 max-w-md">
        <code className="flex-1 text-[11px] bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-gray-700 truncate">{value}</code>
        <button onClick={() => copy(value, label)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors shrink-0" title={`Copy ${label}`}>
          <Copy className="w-3.5 h-3.5 text-gray-500" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Integration note */}
      <div className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-lg">
        <Info className="w-4 h-4 text-gray-400 shrink-0" />
        <p className="text-xs text-gray-600 flex-1">
          This mirrors the official <strong>Connecting Support Agent to Zendesk</strong> guide — five steps, all configured inside your Zendesk Admin Center.
        </p>
      </div>

      {/* Setup guide link */}
      <div className="flex items-center gap-2 p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
        <Info className="w-4 h-4 text-blue-500 shrink-0" />
        <p className="text-xs text-blue-700 flex-1">
          Need help? Follow our step-by-step guide to connect Zendesk.
        </p>
        <a
          href="https://kover2618.zendesk.com/hc/en-us/articles/48957103339419-Connecting-Support-Agent-to-Zendesk"
          target="_blank" rel="noreferrer"
          className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1 shrink-0"
        >
          View Setup Guide <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Demo branch toggle */}
      <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs">
        <span className="text-amber-700 font-medium">DEMO:</span>
        <button onClick={() => setDemoBranch("success")} className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${demoBranch === "success" ? "bg-green-100 text-green-700" : "text-gray-500 hover:bg-gray-100"}`}>Success Path</button>
        <button onClick={() => setDemoBranch("error")} className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${demoBranch === "error" ? "bg-red-100 text-red-700" : "text-gray-500 hover:bg-gray-100"}`}>Error Path</button>
      </div>

      {/* Vertical sub-steps */}
      <div className="space-y-4">
        {/* Step 1: Subdomain */}
        <div className={`rounded-lg border p-4 space-y-3 ${zendesk.authStatus === "success" ? "border-green-200 bg-green-50/30" : "border-gray-200"}`}>
          <StepHeader n={1} icon={Globe} title="Connect your Zendesk subdomain" done={zendesk.authStatus === "success"} />
          <p className="text-xs text-gray-500 ml-7">
            Enter the subdomain of your Zendesk account. <code className="text-[11px] bg-gray-100 px-1 py-0.5 rounded">https://<strong>your-subdomain</strong>.zendesk.com</code>
          </p>
          {zendesk.authStatus !== "success" && (
            <div className="ml-7 space-y-2">
              <div className="flex items-center gap-1.5 max-w-md">
                <span className="text-xs text-gray-500 shrink-0">https://</span>
                <Input
                  value={zendesk.subdomain}
                  onChange={(e) => setZendesk({ subdomain: e.target.value, authError: "" })}
                  placeholder="your-subdomain"
                  className="text-sm flex-1"
                />
                <span className="text-xs text-gray-500 shrink-0">.zendesk.com</span>
              </div>
              {zendesk.authError && <p className="text-xs text-red-600">{zendesk.authError}</p>}
              <Button size="sm" onClick={handleAuthorize} disabled={zendesk.authStatus === "loading"}>
                {zendesk.authStatus === "loading" ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Connecting...</> : "Connect"}
              </Button>
            </div>
          )}
          {zendesk.authStatus === "success" && (
            <p className="text-xs text-green-700 ml-7">Connected to <strong>{zendesk.subdomain}.zendesk.com</strong></p>
          )}
        </div>

        {/* Step 2: Create agent seat */}
        {showStep2 && (
          <div className={`rounded-lg border p-4 space-y-3 ${zendesk.seatStatus === "verified" ? "border-green-200 bg-green-50/30" : "border-gray-200"}`}>
            <StepHeader n={2} icon={Users} title="Create an agent seat" done={zendesk.seatStatus === "verified"} path="People → Team → Team members" />
            <p className="text-xs text-gray-500 ml-7">
              Add a new team member with the <strong>Agent</strong> role using the email below, then click Verify so we can detect the seat.
            </p>
            <div className="ml-7 space-y-2">
              <CopyField value={`support-ai@${sub}.zendesk.com`} label="Agent email" />
              {zendesk.seatError && <p className="text-xs text-red-600">{zendesk.seatError}</p>}
              {zendesk.seatStatus !== "verified" && (
                <Button size="sm" onClick={handleVerifySeat} disabled={zendesk.seatStatus === "loading"}>
                  {zendesk.seatStatus === "loading" ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Verifying...</> : "Verify seat"}
                </Button>
              )}
              {zendesk.seatStatus === "verified" && (
                <p className="text-xs text-green-700">Seat detected: <strong>{zendesk.availableSeats.find(s => s.id === zendesk.selectedSeat)?.name || "Support Agent (AI)"}</strong></p>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Create webhook */}
        {showStep3 && (
          <div className={`rounded-lg border p-4 space-y-3 ${zendesk.webhookStatus === "verified" ? "border-green-200 bg-green-50/30" : "border-gray-200"}`}>
            <StepHeader n={3} icon={Webhook} title="Create a webhook" done={zendesk.webhookStatus === "verified"} path="Apps and integrations → Webhooks → Actions → Create webhook" />
            <p className="text-xs text-gray-500 ml-7">
              Create a webhook that sends requests to this callback URL. Set the request method to <strong>POST</strong> and format to <strong>JSON</strong>.
            </p>
            <div className="ml-7 space-y-2">
              <p className="text-[11px] font-medium text-gray-500">Endpoint URL</p>
              <CopyField value={callbackUrl} label="Callback URL" />
              {zendesk.webhookError && <p className="text-xs text-red-600">{zendesk.webhookError}</p>}
              {zendesk.webhookStatus !== "verified" && (
                <Button size="sm" onClick={handleVerifyWebhook} disabled={zendesk.webhookStatus === "loading"}>
                  {zendesk.webhookStatus === "loading" ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Verifying...</> : "Verify webhook"}
                </Button>
              )}
              {zendesk.webhookStatus === "verified" && (
                <p className="text-xs text-green-700">Webhook reachable — requests are arriving at the callback URL.</p>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Create trigger */}
        {showStep4 && (
          <div className={`rounded-lg border p-4 space-y-3 ${zendesk.triggerStatus === "verified" ? "border-green-200 bg-green-50/30" : "border-gray-200"}`}>
            <StepHeader n={4} icon={Bolt} title="Create a trigger" done={zendesk.triggerStatus === "verified"} path="Objects and rules → Business rules → Triggers → Add trigger" />
            <p className="text-xs text-gray-500 ml-7">
              Add a trigger that fires on <strong>Ticket is Created</strong> and runs the action <strong>Notify active webhook</strong>, selecting the webhook from step 3.
            </p>
            <div className="ml-7 space-y-2">
              {zendesk.triggerError && <p className="text-xs text-red-600">{zendesk.triggerError}</p>}
              {zendesk.triggerStatus !== "verified" && (
                <Button size="sm" onClick={handleVerifyTrigger} disabled={zendesk.triggerStatus === "loading"}>
                  {zendesk.triggerStatus === "loading" ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Verifying...</> : "Verify trigger"}
                </Button>
              )}
              {zendesk.triggerStatus === "verified" && (
                <p className="text-xs text-green-700">Trigger detected and active.</p>
              )}
            </div>
          </div>
        )}

        {/* Step 5: Verify with test ticket */}
        {showStep5 && (
          <div className={`rounded-lg border p-4 space-y-3 ${zendesk.verifyStatus === "verified" ? "border-green-200 bg-green-50/30" : "border-gray-200"}`}>
            <StepHeader n={5} icon={Ticket} title="Verify with a test ticket" done={zendesk.verifyStatus === "verified"} />
            <p className="text-xs text-gray-500 ml-7">
              Create a test ticket in Zendesk and assign it to <strong>{zendesk.availableSeats.find(s => s.id === zendesk.selectedSeat)?.name || "the agent seat"}</strong>, then click Verify below.
            </p>
            <div className="ml-7 space-y-2">
              <a
                href={`https://${sub}.zendesk.com/agent/tickets`}
                target="_blank" rel="noreferrer"
                className="text-xs text-blue-600 hover:underline flex items-center gap-1 w-fit"
              >
                Open Zendesk Dashboard <ExternalLink className="w-3 h-3" />
              </a>
              {zendesk.verifyError && <p className="text-xs text-red-600">{zendesk.verifyError}</p>}
              {zendesk.verifyStatus !== "verified" && (
                <Button size="sm" onClick={handleVerifyConnection} disabled={zendesk.verifyStatus === "loading"}>
                  {zendesk.verifyStatus === "loading" ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Verifying...</> : "Verify"}
                </Button>
              )}
              {zendesk.verifyStatus === "verified" && (
                <p className="text-xs text-green-700">Connection verified — test ticket received successfully.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* All done indicator */}
      {zendeskConnected && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <Check className="w-4 h-4 text-green-600 shrink-0" />
          <p className="text-sm text-green-800 font-medium">Zendesk connected and verified across all five steps.</p>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   Shared written-reply config — reused by Email + Zendesk.
   Persona & tone live in Agent Config; this only controls how
   written replies are signed off and handed off to a human.
   ================================================================ */
type ChannelMode = "off" | "training" | "production";

/** Visual metadata for each channel mode — shared by the dropdown trigger and menu. */
const MODE_META: Record<ChannelMode, { label: string; dot: string; pill: string }> = {
  off:        { label: "Off",        dot: "bg-gray-400",    pill: "bg-gray-100 text-gray-600 border-gray-200" },
  training:   { label: "Training",   dot: "bg-amber-500",   pill: "bg-amber-50 text-amber-700 border-amber-200" },
  production: { label: "Production", dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

/** Compact mode selector used by EVERY channel (chat / email / zendesk).
 *  A single pill showing the current mode that opens an Off / Training / Production menu. */
function ChannelModeDropdown({
  mode, setMode, surface, beforeSelect,
}: {
  mode: ChannelMode;
  setMode: (m: ChannelMode) => void;
  surface: string;
  // Return false to abort the built-in apply (parent handles it, e.g. via a modal).
  beforeSelect?: (m: ChannelMode) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const order: ChannelMode[] = ["off", "training", "production"];
  const meta = MODE_META[mode];
  const select = (m: ChannelMode) => {
    setOpen(false);
    if (beforeSelect && !beforeSelect(m)) return;
    setMode(m);
    if (m === "off") toast(`${surface} paused`);
    else toast.success(`${surface} switched to ${MODE_META[m].label}`);
  };
  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className={cn(
          "flex items-center gap-1.5 h-7 px-2.5 rounded-md border text-[12px] font-medium transition-colors",
          meta.pill,
        )}
      >
        <span className={cn("w-1.5 h-1.5 rounded-full", meta.dot)} />
        {meta.label}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-lg border border-gray-200 bg-white shadow-lg py-1">
            {order.map((m) => (
              <button
                key={m}
                onClick={(e) => { e.stopPropagation(); select(m); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50"
              >
                <span className={cn("w-1.5 h-1.5 rounded-full", MODE_META[m].dot)} />
                <span className="flex-1 text-left">{MODE_META[m].label}</span>
                {mode === m && <Check className="w-3.5 h-3.5 text-emerald-600" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Detail-panel mode block: label + current-mode description on the left, dropdown on the right.
 *  Lives inside each channel's expanded detail (NOT the card header). */
function ChannelModeRow({
  channel, mode, setMode, surface, descriptions,
}: {
  channel: OverrideChannel;
  mode: ChannelMode;
  setMode: (m: ChannelMode) => void;
  surface: string;
  descriptions?: Record<ChannelMode, string>;
}) {
  const { channelReps, liveChatRollout, setLiveChatRollout } = useApp();
  const assignedCount = channelReps[channel]?.length ?? 0;
  const isChat = channel === "chat";
  const defaults: Record<ChannelMode, string> = {
    off: `${surface} replies are paused — nothing is drafted or sent.`,
    training: "AI drafts replies for human review. Nothing reaches the customer.",
    production: "AI delivers eligible replies autonomously. Flagged tickets wait for a human.",
  };
  const copy = descriptions ?? defaults;

  // Rollout (灰度) confirm modal — Live Widget Production only.
  const [showRollout, setShowRollout] = useState(false);
  const [rolloutDraft, setRolloutDraft] = useState(liveChatRollout);

  /* Going live = sending your reps to work on this channel. Block it with 0 reps assigned. */
  const guardedSetMode = (m: ChannelMode) => {
    if (m !== "off" && assignedCount === 0) {
      toast.error(`Assign at least one AI rep to ${surface} before going live.`);
      return;
    }
    setMode(m);
  };

  // For Live Widget, choosing Production opens the gradual-rollout confirm modal
  // instead of flipping live immediately.
  const beforeSelect = (m: ChannelMode): boolean => {
    if (isChat && m === "production") {
      if (assignedCount === 0) {
        toast.error(`Assign at least one AI rep to ${surface} before going live.`);
        return false;
      }
      setRolloutDraft(liveChatRollout);
      setShowRollout(true);
      return false; // abort built-in apply; the modal confirms
    }
    return true;
  };

  const confirmGoLive = () => {
    setLiveChatRollout(rolloutDraft);
    setMode("production");
    setShowRollout(false);
    toast.success(`Widget is live to ${rolloutDraft}% of eligible visitors`);
  };

  return (
    <div className="rounded-lg border border-gray-200 p-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-gray-700">Mode</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{copy[mode]}</p>
        </div>
        <ChannelModeDropdown
          mode={mode}
          setMode={guardedSetMode}
          surface={surface}
          beforeSelect={isChat ? beforeSelect : undefined}
        />
      </div>

      {/* Prominent gradual-rollout (灰度) indicator — Live Widget in Production */}
      {isChat && mode === "production" && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2.5">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold tabular-nums leading-none text-emerald-700">{liveChatRollout}%</span>
            <div className="leading-tight">
              <p className="text-xs font-semibold text-emerald-800">Gradual rollout</p>
              <p className="text-[11px] text-emerald-700/70">Share of eligible visitors who see the widget</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[11px] border-emerald-300 text-emerald-700 hover:bg-emerald-100"
            onClick={() => { setRolloutDraft(liveChatRollout); setShowRollout(true); }}
          >
            Adjust
          </Button>
        </div>
      )}

      {mode !== "off" && assignedCount === 0 && (
        <p className="text-[11px] text-amber-600">⚠ No AI rep is assigned — this channel is live but won't reply. Assign a rep below.</p>
      )}

      {/* Switch-to-Production confirm with gradual-rollout slider */}
      <Dialog open={showRollout} onOpenChange={setShowRollout}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Switch to Production?</DialogTitle>
            <DialogDescription>The widget will go live to real customers.</DialogDescription>
          </DialogHeader>

          <div className="py-1 space-y-5">
            <div>
              <p className="text-sm font-semibold text-gray-800">Rollout percentage</p>
              <p className="text-xs text-gray-500 mt-0.5">Share of eligible visitors who see the widget.</p>
            </div>

            {/* Prominent % readout */}
            <div className="flex items-end justify-center gap-0.5">
              <span className="text-5xl font-bold tabular-nums leading-none text-[#6c47ff]">{rolloutDraft}</span>
              <span className="text-2xl font-semibold text-[#6c47ff] mb-1">%</span>
            </div>

            <Slider
              value={[rolloutDraft]}
              min={0}
              max={100}
              step={5}
              onValueChange={(v) => setRolloutDraft(v[0])}
            />

            {/* Quick presets */}
            <div className="flex items-center justify-center gap-2">
              {[10, 25, 50, 100].map((p) => (
                <button
                  key={p}
                  onClick={() => setRolloutDraft(p)}
                  className={cn(
                    "px-3 h-7 rounded-full border text-xs font-medium transition-colors",
                    rolloutDraft === p
                      ? "bg-[#6c47ff] text-white border-[#6c47ff]"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50",
                  )}
                >
                  {p}%
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRollout(false)}>Cancel</Button>
            <Button className="bg-[#6c47ff] hover:bg-[#5a3ad9] text-white" onClick={confirmGoLive}>Go Live</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* Channel reply/escalation config — direct per-channel settings (no agent inheritance).
   includeSignoff is true for written channels (Email / Zendesk); chat has no sign-off. */
type OverrideChannel = "email" | "zendesk" | "chat";
function ChannelReplyOverrideBlock({ channel, surface, includeSignoff = false }: { channel: OverrideChannel; surface: string; includeSignoff?: boolean }) {
  const { channelReply, setChannelReply, handoff } = useApp();
  const cfg = channelReply[channel];
  const seats = handoff.availableHandoffSeats;

  return (
    <div className="rounded-lg border border-gray-200 p-3 space-y-3">
      <div className="flex items-center gap-1.5">
        <p className="text-xs font-semibold text-gray-700">{includeSignoff ? "Written reply & escalation" : "Escalation"}</p>
        <Tooltip text={`These settings apply only to ${surface}. Each channel is configured independently.`}>
          <HelpCircle className="w-3.5 h-3.5 text-gray-300 hover:text-gray-500 cursor-help" />
        </Tooltip>
      </div>

      {includeSignoff && (
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Reply sign-off</label>
          <textarea
            value={cfg.signoff}
            onChange={(e) => setChannelReply(channel, { signoff: e.target.value })}
            rows={2}
            className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            placeholder={"Best regards,\nThe Support Team"}
          />
        </div>
      )}

      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">Escalation handoff</label>
        <p className="text-[11px] text-gray-400 mb-1.5">{`When a ${surface.toLowerCase()} conversation needs a human, hand it to:`}</p>
        <select
          value={cfg.escalationSeat}
          onChange={(e) => setChannelReply(channel, { escalationSeat: e.target.value })}
          className="w-full sm:max-w-sm h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        >
          <option value="">Select a teammate…</option>
          {seats.map((s) => (
            <option key={s.id} value={s.id}>{s.name} — {s.email}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

/* ================================================================
   SECTION 1B — Channels (chat-first connection layer)
   Three channel cards in demand order: Support Chat > Email > Zendesk
   Single-primary-channel model. Connect ANY channel to finish step 1.
   ================================================================ */
type ChannelId = "chat" | "email" | "zendesk";

export function ChannelsSection({ only }: { only?: ChannelId } = {}) {
  const {
    liveChatConnected, setLiveChatConnected,
    liveChatMode, setLiveChatMode,
    emailChannelConnected, setEmailChannelConnected,
    emailChannelAddress, setEmailChannelAddress,
    emailMode, setEmailMode,
    zendeskConnected,
    zendeskMode, setZendeskMode,
    asyncBackbone, setAsyncBackbone,
    primaryChannel, setPrimaryChannel,
    chatWidget, setChatWidget,
  } = useApp();

  const [chatConnecting, setChatConnecting] = useState(false);
  const [emailConnecting, setEmailConnecting] = useState(false);
  const [expanded, setExpanded] = useState<Record<ChannelId, boolean>>({
    // When embedded as a single-channel page (only=…), keep that card open.
    chat: only ? only === "chat" : !liveChatConnected,
    email: only === "email",
    zendesk: only === "zendesk",
  });
  /* Email mailbox form (local — credentials are never persisted) */
  const [mailboxPassword, setMailboxPassword] = useState("");
  const [showMailboxPassword, setShowMailboxPassword] = useState(false);
  const [mailboxAdvanced, setMailboxAdvanced] = useState(false);
  const [mailboxServerType, setMailboxServerType] = useState("IMAP");
  const [mailboxError, setMailboxError] = useState("");
  const [widgetOpen, setWidgetOpen] = useState(false);
  const [showModePrompt, setShowModePrompt] = useState(true);

  const isConnected: Record<ChannelId, boolean> = {
    chat: liveChatConnected,
    email: emailChannelConnected,
    zendesk: zendeskConnected,
  };
  const connectedCount = Object.values(isConnected).filter(Boolean).length;

  const toggle = (id: ChannelId) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const handleConnectChat = () => {
    // Add to theme → simulate jumping to the Shopify theme editor to install the
    // app embed, then reflect the installed state on return. (No real external
    // navigation — the preview sandbox blocks non-localhost URLs.)
    toast.info("Opening Shopify theme editor…");
    setChatConnecting(true);
    setTimeout(() => {
      setLiveChatConnected(true);
      setLiveChatMode("training");
      if (!primaryChannel) setPrimaryChannel("chat");
      setChatConnecting(false);
      setExpanded((p) => ({ ...p, chat: true }));
      toast.success("Widget installed on seel-demo.myshopify.com");
    }, 1200);
  };

  const handleConnectEmail = () => {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(emailChannelAddress.trim())) {
      setMailboxError("Please enter a valid email address.");
      return;
    }
    if (!emailChannelConnected && !mailboxPassword.trim()) {
      setMailboxError("Please enter your password or app password.");
      return;
    }
    setMailboxError("");
    setEmailConnecting(true);
    setTimeout(() => {
      setEmailChannelConnected(true);
      setEmailMode("training");
      setAsyncBackbone("email");
      if (!primaryChannel) setPrimaryChannel("email");
      setEmailConnecting(false);
      setExpanded((p) => ({ ...p, email: true }));
      toast.success("Support inbox connected");
    }, 1200);
  };

  /* ── Connected pill / Set-as-primary control ── */
  function StatusControls({ id }: { id: ChannelId }) {
    if (!isConnected[id]) return null;
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1 text-[11px] font-medium text-green-700">
          <span className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center">
            <Check className="w-2.5 h-2.5 text-green-600" />
          </span>
          Connected
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Card 1: Live Widget (Recommended · Fastest) ── */}
      {(!only || only === "chat") && (
      <div className={cn(
        "rounded-xl border overflow-hidden transition-colors",
        liveChatConnected ? "border-gray-200" : "border-indigo-200 bg-indigo-50/20"
      )}>
        <div className="flex items-center justify-between p-4">
          <button onClick={() => toggle("chat")} className="flex items-center gap-3 flex-1 text-left">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
              <MessageSquare className="w-[18px] h-[18px] text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-gray-800">Live Chat Widget</p>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Real-time chat on your storefront</p>
            </div>
          </button>
          <div className="flex items-center gap-2 shrink-0">
            {liveChatConnected ? (
              <StatusControls id="chat" />
            ) : (
              <Button size="sm" variant="outline" onClick={() => toggle("chat")}>
                {expanded.chat ? "Hide setup" : "Set up"}
              </Button>
            )}
            <button onClick={() => toggle("chat")} className="p-1 text-gray-400 hover:text-gray-600">
              <ChevronDown className={cn("w-4 h-4 transition-transform", expanded.chat ? "" : "-rotate-90")} />
            </button>
          </div>
        </div>

        {expanded.chat && (
          <div className="border-t border-gray-100 p-4 space-y-4">
            {!liveChatConnected ? (
              <div className="space-y-3">
                <p className="text-xs text-gray-600">Add the chat widget to your <strong>Shopify theme</strong> — no code required. We'll open the Shopify theme editor; once installed, your widget settings appear here.</p>
                <Button size="sm" onClick={handleConnectChat} disabled={chatConnecting}>
                  {chatConnecting ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Opening Shopify…</> : "Add to theme"}
                </Button>
              </div>
            ) : (
              <>
                {/* Installed confirmation */}
                <div className="flex items-center gap-2 p-2.5 bg-green-50 border border-green-200 rounded-lg">
                  <Check className="w-4 h-4 text-green-600 shrink-0" />
                  <p className="text-xs text-green-800">Widget installed on <strong>seel-demo.myshopify.com</strong></p>
                </div>

                {showModePrompt && (
                  <p className="flex items-center gap-1 text-[11px] font-medium text-[#6c47ff]">
                    <Bolt className="w-3 h-3" /> Choose a mode to go live ↓
                  </p>
                )}
                <div className={cn("rounded-lg transition-shadow", showModePrompt && "ring-2 ring-[#6c47ff] ring-offset-2")}>
                  <ChannelModeRow
                    channel="chat"
                    mode={liveChatMode}
                    setMode={(m) => { setLiveChatMode(m); setShowModePrompt(false); }}
                    surface="Widget"
                    descriptions={{
                      off: "Widget is hidden from shoppers.",
                      training: "Visible to your team only for testing — no replies reach shoppers.",
                      production: "Live for all shoppers. Eligible chats are answered automatically.",
                    }}
                  />
                </div>

                {/* Customize */}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="outline" size="sm" className="h-8 text-[12px] gap-1.5"
                    onClick={() => setWidgetOpen(true)}
                  >
                    <Sliders className="w-3.5 h-3.5" /> Customize widget
                  </Button>
                </div>

                {/* Escalation — where chat escalations are emailed */}
                <div className="pt-3 mt-1 border-t border-gray-100">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Escalation</p>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">
                    Escalation Email <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="email"
                    value={chatWidget.escalationEmail}
                    onChange={(e) => setChatWidget({ escalationEmail: e.target.value })}
                    placeholder="team@yourstore.com"
                    className="text-sm max-w-sm"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">When a chat needs a human, the conversation is emailed here.</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      )}

      {/* ── Card 2: Email ── */}
      {(!only || only === "email") && (
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between p-4">
          <button onClick={() => toggle("email")} className="flex items-center gap-3 flex-1 text-left">
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
              <Mail className="w-[18px] h-[18px] text-gray-600" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-gray-800">Email</p>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Answer support emails from your own inbox</p>
              {!emailChannelConnected && (
                <p className={cn("text-[11px] mt-0.5", asyncBackbone === "zendesk" ? "text-amber-600" : "text-gray-400")}>
                  {asyncBackbone === "zendesk"
                    ? "Zendesk is your active written backbone — pick one"
                    : "Written-ticket backbone · use Email or Zendesk, not both"}
                </p>
              )}
            </div>
          </button>
          <div className="flex items-center gap-2 shrink-0">
            {emailChannelConnected ? (
              <StatusControls id="email" />
            ) : (
              <Button size="sm" variant="outline" onClick={() => toggle("email")}>
                {expanded.email ? "Hide setup" : "Set up"}
              </Button>
            )}
            <button onClick={() => toggle("email")} className="p-1 text-gray-400 hover:text-gray-600">
              <ChevronDown className={cn("w-4 h-4 transition-transform", expanded.email ? "" : "-rotate-90")} />
            </button>
          </div>
        </div>

        {expanded.email && (
          <div className="border-t border-gray-100 p-4 space-y-4">
            {/* Connected confirmation + mode toggle + shared written block */}
            {emailChannelConnected && (
              <>
                <div className="flex items-center gap-2 p-2.5 bg-green-50 border border-green-200 rounded-lg">
                  <Check className="w-4 h-4 text-green-600 shrink-0" />
                  <p className="text-xs text-green-800 flex-1">
                    Connected to <strong>{emailChannelAddress || "your mailbox"}</strong> · via IMAP / SMTP
                  </p>
                </div>

                <ChannelModeRow channel="email" mode={emailMode} setMode={setEmailMode} surface="Email" />

                <ChannelReplyOverrideBlock channel="email" surface="Email" includeSignoff />

                <button
                  onClick={() => { setEmailChannelConnected(false); if (asyncBackbone === "email") setAsyncBackbone(null); }}
                  className="text-[11px] text-gray-400 hover:text-gray-600 underline underline-offset-2"
                >
                  Reconfigure mailbox
                </button>
              </>
            )}

            {/* Async-backbone guard — Email & Zendesk are mutually exclusive */}
            {!emailChannelConnected && asyncBackbone === "zendesk" && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 space-y-1.5 flex-1">
                  <p className="font-medium">Zendesk is your active async backbone.</p>
                  <p>Email and Zendesk both handle written tickets. Running both would double-handle the same conversations — pick one async backbone.</p>
                </div>
              </div>
            )}

            {/* Mailbox setup form */}
            {!emailChannelConnected && asyncBackbone !== "zendesk" && (
              <div className="space-y-4">
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Mailbox</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">
                      Email address <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="email"
                      value={emailChannelAddress}
                      onChange={(e) => { setEmailChannelAddress(e.target.value); setMailboxError(""); }}
                      placeholder="support@your-store.com"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">
                      Password / App password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Input
                        type={showMailboxPassword ? "text" : "password"}
                        value={mailboxPassword}
                        onChange={(e) => { setMailboxPassword(e.target.value); setMailboxError(""); }}
                        placeholder="••••••••"
                        className="text-sm pr-9"
                      />
                      <button
                        type="button"
                        onClick={() => setShowMailboxPassword((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showMailboxPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">For Gmail/Outlook, use an app password.</p>
                  </div>
                </div>

                {/* Advanced toggle */}
                <button
                  onClick={() => setMailboxAdvanced((v) => !v)}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  {mailboxAdvanced ? "Hide Advanced" : "Show Advanced"}
                  <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", mailboxAdvanced ? "" : "-rotate-90")} />
                </button>

                {mailboxAdvanced && (
                  <div className="rounded-lg border border-gray-200 p-3 space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-700">Mailbox · IMAP / SMTP</p>
                      <p className="text-[11px] text-gray-400">Manually configure the incoming and outgoing servers.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-1 block">Server type</label>
                        <select
                          value={mailboxServerType}
                          onChange={(e) => setMailboxServerType(e.target.value)}
                          className="w-full h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        >
                          <option value="IMAP">IMAP</option>
                          <option value="POP3">POP3</option>
                          <option value="Exchange">Exchange</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-1 block">Email account</label>
                        <Input value={emailChannelAddress} readOnly placeholder="support@your-store.com" className="text-sm bg-gray-50" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-1 block">Incoming server (host : port)</label>
                        <Input placeholder="imap.gmail.com : 993" className="text-sm" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-1 block">Outgoing server (host : port)</label>
                        <Input placeholder="smtp.gmail.com : 587" className="text-sm" />
                      </div>
                    </div>
                  </div>
                )}

                {mailboxError && <p className="text-xs text-red-600">{mailboxError}</p>}

                <Button size="sm" onClick={handleConnectEmail} disabled={emailConnecting}>
                  {emailConnecting ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Connecting...</> : "Connect mailbox"}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {/* ── Card 3: Zendesk (Advanced) ── */}
      {(!only || only === "zendesk") && (
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between p-4">
          <button onClick={() => toggle("zendesk")} className="flex items-center gap-3 flex-1 text-left">
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
              <Globe className="w-[18px] h-[18px] text-gray-600" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-gray-800">Zendesk</p>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Reply to tickets inside your Zendesk workspace</p>
              {!zendeskConnected && (
                <p className={cn("text-[11px] mt-0.5", asyncBackbone === "email" ? "text-amber-600" : "text-gray-400")}>
                  {asyncBackbone === "email"
                    ? "A direct mailbox is your active written backbone — pick one"
                    : "Written-ticket backbone · use Email or Zendesk, not both"}
                </p>
              )}
            </div>
          </button>
          <div className="flex items-center gap-2 shrink-0">
            {zendeskConnected ? (
              <StatusControls id="zendesk" />
            ) : (
              <Button size="sm" variant="outline" onClick={() => toggle("zendesk")}>
                {expanded.zendesk ? "Hide setup" : "Set up"}
              </Button>
            )}
            <button onClick={() => toggle("zendesk")} className="p-1 text-gray-400 hover:text-gray-600">
              <ChevronDown className={cn("w-4 h-4 transition-transform", expanded.zendesk ? "" : "-rotate-90")} />
            </button>
          </div>
        </div>

        {expanded.zendesk && (
          <div className="border-t border-gray-100 p-4 space-y-4">
            {/* Async-backbone guard — Email & Zendesk are mutually exclusive */}
            {!zendeskConnected && asyncBackbone === "email" ? (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 space-y-2 flex-1">
                  <p className="font-medium">A direct mailbox is your active async backbone.</p>
                  <p>Email and Zendesk both handle written tickets. Switch your written support to Zendesk to avoid double-handling the same conversations.</p>
                  <Button
                    size="sm" variant="outline"
                    className="h-7 text-[11px] border-amber-300 text-amber-700 hover:bg-amber-100"
                    onClick={() => {
                      setEmailChannelConnected(false);
                      setAsyncBackbone(null);
                      if (primaryChannel === "email") setPrimaryChannel(null);
                      toast("Disconnected mailbox — you can now set up Zendesk");
                    }}
                  >
                    Disconnect mailbox &amp; switch to Zendesk
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <TicketingSystemSection />
                {zendeskConnected && (
                  <>
                    <ChannelModeRow channel="zendesk" mode={zendeskMode} setMode={setZendeskMode} surface="Zendesk" />
                    <ChannelReplyOverrideBlock channel="zendesk" surface="Zendesk" includeSignoff />
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
      )}

      {/* Live Chat Widget customizer overlay */}
      {(!only || only === "chat") && (
        <LiveChatWidgetCustomizer open={widgetOpen} onClose={() => setWidgetOpen(false)} />
      )}

    </div>
  );
}

/* ================================================================
   SECTION 2 — Configure Agent
   Flat layout: Identity, Permissions, Channels & Escalation
   Multi-agent secondary nav at top
   First-time: "Hire Rep" button; subsequent: "Save Changes"
   ================================================================ */
export function ConfigureAgentSection() {
  const {
    repHired, setRepHired,
    hiredRepName, setHiredRepName,
    repPersonality, setRepPersonality,
    repCustomTone, setRepCustomTone,
    repPermissions, setRepPermissions,
    handoff,
    discloseAI, setDiscloseAI,
    setMainTab, setManagerTab,
  } = useApp();
  const [expandedPermGroups, setExpandedPermGroups] = useState<Record<string, boolean>>({});

  const readPerms = repPermissions.filter((p) => p.type === "read");
  const writePerms = repPermissions.filter((p) => p.type === "write");

  /* Group permissions by domain */
  const readGroups = useMemo(() => {
    const groups: Record<string, typeof readPerms> = {};
    readPerms.forEach((p) => {
      const key = p.domain || "Other";
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    return groups;
  }, [readPerms]);

  const writeGroups = useMemo(() => {
    const groups: Record<string, typeof writePerms> = {};
    writePerms.forEach((p) => {
      const key = p.domain || "Other";
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    return groups;
  }, [writePerms]);

  const togglePerm = (name: string) => {
    setRepPermissions(
      repPermissions.map((p) => (p.name === name && !p.locked ? { ...p, enabled: !p.enabled } : p))
    );
  };
  const setPermScope = (name: string, scope: "all" | "seel") => {
    setRepPermissions(repPermissions.map((p) => (p.name === name ? { ...p, scope } : p)));
  };

  const isFirstHire = !repHired;

  const handleSave = () => {
    if (!hiredRepName.trim()) {
      toast.error("Please enter a name for your AI Rep");
      return;
    }
    if (!repPersonality) {
      toast.error("Please select a personality for your AI Rep");
      return;
    }
    if (isFirstHire) {
      setRepHired(true);
      toast.success(`${hiredRepName} has been hired!`);
      setMainTab("agents");
      setManagerTab("operations");
    } else {
      toast.success("Agent configuration saved");
    }
  };

  /* ── Permission row ── */
  function PermRow({ perm }: { perm: typeof readPerms[0] }) {
    return (
      <div className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-800">{perm.label}</span>
          {perm.locked && <Badge variant="outline" className="text-[9px] h-4 px-1 text-gray-400 border-gray-300">Always on</Badge>}
          <Tooltip text={perm.description + (perm.guardrail ? ` (Guardrail: ${perm.guardrail})` : "")}>
            <HelpCircle className="w-3.5 h-3.5 text-gray-300 hover:text-gray-500 cursor-help" />
          </Tooltip>
          {/* Order-lookup scope: all orders vs Seel-protected only */}
          {perm.scope && perm.enabled && (
            <div className="inline-flex items-center rounded-md border border-gray-200 overflow-hidden ml-1">
              {([["seel", "Seel-protected"], ["all", "All orders"]] as const).map(([val, label], i) => (
                <button
                  key={val}
                  onClick={() => setPermScope(perm.name, val)}
                  className={cn(
                    "px-2 py-0.5 text-[11px] font-medium transition-colors",
                    i > 0 && "border-l border-gray-200",
                    perm.scope === val ? "bg-indigo-50 text-indigo-700" : "text-gray-500 hover:bg-gray-50"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        <Switch checked={perm.enabled} onCheckedChange={() => togglePerm(perm.name)} disabled={perm.locked} />
      </div>
    );
  }

  /* ── Permission group ── */
  function PermGroup({ domain, perms }: { domain: string; perms: typeof readPerms }) {
    const enabledCount = perms.filter(p => p.enabled).length;
    const isExpanded = expandedPermGroups[domain] ?? true;
    return (
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <button
          onClick={() => setExpandedPermGroups(prev => ({ ...prev, [domain]: !isExpanded }))}
          className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <span className="text-xs font-semibold text-gray-700">{domain}</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400">{enabledCount} of {perms.length} enabled</span>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isExpanded ? "" : "-rotate-90"}`} />
          </div>
        </button>
        {isExpanded && (
          <div className="border-t border-gray-100">
            {perms.map((perm) => <PermRow key={perm.name} perm={perm} />)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Identity ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-800">Identity</h3>
        </div>

        <div className="ml-6 space-y-4">
          {/* Rep Name */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Rep Name</label>
            <Input
              value={hiredRepName}
              onChange={(e) => setHiredRepName(e.target.value)}
              placeholder="e.g., Ava"
              className="max-w-xs text-sm"
              maxLength={20}
            />
          </div>

          {/* Personality — pill selector + preview */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-2 block">Personality</label>
            <div className="flex items-center gap-1.5 mb-3">
              {(["Friendly", "Professional", "Casual", "Customize"] as const).map((p) => {
                const isSelected = repPersonality === p;
                return (
                  <button
                    key={p}
                    onClick={() => setRepPersonality(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isSelected
                        ? "bg-indigo-100 text-indigo-700 border border-indigo-300"
                        : "bg-gray-50 text-gray-600 border border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
            {/* Preview for selected personality */}
            {repPersonality && repPersonality !== "Customize" && PERSONALITY_EXAMPLES[repPersonality] && (
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                <p className="text-xs text-gray-500 mb-2">{PERSONALITY_EXAMPLES[repPersonality].description}</p>
                <div className="p-2.5 bg-white rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-400 mb-1 font-medium">Example response:</p>
                  <p className="text-sm text-gray-700 italic leading-relaxed">"{PERSONALITY_EXAMPLES[repPersonality].sample}"</p>
                </div>
              </div>
            )}
            {repPersonality === "Customize" && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500">{PERSONALITY_EXAMPLES.Customize.description}</p>
                <textarea
                  value={repCustomTone}
                  onChange={(e) => setRepCustomTone(e.target.value)}
                  placeholder="Describe the tone and style you want..."
                  className="w-full text-sm p-2 border border-gray-200 rounded-lg resize-none h-20 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
            )}
          </div>

          {/* Disclose AI */}
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
            <div>
              <p className="text-sm font-medium text-gray-800">Disclose AI Identity</p>
              <p className="text-xs text-gray-500 mt-0.5">Let customers know they're interacting with an AI assistant.</p>
            </div>
            <Switch checked={discloseAI} onCheckedChange={setDiscloseAI} />
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100" />

      {/* ── Action Permissions ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-800">Action Permissions</h3>
        </div>

        <div className="ml-6 space-y-4">
          {/* READ ACTIONS — always expanded */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">Read Actions</p>
              <span className="text-[10px] text-gray-400">{readPerms.filter(p => p.enabled).length} of {readPerms.length} enabled</span>
            </div>
            <div className="space-y-2">
              {Object.entries(readGroups).map(([domain, perms]) => (
                <PermGroup key={domain} domain={domain} perms={perms} />
              ))}
            </div>
          </div>

          {/* WRITE ACTIONS */}
          <div>
            <p className="text-xs font-medium text-gray-600 mb-2 uppercase tracking-wider">Read & Write Actions</p>
            <div className="space-y-2">
              {Object.entries(writeGroups).map(([domain, perms]) => (
                <PermGroup key={domain} domain={domain} perms={perms} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer — first hire commits the rep (gates onboarding); afterwards edits auto-save */}
      <div className="flex items-center justify-end pt-4 border-t border-gray-200">
        {isFirstHire ? (
          <Button onClick={handleSave} size="sm">
            Hire {hiredRepName || "Rep"}
          </Button>
        ) : (
          <span className="flex items-center gap-1.5 text-[12px] text-gray-400">
            <Check className="w-3.5 h-3.5 text-emerald-500" />
            Changes save automatically
          </span>
        )}
      </div>
    </div>
  );
}
