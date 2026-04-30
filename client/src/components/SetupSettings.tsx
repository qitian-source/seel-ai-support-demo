/*
 * SetupSettings — Settings-only component (no wizard mode)
 * Round 7: Pure settings view with two sections: Ticketing System + Configure Agent
 *          Supports settingsSection deep-link for "ticketing" or "agent"
 *          First-time config shows "Hire Rep" instead of "Save Changes"
 *          Zendesk sub-steps: progressive disclosure (hide later steps if earlier not done)
 */
import { useState, useMemo, useEffect, useRef } from "react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Check, AlertTriangle, Loader2, RefreshCw,
  Globe, Bot, Shield, ExternalLink, Mail,
  MessageSquare, Smartphone, Tag, Users, UserCheck,
  Info, ChevronDown, HelpCircle, Eye, EyeOff, Plus,
} from "lucide-react";

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
  const { zendesk, setZendesk, zendeskConnected } = useApp();
  const [demoBranch, setDemoBranch] = useState<"success" | "error">("success");

  const handleAuthorize = () => {
    if (!zendesk.subdomain.trim()) {
      setZendesk({ authError: "Please enter your Zendesk subdomain" });
      return;
    }
    setZendesk({ authStatus: "loading", authError: "" });
    setTimeout(() => {
      if (demoBranch === "success") {
        setZendesk({
          authStatus: "success", authError: "",
          availableSeats: [
            { id: "seat-1", name: "Seel AI Agent", email: "seel-ai@" + zendesk.subdomain + ".zendesk.com" },
            { id: "seat-2", name: "Support Bot", email: "bot@" + zendesk.subdomain + ".zendesk.com" },
            { id: "seat-3", name: "CS Automation", email: "cs-auto@" + zendesk.subdomain + ".zendesk.com" },
          ],
        });
        toast.success("Zendesk API authorized successfully");
      } else {
        setZendesk({
          authStatus: "error",
          authError: "Unable to connect. Please check your subdomain and ensure API access is enabled in Zendesk Admin → Apps and integrations → APIs.",
        });
      }
    }, 1500);
  };

  const handleBindSeat = () => {
    if (!zendesk.selectedSeat) {
      setZendesk({ seatError: "Please select an agent seat" });
      return;
    }
    setZendesk({ seatStatus: "loading", seatError: "" });
    setTimeout(() => {
      if (demoBranch === "success") {
        setZendesk({ seatStatus: "verified", seatError: "" });
        toast.success("Agent seat bound successfully");
      } else {
        setZendesk({ seatStatus: "error", seatError: "This seat does not have the required permissions." });
      }
    }, 1200);
  };

  const handleVerifyConnection = () => {
    setZendesk({ triggerStatus: "loading", triggerError: "" });
    setTimeout(() => {
      if (demoBranch === "success") {
        setZendesk({ triggerStatus: "verified", triggerError: "" });
        toast.success("Connection verified");
      } else {
        setZendesk({
          triggerStatus: "error",
          triggerError: "No ticket received yet. Please assign a test ticket to the AI Agent seat in Zendesk and try again.",
        });
      }
    }, 1200);
  };

  const handleRefreshSeats = () => {
    setZendesk({ seatStatus: "loading" });
    setTimeout(() => {
      setZendesk({
        seatStatus: "idle",
        availableSeats: [
          { id: "seat-1", name: "Seel AI Agent", email: "seel-ai@" + zendesk.subdomain + ".zendesk.com" },
          { id: "seat-2", name: "Support Bot", email: "bot@" + zendesk.subdomain + ".zendesk.com" },
          { id: "seat-3", name: "CS Automation", email: "cs-auto@" + zendesk.subdomain + ".zendesk.com" },
          { id: "seat-4", name: "New Agent", email: "new@" + zendesk.subdomain + ".zendesk.com" },
        ],
      });
      toast.success("Seat list refreshed");
    }, 1000);
  };

  const showStep2 = zendesk.authStatus === "success";
  const showStep3 = zendesk.seatStatus === "verified";

  function SubStepStatus({ done }: { done: boolean }) {
    return done ? (
      <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
        <Check className="w-3 h-3 text-green-600" />
      </div>
    ) : null;
  }

  return (
    <div className="space-y-5">
      {/* Integration note */}
      <div className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-lg">
        <Info className="w-4 h-4 text-gray-400 shrink-0" />
        <p className="text-xs text-gray-600 flex-1">
          Currently supports <strong>Zendesk</strong> integration. More ticketing systems coming soon.
        </p>
      </div>

      {/* Setup guide link */}
      <div className="flex items-center gap-2 p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
        <Info className="w-4 h-4 text-blue-500 shrink-0" />
        <p className="text-xs text-blue-700 flex-1">
          Need help? Follow our step-by-step guide to connect Zendesk.
        </p>
        <a href="#" className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1 shrink-0">
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
        {/* Sub-step 1: Authorize API */}
        <div className={`rounded-lg border p-4 space-y-3 ${zendesk.authStatus === "success" ? "border-green-200 bg-green-50/30" : "border-gray-200"}`}>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">1</span>
            <h3 className="text-sm font-semibold text-gray-800">Authorize Zendesk API</h3>
            <SubStepStatus done={zendesk.authStatus === "success"} />
          </div>
          <p className="text-xs text-gray-500 ml-7">
            Enter your Zendesk subdomain to authorize API access. <code className="text-[11px] bg-gray-100 px-1 py-0.5 rounded">https://<strong>your-subdomain</strong>.zendesk.com</code>
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

        {/* Sub-step 2: Bind Agent Seat — only show if step 1 done */}
        {showStep2 && (
          <div className={`rounded-lg border p-4 space-y-3 ${zendesk.seatStatus === "verified" ? "border-green-200 bg-green-50/30" : "border-gray-200"}`}>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">2</span>
              <h3 className="text-sm font-semibold text-gray-800">Bind Agent Seat</h3>
              <SubStepStatus done={zendesk.seatStatus === "verified"} />
            </div>
            <p className="text-xs text-gray-500 ml-7">Select which Zendesk agent seat the AI Rep will use.</p>
            <div className="ml-7 space-y-2">
              <div className="flex items-center gap-2 max-w-sm">
                <select
                  value={zendesk.selectedSeat}
                  onChange={(e) => setZendesk({ selectedSeat: e.target.value, seatError: "" })}
                  className="flex-1 h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                  disabled={zendesk.seatStatus === "verified"}
                >
                  <option value="">Select an agent seat...</option>
                  {zendesk.availableSeats.map((seat) => (
                    <option key={seat.id} value={seat.id}>{seat.name} ({seat.email})</option>
                  ))}
                </select>
                <button onClick={handleRefreshSeats} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors" title="Refresh seats">
                  <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${zendesk.seatStatus === "loading" ? "animate-spin" : ""}`} />
                </button>
              </div>
              {zendesk.seatError && <p className="text-xs text-red-600">{zendesk.seatError}</p>}
              {zendesk.seatStatus !== "verified" && (
                <Button size="sm" onClick={handleBindSeat} disabled={zendesk.seatStatus === "loading" || !zendesk.selectedSeat}>
                  {zendesk.seatStatus === "loading" ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Binding...</> : "Bind Seat"}
                </Button>
              )}
              {zendesk.seatStatus === "verified" && (
                <p className="text-xs text-green-700">Seat bound: <strong>{zendesk.availableSeats.find(s => s.id === zendesk.selectedSeat)?.name}</strong></p>
              )}
            </div>
          </div>
        )}

        {/* Sub-step 3: Verify Connection — only show if step 2 done */}
        {showStep3 && (
          <div className={`rounded-lg border p-4 space-y-3 ${zendesk.triggerStatus === "verified" ? "border-green-200 bg-green-50/30" : "border-gray-200"}`}>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">3</span>
              <h3 className="text-sm font-semibold text-gray-800">Verify Connection</h3>
              <SubStepStatus done={zendesk.triggerStatus === "verified"} />
            </div>
            <p className="text-xs text-gray-500 ml-7">
              Assign a test ticket to <strong>{zendesk.availableSeats.find(s => s.id === zendesk.selectedSeat)?.name || "the AI Agent"}</strong> in your Zendesk dashboard, then click Verify below.
            </p>
            <div className="ml-7 space-y-2">
              <div className="flex items-center gap-2">
                <a href="#" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  Open Zendesk Dashboard <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              {zendesk.triggerError && <p className="text-xs text-red-600">{zendesk.triggerError}</p>}
              {zendesk.triggerStatus !== "verified" && (
                <Button size="sm" onClick={handleVerifyConnection} disabled={zendesk.triggerStatus === "loading"}>
                  {zendesk.triggerStatus === "loading" ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Verifying...</> : "Verify"}
                </Button>
              )}
              {zendesk.triggerStatus === "verified" && (
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
          <p className="text-sm text-green-800 font-medium">Ticketing system connected and verified.</p>
        </div>
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
function ConfigureAgentSection() {
  const {
    repHired, setRepHired,
    hiredRepName, setHiredRepName,
    repPersonality, setRepPersonality,
    repCustomTone, setRepCustomTone,
    repPermissions, setRepPermissions,
    channels, setChannels,
    handoff, setHandoff,
    discloseAI, setDiscloseAI,
    emailSignoff, setEmailSignoff,
    agentsData,
    setMainTab,
    setShowSettings,
  } = useApp();

  const [showReadActions, setShowReadActions] = useState(false);
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

  const nonLeadAgents = agentsData.filter(a => !a.isTeamLead);
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
      setShowSettings(false);
      setMainTab("agents");
    } else {
      toast.success("Agent configuration saved");
    }
  };

  /* ── Permission row ── */
  function PermRow({ perm }: { perm: typeof readPerms[0] }) {
    return (
      <div className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-800">{perm.label}</span>
          {perm.locked && <Badge variant="outline" className="text-[9px] h-4 px-1 text-gray-400 border-gray-300">Always on</Badge>}
          <Tooltip text={perm.description + (perm.guardrail ? ` (Guardrail: ${perm.guardrail})` : "")}>
            <HelpCircle className="w-3.5 h-3.5 text-gray-300 hover:text-gray-500 cursor-help" />
          </Tooltip>
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
      {/* ── Multi-agent secondary nav ── */}
      <div className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-lg">
        {nonLeadAgents.map((agent) => (
          <button
            key={agent.id}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm font-medium"
          >
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold" style={{ background: agent.color }}>
              {hiredRepName ? hiredRepName.slice(0, 2).toUpperCase() : agent.initials}
            </div>
            {hiredRepName || agent.name}
          </button>
        ))}

      </div>

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
          {/* READ ACTIONS */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">Read Actions</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400">{readPerms.filter(p => p.enabled).length} of {readPerms.length} enabled</span>
                <button
                  onClick={() => setShowReadActions(!showReadActions)}
                  className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showReadActions ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {showReadActions ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            {!showReadActions && (
              <p className="text-xs text-gray-400 italic">All read actions are enabled by default. Click "Show" to view and adjust.</p>
            )}
            {showReadActions && (
              <div className="space-y-2">
                {Object.entries(readGroups).map(([domain, perms]) => (
                  <PermGroup key={domain} domain={domain} perms={perms} />
                ))}
              </div>
            )}
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

      <div className="border-t border-gray-100" />

      {/* ── Channels & Escalation ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-800">Channels & Escalation</h3>
        </div>

        <div className="ml-6 space-y-4">
          {/* Email Channel */}
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between p-3 bg-gray-50">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-600" />
                <div>
                  <p className="text-sm font-medium text-gray-800">Email</p>
                  <p className="text-xs text-gray-500">Handle email tickets</p>
                </div>
              </div>
              <Switch checked={channels.email} onCheckedChange={(v) => setChannels({ email: v })} />
            </div>

            {channels.email && (
              <div className="p-4 border-t border-gray-200 space-y-4">
                {/* Email Sign-off */}
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Sending Sign-off</label>
                  <p className="text-xs text-gray-400 mb-2">The closing signature appended to every email reply.</p>
                  <textarea
                    value={emailSignoff}
                    onChange={(e) => setEmailSignoff(e.target.value)}
                    className="w-full max-w-md text-sm p-2 border border-gray-200 rounded-lg resize-none h-16 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Best regards,\nThe Support Team"
                  />
                </div>

                <div className="border-t border-gray-100" />

                {/* Escalation Handoff for Email — all flat, no tabs */}
                <div>
                  <p className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-3">Escalation Handoff</p>
                  <p className="text-xs text-gray-400 mb-4">Configure how escalated email tickets are handled.</p>

                  {/* Assign to Group */}
                  <div className="space-y-2 mb-5">
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-gray-500" />
                      <h4 className="text-xs font-semibold text-gray-700">Assign to Group</h4>
                    </div>
                    <select
                      value={handoff.selectedGroup}
                      onChange={(e) => setHandoff({ selectedGroup: e.target.value })}
                      className="w-full max-w-sm h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    >
                      <option value="">Select a group...</option>
                      {handoff.availableGroups.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>

                  {/* Assign to Person */}
                  <div className="space-y-2 mb-5">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-3.5 h-3.5 text-gray-500" />
                      <h4 className="text-xs font-semibold text-gray-700">Assign to Person</h4>
                    </div>
                    <select
                      value={handoff.selectedHandoffSeat}
                      onChange={(e) => setHandoff({ selectedHandoffSeat: e.target.value })}
                      className="w-full max-w-sm h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    >
                      <option value="">Select a person...</option>
                      {handoff.availableHandoffSeats.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                      ))}
                    </select>
                  </div>

                  {/* Add Tag */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5 text-gray-500" />
                      <h4 className="text-xs font-semibold text-gray-700">Add Tag</h4>
                    </div>
                    <Input
                      value={handoff.handoffTag}
                      onChange={(e) => setHandoff({ handoffTag: e.target.value })}
                      placeholder="e.g., escalated, needs-review"
                      className="max-w-sm text-sm"
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <Switch checked={handoff.autoSetPriority} onCheckedChange={(v) => setHandoff({ autoSetPriority: v })} />
                      <span className="text-xs text-gray-600">Auto-set priority on escalation</span>
                    </div>
                    {handoff.autoSetPriority && (
                      <div className="flex gap-2 mt-2">
                        {(["normal", "high", "urgent"] as const).map((p) => (
                          <button
                            key={p}
                            onClick={() => setHandoff({ priority: p })}
                            className={`px-3 py-1 rounded-lg border text-xs font-medium transition-colors capitalize ${
                              handoff.priority === p
                                ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                                : "border-gray-200 text-gray-600 hover:border-gray-300"
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Live Chat — coming soon */}
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 opacity-60">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-500">Live Chat</p>
                <p className="text-xs text-gray-400">Handle live chat conversations</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs text-gray-400 border-gray-300">Coming soon</Badge>
          </div>

          {/* SMS — coming soon */}
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 opacity-60">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-500">SMS</p>
                <p className="text-xs text-gray-400">Handle SMS messages</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs text-gray-400 border-gray-300">Coming soon</Badge>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end pt-4 border-t border-gray-200">
        <Button onClick={handleSave} size="sm">
          {isFirstHire ? `Hire ${hiredRepName || "Rep"}` : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

/* ================================================================
   MAIN EXPORT — SetupSettings (two-tab layout)
   Tab 1: Ticketing System | Tab 2: Agent Config
   ================================================================ */
type SettingsTab = "ticketing" | "agent";

export default function SetupSettings() {
  const { settingsSection, zendeskConnected } = useApp();
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    settingsSection === "agent" ? "agent" : "ticketing"
  );

  useEffect(() => {
    if (settingsSection === "agent") setActiveTab("agent");
    else if (settingsSection === "ticketing") setActiveTab("ticketing");
  }, [settingsSection]);

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab("ticketing")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 ${
            activeTab === "ticketing"
              ? "border-[#6c47ff] text-[#6c47ff]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Globe className="w-4 h-4" />
          Ticketing System
          {zendeskConnected && (
            <span className="w-2 h-2 rounded-full bg-green-500" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("agent")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 ${
            activeTab === "agent"
              ? "border-[#6c47ff] text-[#6c47ff]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Bot className="w-4 h-4" />
          Agent Config
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "ticketing" ? <TicketingSystemSection /> : <ConfigureAgentSection />}
      </div>
    </div>
  );
}
