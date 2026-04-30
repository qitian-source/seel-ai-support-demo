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
import SetupSettings from "@/components/SetupSettings";
import { cn } from "@/lib/utils";
import { Badge, } from "@/components/ui/badge";
import { X } from "lucide-react";

const tabs = [
  { id: "agents" as const, label: "Agents" },
  { id: "playbook" as const, label: "Playbook" },
  { id: "email" as const, label: "Email Inbox", badge: true },
  { id: "performance" as const, label: "Performance" },
];

export default function Home() {
  const {
    mainTab, setMainTab,
    showSettings, setShowSettings,
    playbookDeepLink, setPlaybookDeepLink,
  } = useApp();

  /* Handle tab switch — consume playbookDeepLink */
  const handleTabSwitch = (tabId: typeof mainTab) => {
    setMainTab(tabId);
    if (showSettings) setShowSettings(false);
    if (tabId !== "playbook" && playbookDeepLink) {
      setPlaybookDeepLink(null);
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Page header */}
        <div className="border-b border-border bg-white">
          <div className="px-6 pt-4 pb-0">
            <h1 className="text-[18px] font-bold text-foreground mb-3">AI support</h1>
            {/* Top tabs */}
            <div className="flex items-center gap-0">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabSwitch(tab.id)}
                  className={cn(
                    "px-4 py-2 text-[13px] font-medium border-b-2 transition-colors -mb-[1px] flex items-center gap-1.5",
                    mainTab === tab.id && !showSettings
                      ? "border-[#6c47ff] text-[#6c47ff]"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                  {tab.badge && (
                    <span className="text-[10px] font-bold bg-[#6c47ff] text-white rounded-full w-4 h-4 flex items-center justify-center leading-none">
                      4
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>


        {/* Content */}
        <div className="flex-1 overflow-hidden bg-[#fafafa]">
          {showSettings ? (
            <div className="flex-1 h-full overflow-y-auto p-6">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage ticketing system integration and agent configuration.</p>
                  </div>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
                <SetupSettings />
              </div>
            </div>
          ) : (
            <>
              {mainTab === "agents" && <AgentsPage />}
              {mainTab === "playbook" && <PlaybookPage />}
              {mainTab === "performance" && <PerformancePage />}
              {mainTab === "email" && <EmailPage />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
