/*
 * ChannelPicker — Channel filter dropdown
 * Options: All Channels / Zendesk / Live Chat Widget / Email
 */
import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type ChannelValue = "all" | "Zendesk" | "Live Chat Widget" | "Email";

const CHANNELS: { value: ChannelValue; label: string }[] = [
  { value: "all",              label: "All Channels"     },
  { value: "Zendesk",         label: "Zendesk"           },
  { value: "Live Chat Widget", label: "Live Chat Widget" },
  { value: "Email",            label: "Email"            },
];

interface Props {
  value: ChannelValue;
  onChange: (v: ChannelValue) => void;
}

export default function ChannelPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedLabel = CHANNELS.find((c) => c.value === value)?.label ?? "All Channels";

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-white text-[12px] text-foreground hover:bg-[#f5f5f5] transition-colors"
      >
        <span>{selectedLabel}</span>
        <ChevronDown size={13} className="text-muted-foreground" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-10 w-[190px] bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.10)] border border-border z-50 overflow-hidden py-1">
          {CHANNELS.map((c) => (
            <button
              key={c.value}
              onClick={() => { onChange(c.value); setOpen(false); }}
              className={cn(
                "w-full flex items-center justify-between px-4 py-[9px] text-[13px] transition-colors hover:bg-[#f5f5f5]",
                value === c.value ? "font-semibold text-foreground" : "text-foreground"
              )}
            >
              {c.label}
              {value === c.value && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2.5 7l3 3 6-6" stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
