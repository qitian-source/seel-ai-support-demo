import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef, type ReactNode } from "react";
import { toast } from "sonner";
import {
  agents as defaultAgents,
  rules as defaultRules,
  topics as defaultTopics,
  documents as defaultDocs,
  defaultReadActions,
  defaultWriteActions,
  DEFAULT_FLAG_RULES,
  type Agent,
  type Rule,
  type Topic,
  type Document,
  type ActionPermission,
  type FlagRule,
} from "@/lib/data";

/* ── Navigation ── */
type MainTab = "agents" | "playbook" | "performance" | "email" | "live-widget" | "zendesk" | "settings" | "sales-agent" | "billing" | "voc-agent";

/** Single, unified operating mode shared by every channel (chat / email / zendesk)
 *  and by the derived agent state. off = paused, training = draft-only, production = autonomous. */
export type ChannelMode = "off" | "training" | "production";

/* ── Channels ── */
type PrimaryChannel = "chat" | "email" | "zendesk" | null;
type AsyncBackbone = "email" | "zendesk" | null;

/* ── Zendesk sub-step state machine ── */
type ZdAuthStatus = "idle" | "loading" | "success" | "error";
type ZdStepStatus = "idle" | "loading" | "verified" | "error";

interface ZendeskState {
  subdomain: string;
  authStatus: ZdAuthStatus;
  authError: string;
  seatStatus: ZdStepStatus;
  seatError: string;
  selectedSeat: string;
  availableSeats: { id: string; name: string; email: string }[];
  webhookStatus: ZdStepStatus;
  webhookError: string;
  triggerStatus: ZdStepStatus;
  triggerError: string;
  verifyStatus: ZdStepStatus;
  verifyError: string;
}

/* ── Live Chat Widget customizer config (channel surface layer) ── */
interface ChatWidgetConfig {
  /* colors */
  brandColor: string;
  textOnBrand: string;
  botBubble: string;
  botText: string;
  userBubble: string;
  userText: string;
  windowBackground: string;
  /* layout */
  position: "bottom-left" | "bottom-right";
  distanceBottom: number;
  distanceRight: number;
  cornerRadius: number;
  launcherColor: string;
  /* typography */
  fontFamily: string;
  /* messages */
  welcomeMessage: string;
  suggestedQuestions: string[];
  inputPlaceholder: string;
  /* behavior */
  proactiveEnabled: boolean;
  proactiveDelay: number;
  talkToHuman: boolean;
  offlineMessage: string;
  escalationEmail: string; // where chat escalations are sent
  poweredBy: boolean;
  preChatForm: boolean;
  csatEnabled: boolean;
  /* page targeting */
  targetAllPages: boolean;
  targetPages: string[];
  customPages: string[];
  deviceTarget: "all" | "desktop" | "mobile";
}

/* ── Reply & escalation: direct per-channel settings (no agent inheritance) ── */
export type ChannelKey = "email" | "zendesk" | "chat";
interface ChannelReplyConfig {
  signoff: string;        // closing signature (email / zendesk)
  escalationSeat: string; // human-handoff teammate (seat id)
}

/* ── AI Rep (brain layer): each rep has its own persona + permissions ── */
export interface AiRep {
  id: string;
  name: string;
  color: string;
  personality: "Friendly" | "Professional" | "Casual" | "Customize" | "";
  customTone: string;
  permissions: ActionPermission[];
  discloseAI: boolean;
}

/* ── Handoff config (reference data: available groups/seats) ── */
interface HandoffConfig {
  selectedGroup: string;
  availableGroups: string[];
  selectedHandoffSeat: string;
  availableHandoffSeats: { id: string; name: string; email: string }[];
  handoffTag: string;
  autoSetPriority: boolean;
  priority: "normal" | "high" | "urgent";
}

/* ── Setup Progress step status ── */
type SetupStepStatus = "pending" | "complete" | "locked";

