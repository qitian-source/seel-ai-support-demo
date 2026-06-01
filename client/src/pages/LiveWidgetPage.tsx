/*
 * LiveWidgetPage — dedicated Live Widget channel page.
 * [Conversations | Settings] sub-tabs (操作 / 基础设置).
 */
import { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import SubTabBar, { type SubTabItem } from "@/components/SubTabBar";
import { ChannelsSection } from "@/components/SetupSettings";
import { MessageSquare, Settings } from "lucide-react";

type LiveWidgetTab = "conversations" | "settings";

const TABS: SubTabItem<LiveWidgetTab>[] = [
  { id: "conversations", label: "Conversations", icon: MessageSquare },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function LiveWidgetPage() {
  const { liveChatConnected, channelSettingsIntent, setChannelSettingsIntent } = useApp();
  // Not connected → land on Settings (connect form); connected → land on operations.
  const [tab, setTab] = useState<LiveWidgetTab>(liveChatConnected ? "conversations" : "settings");

  // Honor a deep-link that asked to open this channel's Settings sub-tab.
  useEffect(() => {
    if (channelSettingsIntent === "chat") {
      setTab("settings");
      setChannelSettingsIntent(null);
    }
  }, [channelSettingsIntent, setChannelSettingsIntent]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <SubTabBar tabs={TABS} active={tab} onChange={setTab} />
      <div className="flex-1 overflow-y-auto p-6">
        {tab === "conversations" ? (
          <PlaceholderBlock title="Live conversations" note="Real-time chat sessions handled by your AI reps will appear here." />
        ) : (
          <div className="max-w-3xl mx-auto">
            <ChannelsSection only="chat" />
          </div>
        )}
      </div>
    </div>
  );
}

function PlaceholderBlock({ title, note }: { title: string; note: string }) {
  return (
    <div className="max-w-3xl mx-auto rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center">
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      <p className="text-xs text-gray-400 mt-1.5">{note}</p>
    </div>
  );
}
