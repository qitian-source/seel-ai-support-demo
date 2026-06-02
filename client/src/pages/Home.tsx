/*
 * Home — Main layout: Sidebar + Header Tabs + Content Area
 * Round 7: No wizard mode. Pure tab navigation + Settings overlay.
 */
import { useApp } from "@/contexts/AppContext";
import Sidebar from "@/components/Sidebar";
import AgentsPage from "@/pages/AgentsPage";
import PlaybookPage from "@/pages/PlaybookPage";
import PerformancePage from "@/pages/PerformancePage";
import EmailPage from "@/pages/EmailPage";
import LiveWidgetPage from "@/pages/LiveWidgetPage";
import ZendeskPage from "@/pages/ZendeskPage";
import SalesAgentPage from "@/pages/SalesAgentPage";
import VocAgentPage from "@/pages/VocAgentPage";
import BillingPage from "@/pages/BillingPage";
import SettingsPage from "@/pages/SettingsPage";
import OrgMenu from "@/components/OrgMenu";
import { cn } from "@/lib/utils";
import { Settings } from "lucide-react";

const salesAgentTabs = [
  { id: "sales-agent" as const, label: "Analytics" },
];

export default function Home() {
  const {
    mainTab, setMainTab,
    playbookDeepLink, setPlaybookDeepLink,
    liveChatConnected, emailChannelConnected, zendeskConnected,
  } = useApp();

  // Channel tabs only appear once that channel is connected — AI Manager,
  // Playbook and Performance are always present.
  const aiSupportTabs = [
    { id: "agents" as const, label: "AI Manager" },
    { id: "playbook" as const, label: "Playbook" },
    ...(liveChatConnected ? [{ id: "live-widget" as const, label: "Live Widget" }] : []),
    ...(emailChannelConnected ? [{ id: "email" as const, label: "Email Inbox", badge: true }] : []),
    ...(zendeskConnected ? [{ id: "zendesk" as const, label: "Zendesk" }] : []),
    { id: "performance" as const, label: "Performance" },
  ];

  const isSalesAgent = mainTab === "sales-agent";
  const isVocAgent = mainTab === "voc-agent";
  const isBilling = mainTab === "billing";

  /* Handle tab switch — consume playbookDeepLink */
  const handleTabSwitch = (tabId: typeof mainTab) => {
    setMainTab(tabId);
    if (tabId !== "playbook" && playbookDeepLink) {
      setPlaybookDeepLink(null);
    }
  };

  const vocAgentTabs = [{ id: "voc-agent" as const, label: "Insights" }];
  const activeTabs = isSalesAgent ? salesAgentTabs : isVocAgent ? vocAgentTabs : aiSupportTabs;
  const pageTitle = isSalesAgent ? "Sales Agent" : isVocAgent ? "VOC Agent" : "Support agent";

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <OrgMenu />

      {/* Main content area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Billing page has its own header — render standalone */}
        {isBilling ? (
          <div className="flex-1 overflow-hidden bg-[#fafafa]">
            <BillingPage />
          </div>
        ) : (
          <>
            {/* Page header */}
            <div className="border-b border-border bg-white">
              <div className="px-6 pt-4 pb-0">
                <h1 className="text-[18px] font-bold text-foreground mb-3">{pageTitle}</h1>
                {/* Top tabs */}
                <div className="flex items-center gap-0">
                  {activeTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => handleTabSwitch(tab.id)}
                      className={cn(
                        "px-4 py-2 text-[13px] font-medium border-b-2 transition-colors -mb-[1px] flex items-center gap-1.5",
                        mainTab === tab.id
                          ? "border-[#6c47ff] text-[#6c47ff]"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {tab.label}
                      {"badge" in tab && tab.badge && (
                        <span className="text-[10px] font-bold bg-[#6c47ff] text-white rounded-full w-4 h-4 flex items-center justify-center leading-none">
                          4
                        </span>
                      )}
                    </button>
                  ))}
                  {/* Global Settings — pinned far right */}
                  {!isSalesAgent && !isVocAgent && (
                    <button
                      onClick={() => handleTabSwitch("settings")}
                      className={cn(
                        "ml-auto px-4 py-2 text-[13px] font-medium border-b-2 transition-colors -mb-[1px] flex items-center gap-1.5",
                        mainTab === "settings"
                          ? "border-[#6c47ff] text-[#6c47ff]"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden bg-[#fafafa]">
              {mainTab === "agents"       && <AgentsPage />}
              {mainTab === "playbook"     && <PlaybookPage />}
              {mainTab === "live-widget"  && <LiveWidgetPage />}
              {mainTab === "performance"  && <PerformancePage />}
              {mainTab === "email"        && <EmailPage />}
              {mainTab === "zendesk"      && <ZendeskPage />}
              {mainTab === "settings"     && <SettingsPage />}
              {mainTab === "sales-agent"  && <SalesAgentPage />}
              {mainTab === "voc-agent"    && <VocAgentPage />}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