/* ── Context shape ── */
interface AppState {
  mainTab: MainTab;
  setMainTab: (tab: MainTab) => void;

  /* Setup Progress — 4 steps */
  setupFullyComplete: boolean;
  step1Complete: boolean; // At least one channel connected
  step2Complete: boolean; // At least one doc processed with rules
  step3Complete: boolean; // Rep hired (name + personality set)
  step4Complete: boolean; // At least one connected channel is in training/production
  step4Status: SetupStepStatus; // locked if 1-3 not all done

  /* Zendesk state machine */
  zendesk: ZendeskState;
  setZendesk: (updates: Partial<ZendeskState>) => void;
  zendeskConnected: boolean;

  /* Live Chat Widget customizer */
  chatWidget: ChatWidgetConfig;
  setChatWidget: (updates: Partial<ChatWidgetConfig>) => void;

  /* Channel connection layer (Settings > Channels) */
  liveChatConnected: boolean;
  setLiveChatConnected: (v: boolean) => void;
  liveChatMode: ChannelMode;
  setLiveChatMode: (m: ChannelMode) => void;
  liveChatRollout: number; // Production gradual-rollout % (share of eligible visitors)
  setLiveChatRollout: (n: number) => void;
  emailChannelConnected: boolean;
  setEmailChannelConnected: (v: boolean) => void;
  emailChannelAddress: string;
  setEmailChannelAddress: (s: string) => void;
  zendeskMode: ChannelMode;
  setZendeskMode: (m: ChannelMode) => void;
  asyncBackbone: AsyncBackbone;
  setAsyncBackbone: (b: AsyncBackbone) => void;
  primaryChannel: PrimaryChannel;
  setPrimaryChannel: (c: PrimaryChannel) => void;
  anyChannelConnected: boolean;

  /* Handoff config (per-channel, MVP: email channel) */
  handoff: HandoffConfig;
  setHandoff: (updates: Partial<HandoffConfig>) => void;

  /* SOP */
  sopUploaded: boolean;
  setSopUploaded: (v: boolean) => void;
  extractedRuleNames: string[];
  setExtractedRuleNames: (names: string[]) => void;

  /* Rep config */
  repHired: boolean;
  setRepHired: (v: boolean) => void;
  hiredRepName: string;
  setHiredRepName: (name: string) => void;
  repPersonality: "Friendly" | "Professional" | "Casual" | "Customize" | "";
  setRepPersonality: (p: "Friendly" | "Professional" | "Casual" | "Customize" | "") => void;
  repCustomTone: string;
  setRepCustomTone: (t: string) => void;
  repPermissions: ActionPermission[];
  setRepPermissions: (perms: ActionPermission[]) => void;

  /* Multi-rep registry — the rep-config fields above edit the SELECTED rep */
  reps: AiRep[];
  selectedRepId: string;
  setSelectedRepId: (id: string) => void;
  addRep: () => void;
  removeRep: (id: string) => void;

  /* Go-live state — DERIVED from per-channel modes (no global source of truth) */
  agentMode: ChannelMode;            // production if any connected channel is production; else training if any is training; else off
  setAllChannelModes: (m: ChannelMode) => void; // bulk action: set every connected channel to this mode
  anyChannelLive: boolean;          // ≥1 connected channel in training or production
  isAgentLive: boolean;             // ≥1 connected channel in production

  /* Disclose AI identity (per-rep) */
  discloseAI: boolean;
  setDiscloseAI: (v: boolean) => void;

  /* ── Written-reply & escalation: direct per-channel settings ── */
  channelReply: Record<ChannelKey, ChannelReplyConfig>;
  setChannelReply: (key: ChannelKey, updates: Partial<ChannelReplyConfig>) => void;

  /* ── Channel → rep assignment (a channel can run multiple reps) ── */
  channelReps: Record<ChannelKey, string[]>;
  setChannelReps: (key: ChannelKey, repIds: string[]) => void;

