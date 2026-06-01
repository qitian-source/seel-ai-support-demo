import { useState } from "react";
import { cn } from "@/lib/utils";

type Lang = "en" | "zh";

interface LanguageSwitcherProps {
  className?: string;
}

export default function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const [lang, setLang] = useState<Lang>("en");

  return (
    <div
      className={cn(
        "flex rounded-lg border border-[#e2e4e7] overflow-hidden text-[12px] font-medium",
        className
      )}
    >
      <button
        onClick={() => setLang("en")}
        className={cn(
          "px-3 py-1.5 transition-colors",
          lang === "en"
            ? "bg-[#6c47ff] text-white"
            : "text-[#6d7175] bg-white hover:bg-[#f5f5f5]"
        )}
      >
        EN
      </button>
      <button
        onClick={() => setLang("zh")}
        className={cn(
          "px-3 py-1.5 transition-colors border-l border-[#e2e4e7]",
          lang === "zh"
            ? "bg-[#6c47ff] text-white"
            : "text-[#6d7175] bg-white hover:bg-[#f5f5f5]"
        )}
      >
        中文
      </button>
    </div>
  );
}
