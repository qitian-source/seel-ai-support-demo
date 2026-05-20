/*
 * OrgMenu — Top-right avatar dropdown, Shopify-admin style
 * Contains: org name, Organization (disabled), Billing, Switch org (disabled), email, Sign out
 */
import { useState, useRef, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { Building2, CreditCard, ArrowLeftRight, LogOut, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function OrgMenu() {
  const { setMainTab } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  /* Close on outside click */
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="fixed top-3 right-4 z-50">
      {/* Avatar button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-8 h-8 rounded-full bg-[#6c47ff] text-white text-[13px] font-semibold flex items-center justify-center shadow-sm hover:opacity-90 transition-opacity"
      >
        T
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-10 w-[260px] bg-white rounded-xl shadow-lg border border-border overflow-hidden">
          {/* Org header */}
          <div className="px-4 pt-4 pb-3 flex flex-col items-center border-b border-border">
            <div className="w-9 h-9 rounded-full bg-[#f0edff] flex items-center justify-center mb-2">
              <Building2 size={16} className="text-[#6c47ff]" />
            </div>
            <span className="text-[13px] font-semibold text-foreground">seel-test-rsi-001</span>
          </div>

          {/* Menu items */}
          <div className="py-1.5">
            {/* Organization — disabled */}
            <button className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-[#8c9196] cursor-default">
              <Building2 size={15} className="text-[#8c9196]" />
              Organization
            </button>

            {/* Billing — active */}
            <button
              onClick={() => { setMainTab("billing"); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-foreground hover:bg-[#f5f5f5] transition-colors font-medium"
            >
              <CreditCard size={15} className="text-[#6c47ff]" />
              Billing
            </button>

            {/* Switch org — disabled */}
            <button className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-[#8c9196] cursor-default">
              <ArrowLeftRight size={15} className="text-[#8c9196]" />
              Switch organization
              <ChevronRight size={13} className="ml-auto text-[#8c9196]" />
            </button>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Email + Sign out */}
          <div className="py-1.5">
            <div className="px-4 py-2 text-[12px] text-[#8c9196]">
              tongshuai.jia+seel-test-rsi-001@seel.com
            </div>
            <button className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-[#8c9196] hover:bg-[#f5f5f5] cursor-default transition-colors">
              <LogOut size={15} className="text-[#8c9196]" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