  /* Per-page settings sub-tabs (post-restructure navigation) */
  managerTab: "operations" | "settings";       // AI Manager page sub-tab
  setManagerTab: (t: "operations" | "settings") => void;
  channelSettingsIntent: ChannelKey | null;     // one-shot: open this channel page on its Settings sub-tab
  setChannelSettingsIntent: (c: ChannelKey | null) => void;
  channelConversationsIntent: ChannelKey | null; // one-shot: open this channel page on its Conversations/Inbox sub-tab
  setChannelConversationsIntent: (c: ChannelKey | null) => void;
  agentSettingsIntent: boolean;                  // one-shot: open the global Settings tab on the AI Manager (agent) view
  setAgentSettingsIntent: (v: boolean) => void;
  goToChannelSettings: (c: ChannelKey) => void;  // navigate to a channel page's Settings sub-tab
  goToManagerSettings: () => void;               // navigate to the global Settings tab → AI Manager (agent config)

  /* Email mode & flag rules (configured in Settings > Channels) */
  emailMode: ChannelMode;
  setEmailMode: (m: ChannelMode) => void;
  emailFlagRules: FlagRule[];
  setEmailFlagRules: (r: FlagRule[]) => void;

  /* Email sync modal trigger */
  openEmailSyncModal: boolean;
  setOpenEmailSyncModal: (v: boolean) => void;

  /* Agent selection */
  selectedAgentId: string;
  setSelectedAgentId: (id: string) => void;

  /* Playbook deep-link */
  playbookDeepLink: string | null;
  setPlaybookDeepLink: (tab: string | null) => void;

  /* Onboarding guide state — for Step 4 spotlight */
  showGoLiveGuide: boolean;
  setShowGoLiveGuide: (v: boolean) => void;
  goLiveGuideShown: boolean; // has been shown once
  setGoLiveGuideShown: (v: boolean) => void;

  /* Data collections */
  agentsData: Agent[];
  updateAgent: (id: string, updates: Partial<Agent>) => void;
  rulesData: Rule[];
  updateRule: (id: string, updates: Partial<Rule>) => void;
  toggleRule: (id: string) => void;
  addRule: (rule: Rule) => void;
  removeRule: (id: string) => void;
  topicsData: Topic[];
  updateTopic: (id: string, updates: Partial<Topic>) => void;
  addTopic: (topic: Topic) => void;
  docsData: Document[];
  addDocument: (doc: Document) => void;
  removeDocument: (id: string) => void;
  toggleDocInUse: (id: string) => void;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  resetDocuments: () => void;
  completeSetupDemo: () => void;
}

const AppContext = createContext<AppState | null>(null);

/* ── Defaults ── */
const defaultZendesk: ZendeskState = {
  subdomain: "",
  authStatus: "idle",
  authError: "",
  seatStatus: "idle",
  seatError: "",
  selectedSeat: "",
  availableSeats: [],
  webhookStatus: "idle",
  webhookError: "",
  triggerStatus: "idle",
  triggerError: "",
  verifyStatus: "idle",
  verifyError: "",
};

const defaultChatWidget: ChatWidgetConfig = {
  brandColor: "#111827",
  textOnBrand: "#FFFFFF",
  botBubble: "#F3F4F6",
  botText: "#111827",
  userBubble: "#111827",
  userText: "#FFFFFF",
  windowBackground: "#FFFFFF",
  position: "bottom-right",
  distanceBottom: 20,
  distanceRight: 20,
  cornerRadius: 16,
  launcherColor: "#111827",
  fontFamily: "Inter",
  welcomeMessage: "Hi! How can I help you today?",
  suggestedQuestions: ["Where is my order?", "How do I return an item?", "How do I cancel an order?"],
  inputPlaceholder: "Type a message...",
  proactiveEnabled: false,
  proactiveDelay: 5,
  talkToHuman: true,
  offlineMessage: "We're away right now — leave a message and we'll get back to you.",
  escalationEmail: "mstar@seel.com",
  poweredBy: true,
  preChatForm: false,
  csatEnabled: false,
  targetAllPages: false,
  targetPages: ["home", "pdp", "cart"],
  customPages: [],
  deviceTarget: "all",
};

