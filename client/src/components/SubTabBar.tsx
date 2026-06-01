/*
 * SubTabBar — shared in-page sub-tab bar used by feature pages to split
 * "operations" (日常操作) from "settings" (基础设置). Matches the visual
 * style already used by Playbook/Performance sub-tabs.
 */
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface SubTabItem<T extends string> {
  id: T;
  label: string;
  icon?: LucideIcon;
}

export default function SubTabBar<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: SubTabItem<T>[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="px-5 py-0 border-b border-border bg-white flex items-center gap-1 shrink-0">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              "px-4 py-2.5 text-[13px] font-medium transition-colors border-b-2 -mb-px",
              active === tab.id
                ? "border-[#6c47ff] text-[#6c47ff]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="flex items-center gap-1.5">
              {Icon && <Icon size={14} />} {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
