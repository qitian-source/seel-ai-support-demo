/*
 * Sidebar — Shopify-admin-style left navigation
 * Design: Light background, muted nav items, active item highlighted with brand accent
 */
import { useApp } from "@/contexts/AppContext";
import {
  Home, BarChart3, ShoppingBag, AlertCircle, Shield,
  Puzzle, Star, Bot, Grid3X3, Bell, Settings,
  Headphones, TrendingUp, UserSquare2, Megaphone, ClipboardCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const mainNav = [
  { icon: Home,        label: "Home",         tab: null, disabled: true },
  { icon: BarChart3,   label: "Analytics",    tab: null, disabled: true },
  { icon: ShoppingBag, label: "Orders",       tab: null, disabled: true },
  { icon: AlertCircle, label: "Issues",       tab: null, disabled: true },
  { icon: Shield,      label: "Protection",   tab: null, disabled: true },
  { icon: Puzzle,      label: "Integrations", tab: null, disabled: true },
  { icon: Star,        label: "Reviews",      tab: null, disabled: true },
  { icon: Bot,         label: "Conversation", tab: null, disabled: true },
];

const workforceNav = [
  { icon: Headphones,     label: "Support agent", tab: "agents" as const,      disabled: false },
  { icon: TrendingUp,     label: "Sales agent",   tab: "sales-agent" as const, disabled: false },
  { icon: Megaphone,      label: "VOC agent",     tab: "voc-agent" as const,   disabled: false },
  { icon: ClipboardCheck, label: "Review agent",  tab: null,                   disabled: true },
];

const customizeNav = [
  { icon: Grid3X3,     label: "Widgets",         disabled: true },
  { icon: UserSquare2, label: "Customer Portal",  disabled: true },
  { icon: Bell,        label: "Notifications",    disabled: true },
];

type NavItem = {
  icon: typeof Home;
  label: string;
  tab: "agents" | "sales-agent" | "voc-agent" | null;
  disabled: boolean;
};

export default function Sidebar() {
  const { mainTab, setMainTab } = useApp();

  const renderNavItem = (item: NavItem) => {
    const supportAgentTabs = ["agents", "playbook", "performance", "email"];
    const isActive = item.label === "Support agent"
      ? supportAgentTabs.includes(mainTab)
      : item.tab
        ? mainTab === item.tab
        : false;

    return (
      <button
        key={item.label}
        onClick={() => {
          if (item.tab) {
            setMainTab(item.tab);
          } else if (item.disabled) {
            toast("Feature coming soon", { description: `${item.label} is not available in this demo.` });
          }
        }}
        className={cn(
          "w-full flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[13px] font-medium transition-colors",
          isActive
            ? "bg-[#f0edff] text-[#6c47ff]"
            : item.disabled
              ? "text-[#8c9196] hover:bg-[#f1f2f3] cursor-default"
              : "text-[#6d7175] hover:bg-[#f1f2f3]"
        )}
      >
        <item.icon size={16} strokeWidth={1.8} />
        {item.label}
      </button>
    );
  };

  return (
    <aside className="w-[220px] shrink-0 border-r border-border bg-[#fafafa] flex flex-col h-screen sticky top-0">
      {/* Store header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-md bg-[#5c5f62] flex items-center justify-center text-white text-xs font-bold">
          S
        </div>
        <span className="text-[13px] font-medium text-foreground truncate">
          seel-test-alexsong-1200...
        </span>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {mainNav.map((item) => renderNavItem(item))}

        {/* Workforce section */}
        <div className="mt-4 mb-1 px-3">
          <span className="text-[11px] font-semibold text-[#8c9196] uppercase tracking-wider">
            Workforce
          </span>
        </div>
        {workforceNav.map((item) => renderNavItem(item))}

        {/* Customize section */}
        <div className="mt-4 mb-1 px-3">
          <span className="text-[11px] font-semibold text-[#8c9196] uppercase tracking-wider">
            Customize
          </span>
        </div>
        {customizeNav.map((item) => (
          <button
            key={item.label}
            onClick={() => toast("Feature coming soon", { description: `${item.label} is not available in this demo.` })}
            className="w-full flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[13px] font-medium text-[#8c9196] hover:bg-[#f1f2f3] cursor-default transition-colors"
          >
            <item.icon size={16} strokeWidth={1.8} />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Settings at bottom */}
      <div className="px-2 pb-3">
        <button
          onClick={() => toast("Feature coming soon", { description: "Settings is not available in this demo." })}
          className="w-full flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[13px] font-medium text-[#8c9196] hover:bg-[#f1f2f3] transition-colors"
        >
          <Settings size={16} strokeWidth={1.8} />
        </button>
      </div>
    </aside>
  );
}