const defaultHandoff: HandoffConfig = {
  selectedGroup: "",
  availableGroups: ["Tier 2 Support", "Escalations", "VIP Team", "Billing", "Returns"],
  selectedHandoffSeat: "",
  availableHandoffSeats: [
    { id: "hs-1", name: "Sarah Chen", email: "sarah@company.com" },
    { id: "hs-2", name: "Mike Johnson", email: "mike@company.com" },
    { id: "hs-3", name: "Emily Davis", email: "emily@company.com" },
    { id: "hs-4", name: "James Wilson", email: "james@company.com" },
  ],
  handoffTag: "",
  autoSetPriority: false,
  priority: "normal",
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [mainTab, setMainTab] = useState<MainTab>("agents");

  /* Zendesk */
  const [zendesk, setZendeskRaw] = useState<ZendeskState>(defaultZendesk);
  const setZendesk = useCallback((updates: Partial<ZendeskState>) => {
    setZendeskRaw((prev) => ({ ...prev, ...updates }));
  }, []);
  const zendeskConnected =
    zendesk.authStatus === "success" &&
    zendesk.seatStatus === "verified" &&
    zendesk.webhookStatus === "verified" &&
    zendesk.triggerStatus === "verified" &&
    zendesk.verifyStatus === "verified";

  /* Live Chat Widget customizer */
  const [chatWidget, setChatWidgetRaw] = useState<ChatWidgetConfig>(defaultChatWidget);
  const setChatWidget = useCallback((updates: Partial<ChatWidgetConfig>) => {
    setChatWidgetRaw((prev) => ({ ...prev, ...updates }));
  }, []);

  /* Channel connection layer */
  const [liveChatConnected, setLiveChatConnected] = useState(false);
  const [liveChatMode, setLiveChatMode] = useState<ChannelMode>("off");
  const [liveChatRollout, setLiveChatRollout] = useState<number>(20);
  const [emailChannelConnected, setEmailChannelConnected] = useState(false);
  const [emailChannelAddress, setEmailChannelAddress] = useState("");
  const [zendeskMode, setZendeskMode] = useState<ChannelMode>("off");
  const [asyncBackbone, setAsyncBackbone] = useState<AsyncBackbone>(null);
  const [primaryChannel, setPrimaryChannel] = useState<PrimaryChannel>(null);

  /* Handoff */
  const [handoff, setHandoffRaw] = useState<HandoffConfig>(defaultHandoff);
  const setHandoff = useCallback((updates: Partial<HandoffConfig>) => {
    setHandoffRaw((prev) => ({ ...prev, ...updates }));
  }, []);

  /* SOP */
  const [sopUploaded, setSopUploaded] = useState(false);
  const [extractedRuleNames, setExtractedRuleNames] = useState<string[]>([]);

  /* ── Multi-rep registry (brain layer) — config fields below edit the selected rep ── */
  const [repHired, setRepHired] = useState(false);

  /* Channel → rep assignment (declared before reps so removeRep can unassign) */
  const [channelReps, setChannelRepsRaw] = useState<Record<ChannelKey, string[]>>({
    email: ["rep-ava"], zendesk: ["rep-ava"], chat: ["rep-ava"],
  });
  const setChannelReps = useCallback((key: ChannelKey, repIds: string[]) => {
    setChannelRepsRaw((prev) => ({ ...prev, [key]: repIds }));
  }, []);

  const REP_COLORS = ["#6c47ff", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];
  const [reps, setReps] = useState<AiRep[]>([
    {
      id: "rep-ava", name: "Ava", color: "#6c47ff",
      personality: "Friendly", customTone: "",
      permissions: [...defaultReadActions, ...defaultWriteActions],
      discloseAI: true,
    },
  ]);
  const [selectedRepId, setSelectedRepId] = useState("rep-ava");
  const selectedRep = reps.find((r) => r.id === selectedRepId) ?? reps[0];

  const updateRep = useCallback((id: string, updates: Partial<AiRep>) => {
    setReps((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  }, []);

  const addRep = useCallback(() => {
    const id = `rep-${Date.now()}`;
    setReps((prev) => {
      const color = REP_COLORS[prev.length % REP_COLORS.length];
      const next: AiRep = {
        id, name: `Rep ${prev.length + 1}`, color,
        personality: "Friendly", customTone: "",
        permissions: [...defaultReadActions, ...defaultWriteActions],
        discloseAI: true,
      };
      return [...prev, next];
    });
    setSelectedRepId(id);
  }, []);

  const removeRep = useCallback((id: string) => {
    setReps((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)));
    setSelectedRepId((sel) => {
      if (sel !== id) return sel;
      const remaining = reps.filter((r) => r.id !== id);
      return remaining[0]?.id ?? sel;
    });
    setChannelRepsRaw((prev) => ({
      email: prev.email.filter((x) => x !== id),
      zendesk: prev.zendesk.filter((x) => x !== id),
      chat: prev.chat.filter((x) => x !== id),
    }));
  }, [reps]);

  /* Derived selected-rep accessors — keep the existing single-rep API working */
  const hiredRepName = selectedRep?.name ?? "";
  const setHiredRepName = useCallback((name: string) => updateRep(selectedRepId, { name }), [selectedRepId, updateRep]);
  const repPersonality = selectedRep?.personality ?? "";
  const setRepPersonality = useCallback((p: AiRep["personality"]) => updateRep(selectedRepId, { personality: p }), [selectedRepId, updateRep]);
  const repCustomTone = selectedRep?.customTone ?? "";
  const setRepCustomTone = useCallback((t: string) => updateRep(selectedRepId, { customTone: t }), [selectedRepId, updateRep]);
  const repPermissions = selectedRep?.permissions ?? [];
  const setRepPermissions = useCallback((perms: ActionPermission[]) => updateRep(selectedRepId, { permissions: perms }), [selectedRepId, updateRep]);
  const discloseAI = selectedRep?.discloseAI ?? true;
  const setDiscloseAI = useCallback((v: boolean) => updateRep(selectedRepId, { discloseAI: v }), [selectedRepId, updateRep]);

  /* Written-reply & escalation: direct per-channel settings */
  const [channelReply, setChannelReplyRaw] = useState<Record<ChannelKey, ChannelReplyConfig>>({
    email: { signoff: "Best regards,\nThe Support Team", escalationSeat: "" },
    zendesk: { signoff: "Best regards,\nThe Support Team", escalationSeat: "" },
    chat: { signoff: "", escalationSeat: "" },
  });
  const setChannelReply = useCallback((key: ChannelKey, updates: Partial<ChannelReplyConfig>) => {
    setChannelReplyRaw((prev) => ({ ...prev, [key]: { ...prev[key], ...updates } }));
  }, []);

  /* Settings overlay */
  const [managerTab, setManagerTab] = useState<"operations" | "settings">("operations");
  const [channelSettingsIntent, setChannelSettingsIntent] = useState<ChannelKey | null>(null);
  const [channelConversationsIntent, setChannelConversationsIntent] = useState<ChannelKey | null>(null);
  const [agentSettingsIntent, setAgentSettingsIntent] = useState(false);

  const goToChannelSettings = useCallback((c: ChannelKey) => {
    setMainTab(c === "chat" ? "live-widget" : c === "email" ? "email" : "zendesk");
    setChannelSettingsIntent(c);
  }, []);
  const goToManagerSettings = useCallback(() => {
    setMainTab("settings");
    setAgentSettingsIntent(true);
  }, []);

  /* Email mode & flag rules */
  const [emailMode, setEmailMode] = useState<ChannelMode>("off");
  const [emailFlagRules, setEmailFlagRules] = useState<FlagRule[]>(DEFAULT_FLAG_RULES);

  /* Email sync modal trigger */
  const [openEmailSyncModal, setOpenEmailSyncModal] = useState(false);

  /* Agent selection */
  const [selectedAgentId, setSelectedAgentId] = useState("team-lead");

  /* Playbook deep-link */
  const [playbookDeepLink, setPlaybookDeepLink] = useState<string | null>(null);

  /* Onboarding guide */
  const [showGoLiveGuide, setShowGoLiveGuide] = useState(false);
  const [goLiveGuideShown, setGoLiveGuideShown] = useState(false);

  /* Data */
  const [agentsData, setAgentsData] = useState<Agent[]>(defaultAgents);
  const [rulesData, setRulesData] = useState<Rule[]>(defaultRules);
  const [topicsData, setTopicsData] = useState<Topic[]>(defaultTopics);
  const [docsData, setDocsData] = useState<Document[]>(defaultDocs);

  const updateAgent = useCallback((id: string, updates: Partial<Agent>) => {
    setAgentsData((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
  }, []);
  const updateRule = useCallback((id: string, updates: Partial<Rule>) => {
    setRulesData((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  }, []);
  const toggleRule = useCallback((id: string) => {
    setRulesData((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  }, []);
  const addRule = useCallback((rule: Rule) => {
    setRulesData((prev) => [rule, ...prev]);
  }, []);
  const removeRule = useCallback((id: string) => {
    setRulesData((prev) => prev.filter((r) => r.id !== id));
  }, []);
  const updateTopic = useCallback((id: string, updates: Partial<Topic>) => {
    setTopicsData((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  }, []);
  const addTopic = useCallback((topic: Topic) => {
    setTopicsData((prev) => [topic, ...prev]);
  }, []);
  const addDocument = useCallback((doc: Document) => {
    setDocsData((prev) => [...prev, doc]);
  }, []);
  const removeDocument = useCallback((id: string) => {
    setDocsData((prev) => prev.filter((d) => d.id !== id));
  }, []);
  const toggleDocInUse = useCallback((id: string) => {
    setDocsData((prev) => prev.map((d) => (d.id === id ? { ...d, inUse: !d.inUse } : d)));
  }, []);
  const updateDocument = useCallback((id: string, updates: Partial<Document>) => {
    setDocsData((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)));
  }, []);
  const resetDocuments = useCallback(() => {
    setDocsData([]);
    setSopUploaded(false);
    setExtractedRuleNames([]);
  }, []);

  const completeSetupDemo = useCallback(() => {
    /* One-click demo fill — produces a fully-configured, multi-channel, multi-rep
       state so the demo can show both the configuration AND its result (the Channel
       Coverage overview). Connects all three channels and staffs them differently. */

    // ── Step 1a: Live Widget — connected, live in Production ──
    setLiveChatConnected(true);
    setLiveChatMode("production");

    // ── Step 1b: Email — connected, in Training ──
    setEmailChannelConnected(true);
    setEmailChannelAddress("support@acme-store.com");
    setEmailMode("training");

    // ── Step 1c: Zendesk — connected, in Training ──
    setZendeskRaw({
      subdomain: "acme-store",
      authStatus: "success",
      authError: "",
      seatStatus: "verified",
      seatError: "",
      selectedSeat: "seat-1",
      availableSeats: [
        { id: "seat-1", name: "Seel AI Agent", email: "ai@acme.zendesk.com" },
        { id: "seat-2", name: "Backup Agent", email: "backup@acme.zendesk.com" },
      ],
      webhookStatus: "verified",
      webhookError: "",
      triggerStatus: "verified",
      triggerError: "",
      verifyStatus: "verified",
      verifyError: "",
    });
    setZendeskMode("training");
    setPrimaryChannel("chat");
    setAsyncBackbone("zendesk"); // active written-ticket backbone

    // ── Step 2: Policies/docs ──
    setDocsData(defaultDocs);
    setSopUploaded(true);
    setExtractedRuleNames(["Refund Policy", "Shipping SLA", "Warranty Rules"]);

    // ── Step 3: Hire the AI rep (single digital employee) ──
    setReps([
      {
        id: "rep-ava", name: "Ava", color: "#6c47ff",
        personality: "Friendly", customTone: "",
        permissions: [...defaultReadActions, ...defaultWriteActions],
        discloseAI: true,
      },
    ]);
    setSelectedRepId("rep-ava");
    setRepHired(true);

    // ── Step 4: One rep handles every connected channel ──
    setChannelRepsRaw({
      chat: ["rep-ava"],
      email: ["rep-ava"],
      zendesk: ["rep-ava"],
    });
    // agentMode derives to "production" (chat is live in production)
  }, []);

  /* ── Go-live state derived from per-channel modes (single source of truth = channels) ──
     All three channels share the same ChannelMode vocabulary (off / training / production). */
  const anyChannelLive =
    (liveChatConnected && liveChatMode !== "off") ||
    (emailChannelConnected && emailMode !== "off") ||
    (zendeskConnected && zendeskMode !== "off");
  const isAgentLive =
    (liveChatConnected && liveChatMode === "production") ||
    (emailChannelConnected && emailMode === "production") ||
    (zendeskConnected && zendeskMode === "production");
  const agentMode: ChannelMode = isAgentLive ? "production" : anyChannelLive ? "training" : "off";

  /* Bulk action: set every CONNECTED channel to the requested mode (off included). */
  const setAllChannelModes = useCallback(
    (m: ChannelMode) => {
      if (liveChatConnected) setLiveChatMode(m);
      if (zendeskConnected) setZendeskMode(m);
      if (emailChannelConnected) setEmailMode(m);
    },
    [liveChatConnected, zendeskConnected, emailChannelConnected],
  );

  /* ── Setup Progress derived state ── */
  const anyChannelConnected = liveChatConnected || emailChannelConnected || zendeskConnected;
  const step1Complete = anyChannelConnected;
  const step2Complete = docsData.some((d) => d.status === "Processed" && d.extractedRules);
  const step3Complete = repHired;
  const step4Complete = anyChannelLive;
  // Go-live requires only a connected channel. The AI rep concept is configured
  // in Settings (kept intact) but is no longer surfaced as an AI Manager step.
  // Import Policies (step2) is recommended but no longer blocks activation.
  const step4Status: SetupStepStatus = step1Complete ? (step4Complete ? "complete" : "pending") : "locked";
  const setupFullyComplete = step1Complete && step4Complete;

  /* ── Onboarding step-completion watcher ──
     When an onboarding step transitions to complete, surface an English toast
     and auto-advance the merchant to the next destination. Refs hold the prior
     value so we only fire on the false→true edge (not on initial mount). */
  const prevStep1 = useRef(step1Complete);
  const prevStep2 = useRef(step2Complete);
  const prevStep4 = useRef(step4Complete);
  useEffect(() => {
    const justStep1 = !prevStep1.current && step1Complete;
    const justStep2 = !prevStep2.current && step2Complete;
    const justStep4 = !prevStep4.current && step4Complete;
    prevStep1.current = step1Complete;
    prevStep2.current = step2Complete;
    prevStep4.current = step4Complete;

    // Only guide (toast + auto-navigate) from the AI Manager onboarding view.
    // When the merchant configures directly on a channel settings page (e.g. installs
    // the widget via "Add to theme"), stay put — the in-page card + the bottom-right
    // "Choose a mode" prompt are the guidance, so we don't fire "You're live" here.
    if (mainTab !== "agents") return;

    // Priority: going live wins (it ends the setup flow); otherwise advance the checklist.
    if (justStep4) {
      // Land on whichever channel is connected so we never jump to a hidden tab.
      const dest = liveChatConnected
        ? { tab: "live-widget" as const, key: "chat" as const, label: "Live Widget" }
        : zendeskConnected
        ? { tab: "zendesk" as const, key: "zendesk" as const, label: "Zendesk" }
        : emailChannelConnected
        ? { tab: "email" as const, key: "email" as const, label: "Email Inbox" }
        : { tab: "agents" as const, key: null, label: "AI Manager" };
      toast.success("You're live! Your AI is now handling conversations.", {
        description: `Jumping to ${dest.label} to watch live conversations.`,
      });
      setMainTab(dest.tab);
      // Force the channel page onto its Conversations sub-tab — even when it was
      // already mounted on Settings (the page's own default only applies on mount).
      if (dest.key) setChannelConversationsIntent(dest.key);
      return;
    }
    if (justStep1) {
      toast.success("Channel connected — your AI can now start answering.", {
        description: "Next: import policies (optional) or go live.",
      });
      setMainTab("agents");
      return;
    }
    if (justStep2) {
      toast.success("Policies imported — your AI is now using your support rules.", {
        description: "Next: go live whenever you're ready.",
      });
      setMainTab("agents");
    }
  }, [step1Complete, step2Complete, step4Complete, liveChatConnected, zendeskConnected, emailChannelConnected, mainTab]);

  return (
    <AppContext.Provider
      value={{
        mainTab, setMainTab,
        setupFullyComplete,
        step1Complete, step2Complete, step3Complete, step4Complete,
        step4Status,
        zendesk, setZendesk, zendeskConnected,
        chatWidget, setChatWidget,
        liveChatConnected, setLiveChatConnected,
        liveChatMode, setLiveChatMode,
        liveChatRollout, setLiveChatRollout,
        emailChannelConnected, setEmailChannelConnected,
        emailChannelAddress, setEmailChannelAddress,
        zendeskMode, setZendeskMode,
        asyncBackbone, setAsyncBackbone,
        primaryChannel, setPrimaryChannel,
        anyChannelConnected,
        handoff, setHandoff,
        sopUploaded, setSopUploaded,
        extractedRuleNames, setExtractedRuleNames,
        repHired, setRepHired,
        hiredRepName, setHiredRepName,
        repPersonality, setRepPersonality,
        repCustomTone, setRepCustomTone,
        repPermissions, setRepPermissions,
        reps, selectedRepId, setSelectedRepId, addRep, removeRep,
        agentMode, setAllChannelModes, anyChannelLive, isAgentLive,
        discloseAI, setDiscloseAI,
        channelReply, setChannelReply,
        channelReps, setChannelReps,
        managerTab, setManagerTab,
        channelSettingsIntent, setChannelSettingsIntent,
        channelConversationsIntent, setChannelConversationsIntent,
        agentSettingsIntent, setAgentSettingsIntent,
        goToChannelSettings, goToManagerSettings,
        emailMode, setEmailMode,
        emailFlagRules, setEmailFlagRules,
        openEmailSyncModal, setOpenEmailSyncModal,
        selectedAgentId, setSelectedAgentId,
        playbookDeepLink, setPlaybookDeepLink,
        showGoLiveGuide, setShowGoLiveGuide,
        goLiveGuideShown, setGoLiveGuideShown,
        agentsData, updateAgent,
        rulesData, updateRule, toggleRule, addRule, removeRule,
        topicsData, updateTopic, addTopic,
        docsData, addDocument, removeDocument, toggleDocInUse, updateDocument, resetDocuments, completeSetupDemo,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
