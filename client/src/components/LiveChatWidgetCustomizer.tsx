/*
 * LiveChatWidgetCustomizer — full-screen Live Chat Widget editor.
 * Opened from the Support Chat card's "Customize widget" button.
 *
 * Two-layer model: persona (name / avatar / tone / AI disclosure) lives in
 * the Agent brain layer and is surfaced read-only here. This editor only
 * controls the CHAT SURFACE — colors, layout, copy, page targeting, behavior.
 */
import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft, Monitor, Smartphone, ChevronDown, X, Plus,
  Send, MessageSquare, Bot, GraduationCap, Bolt, Star, Type,
} from "lucide-react";
import { cn } from "@/lib/utils";

const FONT_OPTIONS: { label: string; stack: string }[] = [
  { label: "Inter", stack: "Inter, system-ui, sans-serif" },
  { label: "System", stack: "system-ui, -apple-system, sans-serif" },
  { label: "Roboto", stack: "Roboto, system-ui, sans-serif" },
  { label: "Georgia", stack: "Georgia, serif" },
  { label: "Poppins", stack: "Poppins, system-ui, sans-serif" },
];
const fontStack = (label: string) => FONT_OPTIONS.find((f) => f.label === label)?.stack || "Inter, system-ui, sans-serif";

/* Canned demo replies so the preview is interactive */
function cannedReply(q: string): string {
  const t = q.toLowerCase();
  if (t.includes("order") && t.includes("where")) return "I can track that for you! What's your order number?";
  if (t.includes("return")) return "Returns are easy — I can start one for eligible items. What's your order number?";
  if (t.includes("cancel")) return "If it hasn't shipped yet I can cancel it. Could you share the order number?";
  return "Happy to help with that! Could you share a few more details?";
}

const PAGE_TARGETS: { key: string; label: string; path: string }[] = [
  { key: "home", label: "Home", path: "/" },
  { key: "pdp", label: "Product Detail Page (PDP)", path: "/products/*" },
  { key: "cart", label: "Cart", path: "/cart" },
  { key: "collection", label: "Collection Page", path: "/collections/*" },
  { key: "blogIndex", label: "Blog Index", path: "/blogs/*" },
  { key: "blogPost", label: "Blog Post (Article)", path: "/blogs/*/articles/*" },
  { key: "contact", label: "Contact Page", path: "/pages/contact" },
  { key: "staticPage", label: "Generic Static Page", path: "/pages/*" },
  { key: "account", label: "Customer Account", path: "/account" },
  { key: "login", label: "Login", path: "/account/login" },
  { key: "register", label: "Register", path: "/account/register" },
  { key: "orderStatus", label: "Order Status", path: "/orders/*" },
];

/* ── Collapsible section ── */
function Section({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-100 pb-4">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between py-2">
        <span className="text-sm font-semibold text-gray-800">{title}</span>
        <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", open ? "" : "-rotate-90")} />
      </button>
      {open && <div className="space-y-4 pt-1">{children}</div>}
    </div>
  );
}

/* ── Color swatch + hex input ── */
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-700 mb-1.5 block">{label}</label>
      <div className="flex items-center gap-2 max-w-[180px] border border-gray-200 rounded-lg px-2 py-1.5">
        <label className="relative w-6 h-6 rounded-md border border-gray-200 shrink-0 overflow-hidden cursor-pointer" style={{ backgroundColor: value }}>
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
        </label>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 text-sm text-gray-700 uppercase bg-transparent focus:outline-none w-full"
        />
      </div>
    </div>
  );
}

