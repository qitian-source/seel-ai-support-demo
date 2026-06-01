/*
 * SettingsPage — global Settings hub (top-tab, far right).
 * Doesn't own settings UI; it's a launcher that deep-links into each
 * function's own Settings module via context helpers.
 *   - AI Manager → goToManagerSettings()
 *   - Live Widget / Email / Zendesk → goToChannelSettings(channel)
 */
import { useApp } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";
import {
  Sliders, MessageSquare, Mail, Ticket, ChevronRight,
  type LucideIcon,
} from "lucide-react";

type StatusTone = "live" | "training" | "ready" | "off";

interface SettingsEntry {
  key: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  status: { label: string; tone: StatusTone };
  go: () => void;
}

const TONE_CLS: Record<StatusTone, string> = {
  live: "bg-[#e9f9ee] text-[#15803d]",
  training: "bg-[#fff7e6] text-[#b45309]",
  ready: "bg-[#f0edff] text-[#6c47ff]",
  off: "bg-[#f3f4f6] text-[#6b7280]",
};

export default function SettingsPage() {
  const {
    goToManagerSettings, goToChannelSettings,
    reps,
    liveChatConnected, liveChatMode,
    emailChannelConnected, emailMode,
    zendeskConnected, zendeskMode,
  } = useApp();

  const channelStatus = (connected: boolean, mode: string): SettingsEntry["status"] => {
    if (!connected) return { label: "Not connected", tone: "off" };
    if (mode === "production") return { label: "Live", tone: "live" };
    if (mode === "training") return { label: "Training", tone: "training" };
    return { label: "Connected", tone: "ready" };
  };

  const repCount = reps.length;

  const entries: SettingsEntry[] = [
    {
      key: "manager",
      icon: Sliders,
      title: "AI Manager",
      desc: "Reps, personas, permissions & shared defaults",
      status: { label: repCount === 1 ? "1 rep" : `${repCount} reps`, tone: repCount > 0 ? "ready" : "off" },
      go: goToManagerSettings,
    },
    {
      key: "chat",
      icon: MessageSquare,
      title: "Live Widget",
      desc: "Connection, appearance & chat escalation",
      status: channelStatus(liveChatConnected, liveChatMode),
      go: () => goToChannelSettings("chat"),
    },
    {
      key: "email",
      icon: Mail,
      title: "Email Inbox",
      desc: "Mailbox connection, sync & reply settings",
      status: channelStatus(emailChannelConnected, emailMode),
      go: () => goToChannelSettings("email"),
    },
    {
      key: "zendesk",
      icon: Ticket,
      title: "Zendesk",
      desc: "Subdomain, sync & ticket routing",
      status: channelStatus(zendeskConnected, zendeskMode),
      go: () => goToChannelSettings("zendesk"),
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-5">
          <h2 className="text-[16px] font-bold text-foreground">Settings</h2>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            One place to jump into each function's own settings module.
          </p>
        </div>

        <div className="space-y-2.5">
          {entries.map((e) => {
            const Icon = e.icon;
            return (
              <button
                key={e.key}
                type="button"
                onClick={e.go}
                className="w-full text-left flex items-center gap-3.5 rounded-xl border border-border bg-white px-4 py-3.5 transition-colors hover:border-[#6c47ff]/40 hover:bg-[#faf9ff]"
              >
                <span className="shrink-0 w-9 h-9 rounded-lg bg-[#f0edff] flex items-center justify-center">
                  <Icon className="w-[18px] h-[18px] text-[#6c47ff]" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold text-foreground">{e.title}</span>
                    <span className={cn("text-[11px] font-medium px-1.5 py-0.5 rounded-full", TONE_CLS[e.status.tone])}>
                      {e.status.label}
                    </span>
                  </span>
                  <span className="block text-[12px] text-muted-foreground mt-0.5 truncate">{e.desc}</span>
                </span>
                <ChevronRight className="shrink-0 w-4 h-4 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
