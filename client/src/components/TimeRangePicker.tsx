/*
 * TimeRangePicker — Custom dropdown matching the design spec
 * Presets: Yesterday / Last 7 days / Last 30 days / Last 90 days
 * Custom range: From / To date inputs + Apply
 */
import { useState, useRef, useEffect } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type TimeRangeValue = "yesterday" | "7d" | "30d" | "90d" | "custom";

export interface CustomRange { from: string; to: string }

interface Props {
  value: TimeRangeValue;
  customRange?: CustomRange;
  onChange: (v: TimeRangeValue, custom?: CustomRange) => void;
}

const PRESETS: { value: TimeRangeValue; label: string }[] = [
  { value: "yesterday", label: "Yesterday"    },
  { value: "7d",        label: "Last 7 days"  },
  { value: "30d",       label: "Last 30 days" },
  { value: "90d",       label: "Last 90 days" },
];

function displayLabel(value: TimeRangeValue, custom?: CustomRange) {
  if (value === "custom" && custom?.from && custom?.to) {
    return `${custom.from} – ${custom.to}`;
  }
  return PRESETS.find((p) => p.value === value)?.label ?? "Last 30 days";
}

export default function TimeRangePicker({ value, customRange, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(customRange?.from ?? "");
  const [to, setTo]     = useState(customRange?.to   ?? "");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function selectPreset(v: TimeRangeValue) {
    onChange(v);
    setOpen(false);
  }

  function applyCustom() {
    if (from && to) {
      onChange("custom", { from, to });
      setOpen(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger — matches screenshot style */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-white text-[12px] text-foreground hover:bg-[#f5f5f5] transition-colors"
      >
        <Calendar size={13} className="text-muted-foreground" />
        <span>{displayLabel(value, customRange)}</span>
        <ChevronDown size={13} className="text-muted-foreground" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-10 w-[240px] bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.10)] border border-border z-50 overflow-hidden">
          {/* Presets */}
          <div className="py-1">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => selectPreset(p.value)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-[9px] text-[13px] transition-colors hover:bg-[#f5f5f5]",
                  value === p.value ? "text-[#6c47ff] font-semibold" : "text-foreground"
                )}
              >
                {p.label}
                {value === p.value && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7l3 3 6-6" stroke="#6c47ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            ))}
          </div>

          {/* Custom range section */}
          <div className="border-t border-border" />
          <div className="px-4 pt-3 pb-4">
            <p className="text-[10px] font-semibold text-[#8c9196] uppercase tracking-widest mb-3">
              Custom Range
            </p>
            <div className="space-y-2">
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">From</label>
                <input
                  type="text"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  placeholder="YYYY-MM-DD"
                  className="w-full h-8 px-3 rounded-lg border border-border text-[12px] text-foreground bg-white placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[#6c47ff] focus:border-[#6c47ff]"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">To</label>
                <input
                  type="text"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="YYYY-MM-DD"
                  className="w-full h-8 px-3 rounded-lg border border-border text-[12px] text-foreground bg-white placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[#6c47ff] focus:border-[#6c47ff]"
                />
              </div>
              <button
                onClick={applyCustom}
                disabled={!from || !to}
                className="w-full mt-1 h-8 rounded-lg bg-[#6c47ff]/10 text-[#6c47ff] text-[12px] font-semibold hover:bg-[#6c47ff]/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