export default function LiveChatWidgetCustomizer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const {
    chatWidget: w, setChatWidget,
    hiredRepName, discloseAI,
    liveChatMode,
    channelReply, setChannelReply, handoff,
    goToManagerSettings,
  } = useApp();

  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [tab, setTab] = useState<"styles" | "settings">("styles");
  const [newQuestion, setNewQuestion] = useState("");
  const [newCustomPage, setNewCustomPage] = useState("");
  /* interactive preview state */
  const [convo, setConvo] = useState<{ role: "user" | "bot"; text: string }[]>([]);
  const [preChatDone, setPreChatDone] = useState(false);
  const [rated, setRated] = useState(0);

  if (!open) return null;

  const repName = hiredRepName || "Ava";
  const initial = repName.charAt(0).toUpperCase();

  const askQuestion = (q: string) => {
    setConvo((c) => [...c, { role: "user", text: q }, { role: "bot", text: cannedReply(q) }]);
  };
  const showPreChat = w.preChatForm && !preChatDone;
  const showCsat = w.csatEnabled && convo.length > 0;

  const addQuestion = () => {
    const q = newQuestion.trim();
    if (!q) return;
    setChatWidget({ suggestedQuestions: [...w.suggestedQuestions, q] });
    setNewQuestion("");
  };
  const removeQuestion = (i: number) =>
    setChatWidget({ suggestedQuestions: w.suggestedQuestions.filter((_, idx) => idx !== i) });

  const togglePage = (key: string) => {
    const has = w.targetPages.includes(key);
    setChatWidget({ targetPages: has ? w.targetPages.filter((k) => k !== key) : [...w.targetPages, key] });
  };

  const addCustomPage = () => {
    const p = newCustomPage.trim();
    if (!p) return;
    setChatWidget({ customPages: [...w.customPages, p] });
    setNewCustomPage("");
  };
  const removeCustomPage = (i: number) =>
    setChatWidget({ customPages: w.customPages.filter((_, idx) => idx !== i) });

  /* ── Live preview of the widget window ── */
  const PreviewWindow = (
    <div
      className="flex flex-col shadow-2xl overflow-hidden"
      style={{
        width: device === "mobile" ? 300 : 360,
        height: device === "mobile" ? 460 : 420,
        borderRadius: w.cornerRadius,
        backgroundColor: w.windowBackground,
        fontFamily: fontStack(w.fontFamily),
      }}
    >
      {/* header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: w.brandColor, color: w.textOnBrand }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold bg-white/20">{initial}</div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">{repName}</p>
            <p className="text-[10px] opacity-80">Online</p>
          </div>
        </div>
        <X className="w-4 h-4 opacity-70" />
      </div>

      {showPreChat ? (
        /* pre-chat form */
        <div className="flex-1 flex flex-col justify-center px-5 gap-2.5">
          <p className="text-xs font-medium text-gray-700">Before we start</p>
          <div className="h-8 rounded-lg border border-gray-200 flex items-center px-3 text-[11px] text-gray-400">Your name</div>
          <div className="h-8 rounded-lg border border-gray-200 flex items-center px-3 text-[11px] text-gray-400">Email address</div>
          <button onClick={() => setPreChatDone(true)} className="h-8 rounded-lg text-xs font-medium" style={{ backgroundColor: w.brandColor, color: w.textOnBrand }}>
            Start chat
          </button>
        </div>
      ) : (
        <>
          {/* body */}
          <div className="flex-1 p-3 space-y-2 overflow-y-auto">
            {discloseAI && (
              <p className="text-[10px] text-gray-400 text-center">You're chatting with an AI assistant</p>
            )}
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0" style={{ backgroundColor: w.brandColor, color: w.textOnBrand }}>{initial}</div>
              <div className="px-3 py-2 rounded-2xl text-xs max-w-[80%]" style={{ backgroundColor: w.botBubble, color: w.botText }}>
                {w.welcomeMessage}
              </div>
            </div>
            {convo.map((m, i) => m.role === "user" ? (
              <div key={i} className="flex justify-end">
                <div className="px-3 py-2 rounded-2xl text-xs max-w-[80%]" style={{ backgroundColor: w.userBubble, color: w.userText }}>{m.text}</div>
              </div>
            ) : (
              <div key={i} className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0" style={{ backgroundColor: w.brandColor, color: w.textOnBrand }}>{initial}</div>
                <div className="px-3 py-2 rounded-2xl text-xs max-w-[80%]" style={{ backgroundColor: w.botBubble, color: w.botText }}>{m.text}</div>
              </div>
            ))}
          </div>

          {/* CSAT */}
          {showCsat && (
            <div className="px-3 pb-1.5 flex items-center justify-center gap-1.5">
              <span className="text-[10px] text-gray-400">How was this chat?</span>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRated(n)}>
                  <Star className={cn("w-3.5 h-3.5", n <= rated ? "fill-amber-400 text-amber-400" : "text-gray-300")} />
                </button>
              ))}
            </div>
          )}

          {/* suggested questions (clickable) */}
          <div className="px-3 pb-2 flex flex-wrap gap-1.5">
            {w.suggestedQuestions.slice(0, 3).map((q, i) => (
              <button key={i} onClick={() => askQuestion(q)} className="text-[10px] px-2 py-1 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50">{q}</button>
            ))}
          </div>

          {/* input */}
          <div className="px-3 pb-3">
            <div className="flex items-center gap-2 border border-gray-200 rounded-full pl-3 pr-1 py-1">
              <span className="text-[11px] text-gray-400 flex-1">{w.inputPlaceholder}</span>
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: w.brandColor }}>
                <Send className="w-3 h-3" style={{ color: w.textOnBrand }} />
              </div>
            </div>
            {w.poweredBy && <p className="text-[9px] text-gray-300 text-center mt-1.5">Powered by Seel</p>}
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50">
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </button>
          <h2 className="text-lg font-bold text-gray-900">Live Chat Widget</h2>
          <Badge className={cn("h-5 px-1.5 text-[10px] gap-1 border-transparent",
            liveChatMode === "production" ? "bg-indigo-600 text-white" : liveChatMode === "training" ? "bg-amber-500 text-white" : "bg-gray-500 text-white")}>
            {liveChatMode === "production" ? <><Bolt className="w-2.5 h-2.5" /> Production</> : liveChatMode === "training" ? <><GraduationCap className="w-2.5 h-2.5" /> Training</> : "Off"}
          </Badge>
        </div>
        <Button size="sm" onClick={() => { toast.success("Widget settings saved"); onClose(); }}>Save</Button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* preview */}
        <div className="flex-1 flex flex-col bg-gray-50 border-r border-gray-200 min-w-0">
          <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-500">Preview</span>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button onClick={() => setDevice("desktop")} className={cn("flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium", device === "desktop" ? "bg-gray-100 text-gray-800" : "text-gray-400 bg-white")}>
                <Monitor className="w-3.5 h-3.5" /> Desktop
              </button>
              <button onClick={() => setDevice("mobile")} className={cn("flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-l border-gray-200", device === "mobile" ? "bg-gray-100 text-gray-800" : "text-gray-400 bg-white")}>
                <Smartphone className="w-3.5 h-3.5" /> Mobile
              </button>
            </div>
          </div>
          <div className="flex-1 relative overflow-hidden">
            {/* faux storefront */}
            <div className="absolute inset-0 p-8 space-y-3 opacity-60">
              <div className="h-3 w-40 bg-gray-200 rounded" />
              <div className="flex gap-3">
                <div className="h-40 w-40 bg-gray-200 rounded-lg" />
                <div className="h-40 flex-1 bg-gray-200 rounded-lg" />
              </div>
              <div className="h-3 w-56 bg-gray-200 rounded" />
            </div>
            {/* widget docked per layout config */}
            <div
              className="absolute flex flex-col items-end gap-3"
              style={{
                bottom: w.distanceBottom,
                ...(w.position === "bottom-right" ? { right: w.distanceRight } : { left: w.distanceRight }),
                alignItems: w.position === "bottom-right" ? "flex-end" : "flex-start",
              }}
            >
              {PreviewWindow}
              <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: w.launcherColor }}>
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* settings panel */}
        <div className="w-[380px] shrink-0 flex flex-col">
          {/* tabs */}
          <div className="flex gap-5 px-6 pt-4 border-b border-gray-200">
            {(["styles", "settings"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={cn("pb-2.5 text-sm font-medium capitalize border-b-2 -mb-px", tab === t ? "text-indigo-600 border-indigo-600" : "text-gray-400 border-transparent")}>
                {t}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
            {/* persona note — shared from Agent Config */}
            <div className="flex items-start gap-2 p-2.5 bg-indigo-50 border border-indigo-100 rounded-lg">
              <Bot className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-indigo-700 flex-1">
                Name, avatar & tone come from <strong>{repName}</strong>'s Agent Config.
                <button onClick={() => { onClose(); goToManagerSettings(); }} className="ml-1 underline underline-offset-2 hover:text-indigo-900">Edit persona</button>
              </p>
            </div>

            {tab === "styles" ? (
              <>
                <Section title="Colors">
                  <ColorField label="Brand color" value={w.brandColor} onChange={(v) => setChatWidget({ brandColor: v })} />
                  <ColorField label="Text on brand" value={w.textOnBrand} onChange={(v) => setChatWidget({ textOnBrand: v })} />
                  <ColorField label="Bot bubble" value={w.botBubble} onChange={(v) => setChatWidget({ botBubble: v })} />
                  <ColorField label="Bot text" value={w.botText} onChange={(v) => setChatWidget({ botText: v })} />
                  <ColorField label="Window background" value={w.windowBackground} onChange={(v) => setChatWidget({ windowBackground: v })} />
                </Section>

                <Section title="Layout">
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1.5 block">Widget position</label>
                    <div className="flex gap-2">
                      {(["bottom-left", "bottom-right"] as const).map((p) => (
                        <button key={p} onClick={() => setChatWidget({ position: p })} className={cn("px-3 py-1.5 rounded-full border text-xs font-medium", w.position === p ? "border-indigo-400 text-indigo-600 bg-indigo-50" : "border-gray-200 text-gray-500")}>
                          {p === "bottom-left" ? "Bottom Left" : "Bottom Right"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-1.5 block">Distance from bottom</label>
                      <div className="flex items-center gap-1">
                        <Input type="number" value={w.distanceBottom} onChange={(e) => setChatWidget({ distanceBottom: Number(e.target.value) })} className="text-sm" />
                        <span className="text-xs text-gray-400">px</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-1.5 block">Distance from right</label>
                      <div className="flex items-center gap-1">
                        <Input type="number" value={w.distanceRight} onChange={(e) => setChatWidget({ distanceRight: Number(e.target.value) })} className="text-sm" />
                        <span className="text-xs text-gray-400">px</span>
                      </div>
                    </div>
                  </div>
                </Section>
              </>
            ) : (
              <>
                <Section title="Messages">
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1.5 block">Welcome message</label>
                    <textarea
                      value={w.welcomeMessage}
                      onChange={(e) => setChatWidget({ welcomeMessage: e.target.value })}
                      rows={2}
                      className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1.5 block">Suggested questions</label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {w.suggestedQuestions.map((q, i) => (
                        <span key={i} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {q}
                          <button onClick={() => removeQuestion(i)} className="hover:text-indigo-900"><X className="w-3 h-3" /></button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addQuestion()} placeholder="e.g., Where is my order?" className="text-sm" />
                      <Button size="sm" variant="outline" onClick={addQuestion}><Plus className="w-3.5 h-3.5 mr-1" /> Add</Button>
                    </div>
                  </div>
                </Section>

                <Section title="Pre-chat form">
                  <div className="flex items-center justify-between">
                    <div className="pr-3">
                      <p className="text-xs font-medium text-gray-700">Collect name &amp; email</p>
                      <p className="text-[11px] text-gray-400">Ask shoppers for their name and email before the chat starts. Saved to each conversation (Customer &amp; Email).</p>
                    </div>
                    <Switch
                      checked={w.preChatForm}
                      onCheckedChange={(v) => { setChatWidget({ preChatForm: v }); setPreChatDone(false); }}
                    />
                  </div>
                </Section>

                <Section title="Page Targeting">
                  <div className="flex items-center justify-between">
                    <div className="pr-3">
                      <p className="text-xs font-medium text-gray-700">Show on all pages</p>
                      <p className="text-[11px] text-gray-400">Display the widget everywhere except the hidden pages below.</p>
                    </div>
                    <Switch checked={w.targetAllPages} onCheckedChange={(v) => setChatWidget({ targetAllPages: v })} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-700">Hidden Pages</p>
                    <p className="text-[11px] text-gray-400 mb-1.5">The widget will not appear on pages matching these URL patterns.</p>
                    {w.customPages.map((p, i) => (
                      <div key={i} className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                        <code className="bg-gray-50 px-1.5 py-0.5 rounded">{p}</code>
                        <button onClick={() => removeCustomPage(i)} className="text-gray-300 hover:text-gray-600"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input value={newCustomPage} onChange={(e) => setNewCustomPage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCustomPage()} placeholder="/products/*" className="text-sm" />
                      <Button size="sm" variant="outline" onClick={addCustomPage}><Plus className="w-3.5 h-3.5 mr-1" /> Add</Button>
                    </div>
                  </div>
                </Section>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
