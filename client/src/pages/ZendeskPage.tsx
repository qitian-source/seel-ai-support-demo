/*
 * ZendeskPage — dedicated Zendesk channel page.
 * [Conversations | Settings] sub-tabs (操作 / 基础设置).
 * Conversations reuses the shared ConversationsView (same as Live Widget),
 * pinned to the Zendesk channel — surfaces conversation info, not raw tickets.
 */
import { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import SubTabBar, { type SubTabItem } from "@/components/SubTabBar";
import { ChannelsSection } from "@/components/SetupSettings";
import ConversationsView from "@/components/ConversationsView";
import { MessageSquare, Settings } from "lucide-react";

type ZendeskTab = "conversations" | "settings";

const TABS: SubTabItem<ZendeskTab>[] = [
  { id: "conversations", label: "Conversations", icon: MessageSquare },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function ZendeskPage() {
  const {
    zendeskConnected,
    channelSettingsIntent, setChannelSettingsIntent,
    channelConversationsIntent, setChannelConversationsIntent,
  } = useApp();
  // Not connected → land on Settings (connect form); connected → land on operations.
  const [tab, setTab] = useState<ZendeskTab>(zendeskConnected ? "conversations" : "settings");

  // Honor a deep-link that asked to open this channel's Settings sub-tab.
  useEffect(() => {
    if (channelSettingsIntent === "zendesk") {
      setTab("settings");
      setChannelSettingsIntent(null);
    }
  }, [channelSettingsIntent, setChannelSettingsIntent]);

  // Honor a deep-link that asked to open this channel's Conversations sub-tab.
  useEffect(() => {
    if (channelConversationsIntent === "zendesk") {
      setTab("conversations");
      setChannelConversationsIntent(null);
    }
  }, [channelConversationsIntent, setChannelConversationsIntent]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <SubTabBar tabs={TABS} active={tab} onChange={setTab} />
      <div className="flex-1 overflow-y-auto bg-[#fafafa]">
        {tab === "conversations" ? (
          <div className="max-w-[1060px] mx-auto px-6 py-6">
            <ConversationsView lockedChannel="Zendesk" />
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-6 py-6">
            <ChannelsSection only="zendesk" />
          </div>
        )}
      </div>
    </div>
  );
}
