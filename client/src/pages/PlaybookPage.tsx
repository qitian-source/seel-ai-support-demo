/*
 * PlaybookPage — Rules + Documents
 * Round 15: 6 changes — read-only rule detail, setup proposal cards,
 *           simplified rule cards, single-view detail sheet with config history,
 *           new document dialog (Upload File / Manual Input).
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { useApp } from "@/contexts/AppContext";
import type { Rule, Document as DocType, Topic } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  BookOpen, FileText, Upload, Search, Clock,
  ChevronRight, ChevronDown, X, Trash2, History,
  Plus, ThumbsUp, ThumbsDown, Sparkles, PenLine, Calendar, Download,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import ConversationLogSidebar from "@/components/ConversationLogSidebar";

type PlaybookTab = "rules" | "documents";

export default function PlaybookPage() {
  const { playbookDeepLink, setPlaybookDeepLink } = useApp();
  const [activeTab, setActiveTab] = useState<PlaybookTab>("rules");

  useEffect(() => {
    if (playbookDeepLink === "documents") {
      setActiveTab("documents");
      setPlaybookDeepLink(null);
    }
  }, [playbookDeepLink, setPlaybookDeepLink]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="px-5 py-0 border-b border-border bg-white flex items-center gap-1">
        {(["rules", "documents"] as PlaybookTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2.5 text-[13px] font-medium capitalize transition-colors border-b-2 -mb-px",
              activeTab === tab
                ? "border-[#6c47ff] text-[#6c47ff]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab === "rules" ? (
              <span className="flex items-center gap-1.5"><BookOpen size={14} /> Rules</span>
            ) : (
              <span className="flex items-center gap-1.5"><FileText size={14} /> Documents</span>
            )}
          </button>
        ))}
      </div>

      {activeTab === "rules" ? <RulesView onSwitchToDocuments={() => setActiveTab("documents")} /> : <DocumentsView onSwitchToRules={() => setActiveTab("rules")} />}
    </div>
  );
}

// ============================================================
// RULES VIEW
// ============================================================
function RulesView({ onSwitchToDocuments }: { onSwitchToDocuments: () => void }) {
  const { rulesData, topicsData, updateTopic, setupFullyComplete, addRule, docsData, toggleRule } = useApp();

  const sourceLabelFor = (r: Rule) => {
    if (r.sourceDocId) {
      const doc = docsData.find((d) => d.id === r.sourceDocId);
      if (doc) return doc.name;
    }
    if (r.source === "Team Lead") return "Team Lead proposal";
    if (r.source === "Manager edit") return "Manager edit";
    if (r.source === "Document") return "Uploaded document";
    return r.source;
  };
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarTicketId, setSidebarTicketId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [showNewRule, setShowNewRule] = useState(false);
  const [selectedModule, setSelectedModule] = useState<string>("All");
  const [reviewTopicId, setReviewTopicId] = useState<string | null>(null);

  const moduleOf = (r: Rule) => r.module || "Uncategorized";
  const modules = Array.from(new Set(rulesData.map(moduleOf)));

  const filteredRules = rulesData
    .filter((r) => selectedModule === "All" || moduleOf(r) === selectedModule)
    .filter((r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .slice()
    .sort((a, b) => {
      const ta = new Date(a.lastUpdated).getTime();
      const tb = new Date(b.lastUpdated).getTime();
      return sortOrder === "newest" ? tb - ta : ta - tb;
    });

  const handleCreateRule = (name: string, content: string, module: string) => {
    const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const newRule: Rule = {
      id: `rule-${Date.now()}`,
      name,
      enabled: true,
      description: "",
      content,
      module: module || "Uncategorized",
      source: "Manager edit",
      lastUpdated: today,
      stats: { used: 0, avgCsat: 0, deflection: 0 },
      versionHistory: [
        { version: 1, timestamp: today, source: "Manager edit", diff: "Rule created manually." },
      ],
    };
    addRule(newRule);
    setShowNewRule(false);
    toast.success("Rule created");
  };

  // Setup-stage proposals: only show NEW RULE (not RULE UPDATE) when setup is NOT complete
  const pendingTopics = !setupFullyComplete
    ? topicsData.filter((t) => t.status === "pending" && t.badge === "NEW RULE")
    : [];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 flex items-center gap-3">
        <div className="relative flex-1 max-w-[260px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            placeholder="Search rules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-[12px]"
          />
        </div>
        <span className="text-[12px] text-muted-foreground">{rulesData.length} rules</span>
        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-[12px] gap-1.5">
                <Clock size={13} />
                {sortOrder === "newest" ? "Newest first" : "Oldest first"}
                <ChevronDown size={12} className="text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem className="text-[12px]" onClick={() => setSortOrder("newest")}>
                Newest first
              </DropdownMenuItem>
              <DropdownMenuItem className="text-[12px]" onClick={() => setSortOrder("oldest")}>
                Oldest first
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" className="h-8 text-[12px] bg-[#6c47ff] hover:bg-[#5a3ad9] text-white" onClick={() => setShowNewRule(true)}>
            <Plus size={12} className="mr-1" /> New Rule
          </Button>
        </div>
      </div>

      {/* Module filter tabs */}
      <div className="px-5 pb-2 flex items-center gap-1.5 flex-wrap">
        {["All", ...modules].map((mod) => {
          const count = mod === "All" ? rulesData.length : rulesData.filter((r) => moduleOf(r) === mod).length;
          const active = selectedModule === mod;
          return (
            <button
              key={mod}
              onClick={() => setSelectedModule(mod)}
              className={cn(
                "px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors border",
                active
                  ? "bg-[#6c47ff] text-white border-[#6c47ff]"
                  : "bg-white text-muted-foreground border-border hover:text-foreground hover:border-[#6c47ff]/40"
              )}
            >
              {mod}
              <span className={cn("ml-1.5 text-[11px]", active ? "text-white/70" : "text-muted-foreground/60")}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4">
        {/* Setup-stage proposals — single-line reminder, click to review */}
        {pendingTopics.length > 0 && (
          <button
            onClick={() => setReviewTopicId(pendingTopics[0].id)}
            className="w-full rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-2.5 flex items-center gap-2 text-left hover:bg-amber-100/40 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
            <p className="text-[12px] font-medium text-amber-800 flex-1">
              {pendingTopics.length} proposal{pendingTopics.length > 1 ? "s" : ""} need your review
            </p>
            <span className="text-[11px] text-[#6c47ff] font-medium shrink-0">Review</span>
            <ChevronRight size={14} className="text-amber-500/70 shrink-0" />
          </button>
        )}

        {/* Simplified Rule cards — compact single card with dividers */}
        <div className="border border-border rounded-xl bg-white overflow-hidden divide-y divide-border/60">
          {filteredRules.map((rule) => (
            <div
              key={rule.id}
              className={cn(
                "flex items-center gap-3 px-4 py-3 transition-all cursor-pointer group",
                selectedRuleId === rule.id
                  ? "bg-[#f8f6ff]"
                  : "hover:bg-[#f8f8f8]"
              )}
              onClick={() => setSelectedRuleId(rule.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className={cn("text-[13px] font-medium", rule.enabled ? "text-foreground" : "text-muted-foreground")}>{rule.name}</h4>
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal text-muted-foreground/80 border-border/70 bg-muted/30 shrink-0">
                    {moduleOf(rule)}
                  </Badge>
                  {/* Validity (有效期) */}
                  {(() => {
                    const win = rule.window ?? (rule.sourceDocId ? docsData.find((d) => d.id === rule.sourceDocId)?.window : undefined);
                    return win ? (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal text-amber-700 border-amber-200 bg-amber-50 shrink-0 gap-1" title={`${fmtWindow(win.from)} → ${fmtWindow(win.to)}`}>
                        <Clock size={9} /> Limited
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal text-muted-foreground/70 border-border/70 bg-muted/20 shrink-0">
                        Always
                      </Badge>
                    );
                  })()}
                </div>
                <p className="text-[12px] text-muted-foreground line-clamp-1 mt-0.5">
                  {rule.content.slice(0, 120)}{rule.content.length > 120 ? "…" : ""}
                </p>
                <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-muted-foreground/70">
                  <FileText size={11} className="shrink-0" />
                  <span className="truncate">{sourceLabelFor(rule)}</span>
                  <span className="text-muted-foreground/40">·</span>
                  <Clock size={11} className="shrink-0" />
                  <span className="shrink-0">Updated {rule.lastUpdated}</span>
                </div>
              </div>
              {/* In use / Disabled status + toggle */}
              <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                <span className={cn("text-[11px] font-medium", rule.enabled ? "text-emerald-600" : "text-muted-foreground")}>
                  {rule.enabled ? "In use" : "Disabled"}
                </span>
                <Switch checked={rule.enabled} onCheckedChange={() => toggleRule(rule.id)} className="scale-[0.8]" />
              </div>
              <ChevronRight size={14} className="text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
      </div>

      {/* Rule Detail Sheet */}
      {selectedRuleId && (
        <RuleDetailSheet
          ruleId={selectedRuleId}
          open={!!selectedRuleId}
          onOpenChange={(open) => !open && setSelectedRuleId(null)}
          onNavigateToDoc={() => {
            setSelectedRuleId(null);
            onSwitchToDocuments();
          }}
        />
      )}

      {/* Conversation Log Sidebar for source tickets */}
      {sidebarTicketId && (
        <ConversationLogSidebar ticketId={sidebarTicketId} onClose={() => setSidebarTicketId(null)} />
      )}

      {/* New Rule Dialog */}
      <NewRuleDialog open={showNewRule} onOpenChange={setShowNewRule} onCreate={handleCreateRule} modules={modules} defaultModule={selectedModule !== "All" ? selectedModule : modules[0]} />

      {/* Proposal Review Sheet — editable content, Accept → Save */}
      {reviewTopicId && (
        <ProposalReviewSheet
          topicId={reviewTopicId}
          open={!!reviewTopicId}
          onOpenChange={(open) => !open && setReviewTopicId(null)}
          onTicketClick={(id) => setSidebarTicketId(id)}
        />
      )}
    </div>
  );
}

// ============================================================
// NEW RULE DIALOG — manual rule creation
// ============================================================
function NewRuleDialog({ open, onOpenChange, onCreate, modules, defaultModule }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string, content: string, module: string) => void;
  modules: string[];
  defaultModule?: string;
}) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [module, setModule] = useState(defaultModule || modules[0] || "Uncategorized");

  useEffect(() => {
    if (open) setModule(defaultModule || modules[0] || "Uncategorized");
  }, [open, defaultModule, modules]);

  const handleSubmit = () => {
    if (!name.trim() || !content.trim()) {
      toast.error("Please fill in both name and content.");
      return;
    }
    onCreate(name.trim(), content.trim(), module);
    setName("");
    setContent("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setName(""); setContent(""); } onOpenChange(o); }}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-[15px]">New Rule</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-[12px] font-medium text-foreground mb-1 block">Name</label>
            <Input
              placeholder="e.g., Return Window Policy"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-[13px]"
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground mb-1 block">Module</label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-9 text-[13px] font-normal">
                  {module}
                  <ChevronDown size={14} className="text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                {modules.map((m) => (
                  <DropdownMenuItem key={m} className="text-[13px]" onClick={() => setModule(m)}>
                    {m}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground mb-1 block">Content</label>
            <Textarea
              placeholder="Describe the rule the AI Rep should follow..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={1000}
              className="text-[13px] min-h-[160px] resize-none"
            />
            <p className="text-[10px] text-muted-foreground text-right mt-1">{content.length}/1000</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="text-[12px]" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="text-[12px] bg-[#6c47ff] hover:bg-[#5a3ad9] text-white" onClick={handleSubmit}>
            Create Rule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// PROPOSAL REVIEW SHEET — review → edit → save (commits a live rule)
// ============================================================
function ProposalReviewSheet({ topicId, open, onOpenChange, onTicketClick }: {
  topicId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTicketClick: (ticketId: string) => void;
}) {
  const { topicsData, docsData, updateTopic, addRule } = useApp();
  const topic = topicsData.find((t) => t.id === topicId);
  const [phase, setPhase] = useState<"review" | "edit">("review");
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    if (open && topic) {
      setPhase("review");
      setEditContent(topic.ruleContent || topic.newRuleContent || "");
    }
  }, [open, topicId]);

  if (!topic) return null;

  const sourceDoc = topic.sourceDocId ? docsData.find((d) => d.id === topic.sourceDocId) : null;

  const handleSave = () => {
    const body = editContent.trim();
    if (!body) {
      toast.error("Rule content cannot be empty.");
      return;
    }
    const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const newRule: Rule = {
      id: `rule-${Date.now()}`,
      name: topic.title,
      enabled: true,
      description: topic.summary || "",
      content: body,
      module: "Uncategorized",
      source: "Team Lead",
      sourceDocId: topic.sourceDocId,
      lastUpdated: today,
      stats: { used: 0, avgCsat: 0, deflection: 0 },
      versionHistory: [
        { version: 1, timestamp: today, source: "Team Lead", diff: "Rule accepted from proposal." },
      ],
    };
    addRule(newRule);
    updateTopic(topicId, { status: "accepted" });
    toast.success("Rule accepted and live");
    onOpenChange(false);
  };

  const handleReject = () => {
    updateTopic(topicId, { status: "rejected" });
    toast("Proposal rejected");
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[520px] sm:max-w-[520px] p-0 flex flex-col gap-0">
        <SheetHeader className="px-5 py-4 border-b border-border">
          <div className="flex items-start justify-between gap-3 pr-6">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider shrink-0 py-0 h-5 border-[#6c47ff] text-[#6c47ff] bg-[#f0edff]">
                  {topic.badge}
                </Badge>
                <span className="text-[11px] text-amber-700 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Needs review
                </span>
              </div>
              <SheetTitle className="text-[15px] leading-snug text-left">{topic.title}</SheetTitle>
            </div>
            {phase === "review" && (
              <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1 shrink-0" onClick={() => setPhase("edit")}>
                <PenLine size={12} /> Edit
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Rule content — read-only in review, editable in edit */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {phase === "edit" ? "Edit rule before saving" : "Proposed rule"}
              </p>
              {phase === "edit" && (
                <span className="text-[10px] text-[#6c47ff] font-medium flex items-center gap-1">
                  <PenLine size={11} /> Editing
                </span>
              )}
            </div>
            {phase === "edit" ? (
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                maxLength={1000}
                className="text-[12px] min-h-[200px] resize-none leading-relaxed"
                autoFocus
              />
            ) : (
              <div className="bg-[#f8f9fa] border border-[#e5e7eb] rounded-lg p-3">
                <p className="text-[12px] text-foreground leading-relaxed whitespace-pre-wrap">
                  {topic.ruleContent || topic.newRuleContent}
                </p>
              </div>
            )}
          </div>

          {/* Source */}
          {sourceDoc ? (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <FileText size={12} className="text-muted-foreground/60" />
              <span>Source:</span>
              <span className="text-foreground font-medium">{sourceDoc.name}</span>
            </div>
          ) : topic.sourceTickets.length > 0 && (
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
              <span>Source: {topic.sourceTickets.length} tickets</span>
              <span>&middot;</span>
              {topic.sourceTickets.map((t) => (
                <button
                  key={t}
                  onClick={() => onTicketClick(t)}
                  className="text-[11px] text-[#6c47ff] hover:text-[#5a3ad9] underline underline-offset-2 font-medium"
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className={cn(
          "px-5 py-3 border-t border-border flex items-center gap-2 bg-white",
          phase === "edit" && "justify-end"
        )}>
          {phase === "review" ? (
            <>
              <Button
                size="sm"
                className="h-8 text-[12px] bg-[#6c47ff] hover:bg-[#5a3ad9] text-white"
                onClick={() => setPhase("edit")}
              >
                <ThumbsUp size={12} className="mr-1" /> Accept
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-[12px] text-muted-foreground"
                onClick={handleReject}
              >
                <ThumbsDown size={12} className="mr-1" /> Reject
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-[12px]"
                onClick={() => setPhase("review")}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-8 text-[12px] bg-[#6c47ff] hover:bg-[#5a3ad9] text-white"
                onClick={handleSave}
              >
                Save & make live
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ============================================================
// RULE DETAIL SHEET — Read-only, single view, config history
// ============================================================
function RuleDetailSheet({ ruleId, open, onOpenChange, onNavigateToDoc }: { ruleId: string; open: boolean; onOpenChange: (open: boolean) => void; onNavigateToDoc?: (docId: string) => void }) {
  const { rulesData, docsData, updateRule, removeRule } = useApp();
  const rule = rulesData.find((r) => r.id === ruleId);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editModule, setEditModule] = useState("");
  /* Validity (有效期) edit state — per-rule window overrides the source doc's */
  const [editValidity, setEditValidity] = useState<"always" | "custom">("always");
  const [editFrom, setEditFrom] = useState("");
  const [editTo, setEditTo] = useState("");

  const allModules = Array.from(new Set(rulesData.map((r) => r.module || "Uncategorized")));

  // Effective validity window: the rule's own window, else its source document's.
  const effectiveWindow = rule
    ? (rule.window ?? (rule.sourceDocId ? docsData.find((d) => d.id === rule.sourceDocId)?.window : undefined))
    : undefined;

  const startEdit = () => {
    if (!rule) return;
    setEditName(rule.name);
    setEditContent(rule.content);
    setEditModule(rule.module || "Uncategorized");
    const w = rule.window ?? (rule.sourceDocId ? docsData.find((d) => d.id === rule.sourceDocId)?.window : undefined);
    setEditValidity(w ? "custom" : "always");
    setEditFrom(w?.from ?? "");
    setEditTo(w?.to ?? "");
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!rule) return;
    if (!editName.trim() || !editContent.trim()) {
      toast.error("Name and content cannot be empty.");
      return;
    }
    let newWindow: { from: string; to: string } | undefined;
    if (editValidity === "custom") {
      if (!editFrom || !editTo) { toast.error("Set both a start and end time, or choose Always."); return; }
      if (editFrom >= editTo) { toast.error("End time must be after the start time."); return; }
      newWindow = { from: editFrom, to: editTo };
    }
    const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const nextVersion = (rule.versionHistory[0]?.version ?? 0) + 1;
    const changes: string[] = [];
    if (editName.trim() !== rule.name) changes.push("name");
    if (editContent.trim() !== rule.content) changes.push("content");
    if (editModule !== (rule.module || "Uncategorized")) changes.push("module");
    if (JSON.stringify(newWindow ?? null) !== JSON.stringify(rule.window ?? null)) changes.push("validity");
    const diff = changes.length ? `Edited rule ${changes.join(", ")}.` : "Rule reviewed (no content change).";
    updateRule(rule.id, {
      name: editName.trim(),
      content: editContent.trim(),
      module: editModule,
      window: newWindow,
      source: "Manager edit",
      lastUpdated: today,
      versionHistory: [
        { version: nextVersion, timestamp: today, source: "Manager edit", diff },
        ...rule.versionHistory,
      ],
    });
    setIsEditing(false);
    toast.success("Rule updated");
  };

  const handleDelete = () => {
    if (!rule) return;
    removeRule(rule.id);
    onOpenChange(false);
    toast.success("Rule deleted");
  };

  if (!rule) return null;

  // Extract actions from rule content (verbs that represent system actions)
  const extractActions = (content: string): string[] => {
    const actionPatterns = [
      /look up (?:the )?(?:order|customer|tracking)/gi,
      /retrieve (?:tracking|order|customer)/gi,
      /process (?:the )?(?:refund|replacement|cancellation|return)/gi,
      /cancel (?:the )?order/gi,
      /issue (?:a )?(?:full )?refund/gi,
      /update (?:the )?(?:shipping )?address/gi,
      /escalate (?:to|immediately)/gi,
      /file (?:an )?(?:insurance )?claim/gi,
      /verify (?:the )?(?:order|Seel|protection)/gi,
      /offer (?:compensation|return|alternative)/gi,
      /track (?:shipment|order)/gi,
    ];
    const found: string[] = [];
    for (const pattern of actionPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(m => {
          const clean = m.replace(/^(the |a |an )/, "").trim();
          const capitalized = clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
          if (!found.includes(capitalized)) found.push(capitalized);
        });
      }
    }
    return found.slice(0, 4);
  };

  const actions = extractActions(rule.content);

  const sourceLabel = (source: string) => {
    if (source === "Document") {
      const doc = rule.sourceDocId ? docsData.find(d => d.id === rule.sourceDocId) : null;
      return doc ? doc.name : "Uploaded document";
    }
    if (source === "Team Lead") return "Team Lead proposal";
    if (source === "Manager edit") return "Manager edit";
    return source;
  };

  // Unified section header style
  const SectionHeader = ({ children }: { children: React.ReactNode }) => (
    <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-[0.08em] mb-2.5">{children}</p>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] sm:max-w-[480px] p-0 flex flex-col">
        <SheetHeader className="px-5 pt-4 pb-3 border-b border-border">
          <div className="flex items-start justify-between gap-3 pr-6">
            <div className="min-w-0 flex-1">
              {isEditing ? (
                <div className="space-y-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="text-[15px] font-medium h-9"
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 text-[12px] font-normal gap-1.5">
                        {editModule}
                        <ChevronDown size={13} className="text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {allModules.map((m) => (
                        <DropdownMenuItem key={m} className="text-[12px]" onClick={() => setEditModule(m)}>
                          {m}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <SheetTitle className="text-[16px]">{rule.name}</SheetTitle>
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal text-muted-foreground/80 border-border/70 bg-muted/30">
                    {rule.module || "Uncategorized"}
                  </Badge>
                </div>
              )}
              <span className="text-[11px] text-muted-foreground mt-1 block">Updated {rule.lastUpdated}</span>
            </div>
            {!isEditing && (
              <div className="flex items-center gap-1.5 shrink-0">
                <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1" onClick={startEdit}>
                  <PenLine size={12} /> Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground/60 hover:text-red-600"
                  onClick={handleDelete}
                >
                  <Trash2 size={13} />
                </Button>
              </div>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {/* CONTENT */}
          <div>
            <SectionHeader>Content</SectionHeader>
            {isEditing ? (
              <div>
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  maxLength={1000}
                  className="text-[13px] min-h-[200px] leading-[1.8] resize-none"
                />
                <p className="text-[10px] text-muted-foreground text-right mt-1">{editContent.length}/1000</p>
              </div>
            ) : (
              <p className="text-[13px] text-foreground leading-[1.8] whitespace-pre-wrap">
                {rule.content}
              </p>
            )}
          </div>

          {/* SOURCE */}
          <div className="border-t border-border/60 pt-5">
            <SectionHeader>Source</SectionHeader>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[12.5px]">
                <FileText size={13} className="text-muted-foreground/70 shrink-0" />
                {rule.source === "Document" && rule.sourceDocId && docsData.find((d) => d.id === rule.sourceDocId) ? (
                  <button
                    onClick={() => onNavigateToDoc?.(rule.sourceDocId!)}
                    className="text-[#6c47ff] hover:text-[#5a3ad9] hover:underline font-medium text-left"
                  >
                    {sourceLabel(rule.source)}
                  </button>
                ) : (
                  <span className="text-foreground/90 font-medium">{sourceLabel(rule.source)}</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
                <Clock size={13} className="text-muted-foreground/70 shrink-0" />
                <span>Last updated {rule.lastUpdated}</span>
              </div>
              {isEditing ? (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2 text-[12.5px]">
                    <Clock size={13} className="text-muted-foreground/70 shrink-0" />
                    <span className="text-muted-foreground">Validity</span>
                  </div>
                  <div className="flex gap-2">
                    {(["always", "custom"] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setEditValidity(v)}
                        className={cn(
                          "flex-1 px-3 py-1.5 rounded-lg border text-[12px] font-medium transition-colors",
                          editValidity === v ? "border-[#6c47ff] text-[#6c47ff] bg-[#f0edff]" : "border-gray-200 text-gray-500 hover:border-gray-300"
                        )}
                      >
                        {v === "always" ? "Always (permanent)" : "Custom range"}
                      </button>
                    ))}
                  </div>
                  {editValidity === "custom" && (
                    <div className="space-y-2 rounded-lg border border-gray-100 bg-gray-50/60 p-3">
                      <div>
                        <label className="text-[11px] font-medium text-gray-600 mb-1 block">From</label>
                        <EnglishDateTime value={editFrom} onChange={setEditFrom} />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-gray-600 mb-1 block">To</label>
                        <EnglishDateTime value={editTo} onChange={setEditTo} />
                      </div>
                      <p className="text-[11px] text-gray-400">The rule applies only within this window (to the minute); outside it the rule pauses automatically.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[12.5px]">
                  <Clock size={13} className="text-muted-foreground/70 shrink-0" />
                  <span className="text-muted-foreground">Validity:</span>
                  {effectiveWindow ? (
                    <Badge variant="outline" className="text-[11px] h-5 px-1.5 font-normal text-amber-700 border-amber-200 bg-amber-50">
                      {fmtWindow(effectiveWindow.from)} → {fmtWindow(effectiveWindow.to)}
                    </Badge>
                  ) : (
                    <span className="text-foreground/90 font-medium">Always (permanent)</span>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>

        {isEditing && (
          <div className="px-5 py-3 border-t border-border flex justify-end gap-2 bg-white">
            <Button variant="outline" size="sm" className="h-8 text-[12px]" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button size="sm" className="h-8 text-[12px] bg-[#6c47ff] hover:bg-[#5a3ad9] text-white" onClick={handleSave}>
              Save changes
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ============================================================
// DOCUMENTS VIEW
// ============================================================
/* AI heuristic: does this document look like a time-limited (promo / campaign) policy?
   When it does, we prompt the merchant to set its active time window on upload. */
const CAMPAIGN_KEYWORDS = [
  "sale", "promo", "promotion", "campaign", "bfcm", "black friday", "cyber monday",
  "holiday", "flash", "limited", "limited-time", "limited time", "clearance", "deal",
  "singles day", "double 11", "11.11", "618", "big sale", "event",
  "大促", "促销", "活动", "限时", "秒杀", "双11", "清仓", "节日",
];
function detectTimeBound(text: string): boolean {
  const t = text.toLowerCase();
  return CAMPAIGN_KEYWORDS.some((k) => t.includes(k));
}
/* English date+time selector — built from <select>s so it always renders in
   English regardless of the browser locale (native datetime-local follows the
   OS locale and can't be forced to English). Value = "YYYY-MM-DDTHH:MM". */
/* Date-time picker — click to open a dropdown of Y/M/D + H:M:S selects.
   Value format: "YYYY-MM-DD HH:MM:SS" (to the second). */
const DT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function EnglishDateTime({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/);
  const year = m ? m[1] : "";
  const month = m ? m[2] : "";
  const day = m ? m[3] : "";
  const hour = m ? m[4] : "";
  const minute = m ? m[5] : "";
  const second = m ? m[6] : "";

  const compose = (p: Partial<Record<"year" | "month" | "day" | "hour" | "minute" | "second", string>>) => {
    const y = p.year ?? year, mo = p.month ?? month, d = p.day ?? day;
    const h = p.hour ?? hour, mi = p.minute ?? minute, s = p.second ?? second;
    if (!y || !mo || !d) { onChange(""); return; }
    onChange(`${y}-${mo}-${d} ${h || "00"}:${mi || "00"}:${s || "00"}`);
  };

  const pad = (n: number) => String(n).padStart(2, "0");
  const years = ["2026", "2027"];
  const days = Array.from({ length: 31 }, (_, i) => pad(i + 1));
  const hrs = Array.from({ length: 24 }, (_, i) => pad(i));
  const sixty = Array.from({ length: 60 }, (_, i) => pad(i));
  const selCls = "h-8 px-1.5 rounded-md border border-gray-200 bg-white text-[12px] text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#6c47ff]/30";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full h-9 pl-3 pr-8 rounded-lg border border-gray-200 bg-white text-[13px] text-left tabular-nums focus:outline-none focus:ring-2 focus:ring-[#6c47ff]/30"
      >
        <span className={value ? "text-gray-800" : "text-gray-400"}>{value || "YYYY-MM-DD HH:MM:SS"}</span>
      </button>
      <Calendar className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-50 w-[280px] rounded-lg border border-gray-200 bg-white shadow-lg p-3 space-y-2.5">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Date</p>
              <div className="grid grid-cols-3 gap-1.5">
                <select value={year} onChange={(e) => compose({ year: e.target.value })} className={selCls}>
                  <option value="">Year</option>
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
                <select value={month} onChange={(e) => compose({ month: e.target.value })} className={selCls}>
                  <option value="">Mon</option>
                  {DT_MONTHS.map((label, i) => <option key={label} value={pad(i + 1)}>{label}</option>)}
                </select>
                <select value={day} onChange={(e) => compose({ day: e.target.value })} className={selCls}>
                  <option value="">Day</option>
                  {days.map((d) => <option key={d} value={d}>{Number(d)}</option>)}
                </select>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Time (HH:MM:SS)</p>
              <div className="grid grid-cols-3 gap-1.5">
                <select value={hour} onChange={(e) => compose({ hour: e.target.value })} className={selCls}>
                  {hrs.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
                <select value={minute} onChange={(e) => compose({ minute: e.target.value })} className={selCls}>
                  {sixty.map((mi) => <option key={mi} value={mi}>{mi}</option>)}
                </select>
                <select value={second} onChange={(e) => compose({ second: e.target.value })} className={selCls}>
                  {sixty.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full h-8 rounded-md bg-[#6c47ff] hover:bg-[#5a3ad9] text-white text-[12px] font-medium"
            >
              Done
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* "2026-05-20 00:00:00" → "May 20, 2026 00:00:00" (accepts T or space separator) */
function fmtWindow(v: string): string {
  if (!v) return "—";
  const [d, time] = v.split(/[T ]/);
  const [y, m, day] = d.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[(m || 1) - 1]} ${day}, ${y}${time ? ` ${time}` : ""}`;
}
/* compact "2026-05-20 00:00:00" → "May 20" */
function fmtShort(v: string): string {
  if (!v) return "—";
  const [y, m, day] = v.split(/[T ]/)[0].split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[(m || 1) - 1]} ${day}`;
}

function DocumentsView({ onSwitchToRules }: { onSwitchToRules: () => void }) {
  const {
    docsData, addDocument, removeDocument, toggleDocInUse,
    updateDocument, addTopic, setSopUploaded, setExtractedRuleNames,
  } = useApp();
  const [dragOver, setDragOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [processing, setProcessing] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [windowDocId, setWindowDocId] = useState<string | null>(null); // doc awaiting time-window setup

  const filteredDocs = docsData.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isEmpty = docsData.length === 0;

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      handleUploadFile(file.name, `${(file.size / 1024).toFixed(0)} KB`);
    }
  }, []);

  const handleUploadFile = (name: string, size: string, window?: { from: string; to: string }) => {
    const newDoc: DocType = {
      id: `doc-${Date.now()}`,
      name,
      type: name.split(".").pop()?.toUpperCase() || "FILE",
      size,
      uploadedAt: "Just now",
      status: "Processing",
      inUse: false,
      extractedRules: "",
      ...(window ? { campaign: true, window } : {}),
    };
    addDocument(newDoc);
    setProcessing(true);
    toast.info("Processing will take 5\u201310 minutes \u2014 we will notify you when rules are ready.");

    setTimeout(() => {
      const ruleNames = [
        "Return Window Policy",
        "Seel Protection Claim Process",
        "Shipping Delay Compensation",
      ];
      updateDocument(newDoc.id, {
        status: "Processed",
        inUse: true,
        extractedRules: `${ruleNames.length} rules extracted`,
        parsed: [
          {
            module: "Returns & Refunds",
            topics: [
              { topic: "Return Window", rules: ["Accept returns within 30 days of delivery for unused items in original packaging."] },
              { topic: "Refund Processing", rules: ["Issue refunds to the original payment method within 5–7 business days of receiving the returned item."] },
            ],
          },
          {
            module: "Shipping & Protection",
            topics: [
              { topic: "Seel Protection Claims", rules: ["Verify the order has active Seel protection, then file a claim and confirm the resolution timeline with the customer."] },
              { topic: "Shipping Delays", rules: ["Offer compensation when a shipment is delayed beyond the promised delivery window."] },
            ],
          },
        ],
      });
      setSopUploaded(true);
      setExtractedRuleNames(ruleNames);
      setProcessing(false);

      const newTopic: Topic = {
        id: `topic-doc-${Date.now()}`,
        type: "document-parse",
        badge: "Document Import",
        title: `${ruleNames.length} rules extracted from "${name}"`,
        summary: `Your document has been processed and ${ruleNames.length} support rules were identified. Review and accept them to add to your playbook.`,
        ruleContent: ruleNames.map((r, i) => `${i + 1}. ${r}`).join("\n"),
        sourceTickets: [],
        status: "pending",
      };
      addTopic(newTopic);
      toast.success(`${ruleNames.length} rules extracted`, {
        description: "Check the Rules tab for details.",
      });
      onSwitchToRules();
    }, 2500);
  };

  const handleManualInput = (title: string, content: string, window?: { from: string; to: string }) => {
    const newDoc: DocType = {
      id: `doc-${Date.now()}`,
      name: title,
      type: "TXT",
      size: `${(content.length / 1024).toFixed(1)} KB`,
      uploadedAt: "Just now",
      status: "Processing",
      inUse: false,
      extractedRules: "",
      ...(window ? { campaign: true, window } : {}),
    };
    addDocument(newDoc);
    setProcessing(true);
    toast.info("Processing will take 5\u201310 minutes \u2014 we will notify you when rules are ready.");

    setTimeout(() => {
      const ruleNames = ["Custom Policy Rule"];
      updateDocument(newDoc.id, {
        status: "Processed",
        inUse: true,
        extractedRules: `${ruleNames.length} rule extracted`,
        parsed: [
          {
            module: "Custom Policy",
            topics: [
              { topic: title, rules: ["Custom policy rule extracted from manual input."] },
            ],
          },
        ],
      });
      setSopUploaded(true);
      setExtractedRuleNames(ruleNames);
      setProcessing(false);

      const newTopic: Topic = {
        id: `topic-doc-${Date.now()}`,
        type: "document-parse",
        badge: "Document Import",
        title: `${ruleNames.length} rule extracted from "${title}"`,
        summary: `Your manual input has been processed and ${ruleNames.length} support rule was identified.`,
        ruleContent: ruleNames.map((r, i) => `${i + 1}. ${r}`).join("\n"),
        sourceTickets: [],
        status: "pending",
      };
      addTopic(newTopic);
      toast.success(`${ruleNames.length} rule extracted`);
      onSwitchToRules();
    }, 2500);
  };

  const simulateUpload = () => {
    handleUploadFile(`Document_${Date.now().toString().slice(-4)}.pdf`, "1.2 MB");
  };

  /* ── Empty state ── */
  if (isEmpty) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 flex items-center justify-center mx-auto mb-5">
            <FileText className="w-7 h-7 text-indigo-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Import Your Support Documents</h3>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            Upload your SOP documents, FAQ sheets, or policy files. We'll automatically extract support rules
            that your AI Rep can follow when handling customer tickets.
          </p>

          {/* Upload drop zone */}
          <div
            className={cn(
              "border-2 border-dashed rounded-xl p-8 mb-4 transition-colors cursor-pointer",
              dragOver ? "border-indigo-400 bg-indigo-50" : "border-gray-300 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/50"
            )}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={simulateUpload}
          >
            <Upload size={28} className="mx-auto mb-3 text-gray-400" />
            <p className="text-sm text-gray-600 font-medium">Drag & drop files here, or click to upload</p>
            <p className="text-xs text-gray-400 mt-1">Supports PDF, PPTX, DOCX, TXT, CSV, XLS</p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Normal documents list ── */
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header — search left-aligned, add button right */}
      <div className="px-5 py-3 flex items-center gap-3">
        <div className="relative flex-1 max-w-[260px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-[12px]"
          />
        </div>
        <div className="ml-auto">
          <Button size="sm" className="h-8 text-[12px] bg-[#6c47ff] hover:bg-[#5a3ad9] text-white" onClick={() => setShowAddDialog(true)}>
            <Plus size={12} className="mr-1" /> Add Document
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-5">
        {/* Compact document list — single card with dividers */}
        <div className="border border-border rounded-xl bg-white overflow-hidden divide-y divide-border/60">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="px-4 py-3 flex items-center gap-3 group transition-colors"
            >
              <div className={cn(
                "w-8 h-8 rounded-md flex items-center justify-center text-white text-[9px] font-bold shrink-0 opacity-75",
                doc.type === "PDF" ? "bg-red-400" : doc.type === "DOCX" || doc.type === "DOC" ? "bg-blue-400" : doc.type === "PPTX" ? "bg-orange-400" : "bg-gray-400"
              )}>
                {doc.type}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-[13px] font-medium text-foreground truncate">{doc.name}</h4>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                  {/* Only show non-default statuses */}
                  {doc.status === "Processing" && (
                    <><span className="text-amber-600">Processing...</span><span>·</span></>
                  )}
                  {doc.status === "Error" && (
                    <><span className="text-red-500">Error</span><span>·</span></>
                  )}
                  <span>{doc.size}</span>
                  <span>·</span>
                  <span>{doc.uploadedAt}</span>
                  {doc.campaign && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setWindowDocId(doc.id); }}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-[#6c47ff]/30 bg-[#f0edff] text-[#6c47ff] text-[10px] font-medium hover:bg-[#e7e1ff] transition-colors"
                    >
                      <Clock size={10} />
                      {doc.window ? `${fmtWindow(doc.window.from)} → ${fmtWindow(doc.window.to)}` : "Set active window"}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                {/* Error state: show Retry button */}
                {doc.status === "Error" && (
                  <button
                    className="text-[11px] text-[#6c47ff] hover:text-[#5a3ad9] font-medium"
                    onClick={() => {
                      updateDocument(doc.id, { status: "Processing" });
                      toast.info("Retrying document processing...");
                      setTimeout(() => {
                        updateDocument(doc.id, { status: "Processed", inUse: true });
                        toast.success("Document processed successfully.");
                      }, 3000);
                    }}
                  >
                    Retry
                  </button>
                )}
                {/* Switch only for Processed docs */}
                {doc.status === "Processed" && (
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <span className="text-[11px] text-muted-foreground">{doc.inUse ? "In use" : "Disabled"}</span>
                    <Switch
                      checked={doc.inUse}
                      onCheckedChange={() => toggleDocInUse(doc.id)}
                      className="scale-[0.8]"
                    />
                  </label>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground/60 hover:text-red-600 shrink-0"
                  onClick={() => { removeDocument(doc.id); toast.success("Document removed"); }}
                  aria-label="Remove document"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Document Dialog */}
      <AddDocumentDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onUploadFile={(name, size, window) => { setShowAddDialog(false); handleUploadFile(name, size, window); }}
        onManualInput={(title, content, window) => { setShowAddDialog(false); handleManualInput(title, content, window); }}
      />

      {/* Time-window setup — AI detected a time-limited (campaign) policy */}
      {windowDocId && (
        <TimeWindowDialog docId={windowDocId} onClose={() => setWindowDocId(null)} />
      )}
    </div>
  );
}

// ============================================================
// TIME WINDOW DIALOG — set the active window for a campaign / promo policy
// ============================================================
function TimeWindowDialog({ docId, onClose }: { docId: string; onClose: () => void }) {
  const { docsData, updateDocument } = useApp();
  const doc = docsData.find((d) => d.id === docId);
  const [from, setFrom] = useState(doc?.window?.from ?? "");
  const [to, setTo] = useState(doc?.window?.to ?? "");
  if (!doc) return null;

  const save = () => {
    if (!from || !to) { toast.error("Please set both a start and end time."); return; }
    if (from >= to) { toast.error("End time must be after the start time."); return; }
    updateDocument(docId, { campaign: true, window: { from, to } });
    toast.success("Active window saved", {
      description: `${fmtWindow(from)} → ${fmtWindow(to)} · ${doc.name}`,
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="text-[15px] flex items-center gap-2">
            <Clock size={16} className="text-[#6c47ff]" />
            Set the policy's active window
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-lg border border-[#6c47ff]/20 bg-[#f0edff] px-3 py-2.5">
            <Sparkles size={14} className="text-[#6c47ff] mt-0.5 shrink-0" />
            <p className="text-[12px] text-foreground leading-relaxed">
              AI detected that <span className="font-medium">"{doc.name}"</span> is a <strong>time-limited policy</strong> (promotion / campaign).
              Set when it should be active — the AI only applies it inside this window.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[12px] font-medium text-foreground mb-1 block">From</label>
              <EnglishDateTime value={from} onChange={setFrom} />
            </div>
            <div>
              <label className="text-[12px] font-medium text-foreground mb-1 block">To</label>
              <EnglishDateTime value={to} onChange={setTo} />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Outside this window the policy is paused automatically — useful for big sales (BFCM, 11.11) or specific campaigns.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Skip for now</Button>
          <Button className="bg-[#6c47ff] hover:bg-[#5a3ad9] text-white" onClick={save}>Save window</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// DOCUMENT DETAIL SHEET — parsed module → topic → rule content
// ============================================================
function DocumentDetailSheet({ docId, open, onOpenChange }: {
  docId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { docsData } = useApp();
  const doc = docsData.find((d) => d.id === docId);
  if (!doc) return null;

  const modules = doc.parsed ?? [];
  const ruleCount = modules.reduce((acc, m) => acc + m.topics.reduce((a, t) => a + t.rules.length, 0), 0);

  const SectionHeader = ({ children }: { children: React.ReactNode }) => (
    <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-[0.08em] mb-2.5">{children}</p>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] sm:max-w-[480px] p-0 flex flex-col">
        <SheetHeader className="px-5 pt-4 pb-3 border-b border-border">
          <SheetTitle className="text-[16px] flex items-center gap-2">
            <FileText size={16} className="text-muted-foreground shrink-0" />
            <span className="truncate">{doc.name}</span>
          </SheetTitle>
          <span className="text-[11px] text-muted-foreground mt-1">
            {doc.size} · Uploaded {doc.uploadedAt}
            {modules.length > 0 && ` · ${modules.length} module${modules.length > 1 ? "s" : ""} · ${ruleCount} rule${ruleCount > 1 ? "s" : ""}`}
          </span>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {modules.length === 0 ? (
            <div className="text-[13px] text-muted-foreground py-8 text-center">
              No parsed content available for this document yet.
            </div>
          ) : (
            <div className="space-y-7">
              {modules.map((mod, mi) => (
                <div key={mi}>
                  <SectionHeader>{mod.module}</SectionHeader>
                  <div className="space-y-4">
                    {mod.topics.map((topic, ti) => (
                      <div key={ti} className="border border-border/70 rounded-lg overflow-hidden">
                        <div className="px-3.5 py-2.5 bg-muted/30 border-b border-border/60">
                          <h4 className="text-[13px] font-medium text-foreground">{topic.topic}</h4>
                        </div>
                        <ul className="divide-y divide-border/50">
                          {topic.rules.map((r, ri) => (
                            <li key={ri} className="px-3.5 py-2.5 flex items-start gap-2.5">
                              <span className="mt-1.5 w-1 h-1 rounded-full bg-[#6c47ff] shrink-0" />
                              <p className="text-[12.5px] text-foreground/90 leading-relaxed">{r}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ============================================================
// ADD DOCUMENT DIALOG — Upload File / Manual Input
// ============================================================
function AddDocumentDialog({ open, onOpenChange, onUploadFile, onManualInput }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadFile: (name: string, size: string, window?: { from: string; to: string }) => void;
  onManualInput: (title: string, content: string, window?: { from: string; to: string }) => void;
}) {
  const [tab, setTab] = useState<"upload" | "manual">("upload");
  const [dragOver, setDragOver] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualContent, setManualContent] = useState("");
  /* Validity (有效期) — default permanent; custom = active only within a time range */
  const [validity, setValidity] = useState<"always" | "custom">("always");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Returns: null = permanent · {from,to} = window · false = invalid (abort).
  const resolveWindow = (): { from: string; to: string } | null | false => {
    if (validity === "always") return null;
    if (!from || !to) { toast.error("Set both a start and end time, or choose Always."); return false; }
    if (from >= to) { toast.error("End time must be after the start time."); return false; }
    return { from, to };
  };

  const submitUpload = (name: string, size: string) => {
    const win = resolveWindow();
    if (win === false) return;
    onUploadFile(name, size, win ?? undefined);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) submitUpload(files[0].name, `${(files[0].size / 1024).toFixed(0)} KB`);
  };

  const downloadTemplate = () => {
    // 3-column CSV template: module · questions · answer
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const rows: [string, string, string][] = [
      ["module", "questions", "answer"],
      ["Returns & Refunds", "How do I return an item?", "Returns are accepted within 30 days of delivery for unused items in original packaging."],
      ["Returns & Refunds", "When will I get my refund?", "Refunds are issued to the original payment method within 5–7 business days after we receive the return."],
      ["Shipping", "Where is my order?", "Track it with the number in your confirmation email. Standard delivery is 3–5 business days."],
      ["Shipping", "My shipment is delayed.", "If a shipment is delayed beyond the promised window, we offer compensation per policy."],
    ];
    const csv = rows.map((r) => r.map(esc).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "support-policy-template.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Template downloaded");
  };

  const validityBtn = (active: boolean) =>
    cn("flex-1 px-3 py-2 rounded-lg border text-[12px] font-medium transition-colors",
      active ? "border-[#6c47ff] text-[#6c47ff] bg-[#f0edff]" : "border-gray-200 text-gray-500 hover:border-gray-300");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-[15px]">Add Document</DialogTitle>
        </DialogHeader>

        {/* Validity (有效期) — default permanent; custom = active only within a time range */}
        <div className="space-y-2">
          <label className="text-[12px] font-medium text-foreground block flex items-center gap-1.5">
            <Clock size={13} className="text-[#6c47ff]" /> Validity
          </label>
          <div className="flex gap-2">
            <button onClick={() => setValidity("always")} className={validityBtn(validity === "always")}>Always (permanent)</button>
            <button onClick={() => setValidity("custom")} className={validityBtn(validity === "custom")}>Custom range</button>
          </div>
          {validity === "custom" && (
            <div className="space-y-2 pt-1 rounded-lg border border-gray-100 bg-gray-50/60 p-3">
              <div>
                <label className="text-[11px] font-medium text-gray-600 mb-1 block">From</label>
                <EnglishDateTime value={from} onChange={setFrom} />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-600 mb-1 block">To</label>
                <EnglishDateTime value={to} onChange={setTo} />
              </div>
              <p className="text-[11px] text-gray-400">Rules from this document apply only within the window (down to the minute) — outside it they pause automatically. For big sales / campaigns (BFCM, 11.11).</p>
            </div>
          )}
        </div>

        <div
          className={cn(
            "border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer",
            dragOver ? "border-[#6c47ff] bg-[#f8f6ff]" : "border-border bg-[#fafafa] hover:border-[#6c47ff]/40"
          )}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => submitUpload(`Document_${Date.now().toString().slice(-4)}.pdf`, "1.2 MB")}
        >
          <Upload size={28} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-[13px] text-foreground font-medium">Drag & drop files here, or click to upload</p>
          <p className="text-[11px] text-muted-foreground mt-1.5">Supports PDF, PPTX, DOCX, TXT, CSV, XLS</p>
        </div>

        {/* Template */}
        <div className="flex items-center justify-center gap-1.5 text-[12px] -mt-1">
          <span className="text-muted-foreground">Not sure about the format?</span>
          <button onClick={downloadTemplate} className="inline-flex items-center gap-1 font-medium text-[#6c47ff] hover:underline">
            <Download size={12} /> Download template
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
