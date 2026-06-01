/*
 * ZendeskPage — dedicated Zendesk channel page.
 * [Tickets | Settings] sub-tabs (操作 / 基础设置).
 * Phase 1: skeleton. Ticket inbox (Phase 3) + settings (Phase 2) migrated later.
 */
import { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import SubTabBar, { type SubTabItem } from "@/components/SubTabBar";
import { ChannelsSection } from "@/components/SetupSettings";
import { EmailInboxView } from "@/pages/EmailPage";
import { zendeskTickets } from "@/lib/data";
import { Ticket, Settings } from "lucide-react";

type ZendeskTab = "tickets" | "settings";

const TABS: SubTabItem<ZendeskTab>[] = [
  { id: "tickets", label: "Tickets", icon: Ticket },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function ZendeskPage() {
  const {
    zendeskConnected, zendeskMode, zendesk,
    channelSettingsIntent, setChannelSettingsIntent,
  } = useApp();
  const [tab, setTab] = useState<ZendeskTab>(zendeskConnected ? "tickets" : "settings");

  useEffect(() => {
    if (channelSettingsIntent === "zendesk") {
      setTab("settings");
      setChannelSettingsIntent(null);
    }
  }, [channelSettingsIntent, setChannelSettingsIntent]);

  const inboxLabel = zendesk?.subdomain ? `${zendesk.subdomain}.zendesk.com` : "Zendesk";

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <SubTabBar tabs={TABS} active={tab} onChange={setTab} />
      {tab === "tickets" ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <EmailInboxView
            source={zendeskTickets}
            mode={zendeskMode}
            kind="zendesk"
            inboxLabel={inboxLabel}
            onOpenChannelSettings={() => setTab("settings")}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto">
            <ChannelsSection only="zendesk" />
          </div>
        </div>
      )}
    </div>
  );
}
