import React, { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";
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
  type OperationMode,
  type FlagRule,
} from "@/lib/data";

/* ── Navigation ── */
type MainTab = "agents" | "playbook" | "performance" | "email" | "sales-agent";
type GoLiveMode = "training" | "production" | "off";

/* ── Zendesk sub-step state machine ── */
type ZdAuthStatus = "idle" | "loading" | "success" | "error";
type ZdSeatStatus = "idle" | "loading" | "verified" | "error";
type ZdTriggerStatus = "idle" | "loading" | "verified" | "error";

interface ZendeskState {
  subdomain: string;
  authStatus: ZdAuthStatus;
  authError: string;
  seatStatus: ZdSeatStatus;
  seatError: string;
  selectedSeat: string;
  availableSeats: { id: string; name: string; email: string }[];
  triggerStatus: ZdTriggerStatus;
  triggerError: string;
}

/* ── Channel / Handoff config ── */
interface ChannelConfig {
  email: boolean;
  liveChat: boolean;
  sms: boolean;
}

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
  step1Complete: boolean; // Ticketing System connected
  step2Complete: boolean; // At least one doc processed with rules
  step3Complete: boolean; // Rep hired (name + personality set)
  step4Complete: boolean; // Go Live mode set to training or production
  step4Status: SetupStepStatus; // locked if 1-3 not all done

  /* Zendesk state machine */
  zendesk: ZendeskState;
  setZendesk: (updates: Partial<ZendeskState>) => void;
  zendeskConnected: boolean;

  /* Channel config */
  channels: ChannelConfig;
  setChannels: (updates: Partial<ChannelConfig>) => void;

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
  goLiveMode: GoLiveMode;
  setGoLiveMode: (m: GoLiveMode) => void;

  /* Disclose AI identity */
  discloseAI: boolean;
  setDiscloseAI: (v: boolean) => void;

  /* Email sign-off */
  emailSignoff: string;
  setEmailSignoff: (s: string) => void;

  /* Settings overlay */
  showSettings: boolean;
  setShowSettings: (v: boolean) => void;
  settingsSection: string | null;
  setSettingsSection: (s: string | null) => void;

  /* Email mode & flag rules (configured in Settings > Channels) */
  emailMode: OperationMode;
  setEmailMode: (m: OperationMode) => void;
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
  triggerStatus: "idle",
  triggerError: "",
};

const defaultChannels: ChannelConfig = { email: true, liveChat: false, sms: false };

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
  const zendeskConnected = zendesk.authStatus === "success" && zendesk.seatStatus === "verified" && zendesk.triggerStatus === "verified";

  /* Channels */
  const [channels, setChannelsRaw] = useState<ChannelConfig>(defaultChannels);
  const setChannels = useCallback((updates: Partial<ChannelConfig>) => {
    setChannelsRaw((prev) => ({ ...prev, ...updates }));
  }, []);

  /* Handoff */
  const [handoff, setHandoffRaw] = useState<HandoffConfig>(defaultHandoff);
  const setHandoff = useCallback((updates: Partial<HandoffConfig>) => {
    setHandoffRaw((prev) => ({ ...prev, ...updates }));
  }, []);

  /* SOP */
  const [sopUploaded, setSopUploaded] = useState(false);
  const [extractedRuleNames, setExtractedRuleNames] = useState<string[]>([]);

  /* Rep config — defaults: Ava / Friendly */
  const [repHired, setRepHired] = useState(false);
  const [hiredRepName, setHiredRepName] = useState("Ava");
  const [repPersonality, setRepPersonality] = useState<"Friendly" | "Professional" | "Casual" | "Customize" | "">("Friendly");
  const [repCustomTone, setRepCustomTone] = useState("");
  const [repPermissions, setRepPermissions] = useState<ActionPermission[]>([
    ...defaultReadActions, ...defaultWriteActions,
  ]);
  const [goLiveMode, setGoLiveMode] = useState<GoLiveMode>("off");

  const [discloseAI, setDiscloseAI] = useState(true);
  const [emailSignoff, setEmailSignoff] = useState("Best regards,\nThe Support Team");

  /* Settings overlay */
  const [showSettings, setShowSettings] = useState(false);
  const [settingsSection, setSettingsSection] = useState<string | null>(null);

  /* Email mode & flag rules */
  const [emailMode, setEmailMode] = useState<OperationMode>("training");
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
    // Step 1: Complete Zendesk
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
      triggerStatus: "verified",
      triggerError: "",
    });
    // Step 2: Ensure docs exist
    setDocsData(defaultDocs);
    setSopUploaded(true);
    setExtractedRuleNames(["Refund Policy", "Shipping SLA", "Warranty Rules"]);
    // Step 3: Hire rep
    setRepHired(true);
    setHiredRepName("Ava");
    setRepPersonality("Friendly");
    // Step 4: Go live
    setGoLiveMode("training");
  }, []);

  /* ── Setup Progress derived state ── */
  const step1Complete = zendeskConnected;
  const step2Complete = docsData.some((d) => d.status === "Processed" && d.extractedRules);
  const step3Complete = repHired;
  const step4Complete = goLiveMode !== "off";
  const step4Status: SetupStepStatus = (step1Complete && step2Complete && step3Complete) ? (step4Complete ? "complete" : "pending") : "locked";
  const setupFullyComplete = step1Complete && step2Complete && step3Complete && step4Complete;

  return (
    <AppContext.Provider
      value={{
        mainTab, setMainTab,
        setupFullyComplete,
        step1Complete, step2Complete, step3Complete, step4Complete,
        step4Status,
        zendesk, setZendesk, zendeskConnected,
        channels, setChannels,
        handoff, setHandoff,
        sopUploaded, setSopUploaded,
        extractedRuleNames, setExtractedRuleNames,
        repHired, setRepHired,
        hiredRepName, setHiredRepName,
        repPersonality, setRepPersonality,
        repCustomTone, setRepCustomTone,
        repPermissions, setRepPermissions,
        goLiveMode, setGoLiveMode,
        discloseAI, setDiscloseAI,
        emailSignoff, setEmailSignoff,
        showSettings, setShowSettings,
        settingsSection, setSettingsSection,
        emailMode, setEmailMode,
        emailFlagRules, setEmailFlagRules,
        openEmailSyncModal, setOpenEmailSyncModal,
        selectedAgentId, setSelectedAgentId,
        playbookDeepLink, setPlaybookDeepLink,
        showGoLiveGuide, setShowGoLiveGuide,
        goLiveGuideShown, setGoLiveGuideShown,
        agentsData, updateAgent,
        rulesData, updateRule, toggleRule,
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
