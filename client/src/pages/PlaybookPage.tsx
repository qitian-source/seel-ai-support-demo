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
  Plus, ThumbsUp, ThumbsDown, Sparkles, PenLine,
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
  const { rulesData, topicsData, updateTopic, setupFullyComplete, addRule, docsData } = useApp();

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
                  <h4 className="text-[13px] font-medium text-foreground">{rule.name}</h4>
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal text-muted-foreground/80 border-border/70 bg-muted/30 shrink-0">
                    {moduleOf(rule)}
                  </Badge>
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
              className="text-[13px] min-h-[160px] resize-none"
            />
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

  const allModules = Array.from(new Set(rulesData.map((r) => r.module || "Uncategorized")));

  const startEdit = () => {
    if (!rule) return;
    setEditName(rule.name);
    setEditContent(rule.content);
    setEditModule(rule.module || "Uncategorized");
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!rule) return;
    if (!editName.trim() || !editContent.trim()) {
      toast.error("Name and content cannot be empty.");
      return;
    }
    const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const nextVersion = (rule.versionHistory[0]?.version ?? 0) + 1;
    const changes: string[] = [];
    if (editName.trim() !== rule.name) changes.push("name");
    if (editContent.trim() !== rule.content) changes.push("content");
    if (editModule !== (rule.module || "Uncategorized")) changes.push("module");
    const diff = changes.length ? `Edited rule ${changes.join(", ")}.` : "Rule reviewed (no content change).";
    updateRule(rule.id, {
      name: editName.trim(),
      content: editContent.trim(),
      module: editModule,
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
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="text-[13px] min-h-[200px] leading-[1.8] resize-none"
              />
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
            </div>
          </div>

          {/* ACTIONS */}
          {actions.length > 0 && (
            <div className="border-t border-border/60 pt-5">
              <SectionHeader>Actions</SectionHeader>
              <div className="flex flex-wrap gap-2">
                {actions.map((action, i) => (
                  <Badge key={i} variant="outline" className="text-[11px] h-6 font-normal border-border/80 text-foreground/80 bg-muted/30">
                    <Sparkles size={10} className="mr-1 text-muted-foreground/50" /> {action}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* STATS */}
          <div className="border-t border-border/60 pt-5">
            <SectionHeader>Stats</SectionHeader>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted/30 rounded-lg px-3 py-2.5">
                <p className="text-[18px] font-semibold text-foreground">{rule.stats.used}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Times used</p>
              </div>
              <div className="bg-muted/30 rounded-lg px-3 py-2.5">
                <p className="text-[18px] font-semibold text-foreground">{rule.stats.avgCsat}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Avg CSAT</p>
              </div>
              <div className="bg-muted/30 rounded-lg px-3 py-2.5">
                <p className="text-[18px] font-semibold text-foreground">{rule.stats.deflection}%</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Deflection</p>
              </div>
            </div>
          </div>

          {/* CONFIG HISTORY — collapsible */}
          <div className="border-t border-border/60 pt-5">
            <button
              onClick={() => setHistoryOpen(!historyOpen)}
              className="flex items-center gap-1.5 w-full text-left"
            >
              <span className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-[0.08em]">
                Config History ({rule.versionHistory.length})
              </span>
              <ChevronDown
                size={12}
                className={cn(
                  "text-muted-foreground/50 ml-auto transition-transform",
                  historyOpen && "rotate-180"
                )}
              />
            </button>

            {historyOpen && (
              <div className="mt-3 relative">
                {/* Timeline line */}
                <div className="absolute left-[5px] top-2 bottom-2 w-px bg-border/60" />

                <div className="space-y-4">
                  {rule.versionHistory.map((entry, i) => (
                    <div key={i} className="flex gap-3 relative">
                      {/* Timeline dot */}
                      <div className={cn(
                        "w-[11px] h-[11px] rounded-full border-2 shrink-0 mt-0.5 z-10",
                        i === 0
                          ? "bg-[#6c47ff] border-[#6c47ff]"
                          : "bg-white border-border"
                      )} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-[12px] font-semibold",
                            i === 0 ? "text-[#6c47ff]" : "text-foreground"
                          )}>
                            v{entry.version}{i === 0 ? " (current)" : ""}
                          </span>
                          <span className="text-[11px] text-muted-foreground">{entry.timestamp}</span>
                        </div>
                        <p className="text-[12px] text-foreground/80 mt-1 leading-relaxed">{entry.diff}</p>
                        <button
                          onClick={() => {
                            if (entry.source === "Document" && rule.sourceDocId) onNavigateToDoc?.(rule.sourceDocId);
                          }}
                          className={cn(
                            "text-[11px] mt-1.5",
                            entry.source === "Document" && rule.sourceDocId
                              ? "text-[#6c47ff] hover:text-[#5a3ad9] hover:underline cursor-pointer"
                              : "text-muted-foreground cursor-default"
                          )}
                        >
                          {sourceLabel(entry.source)}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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

  const handleUploadFile = (name: string, size: string) => {
    const newDoc: DocType = {
      id: `doc-${Date.now()}`,
      name,
      type: name.split(".").pop()?.toUpperCase() || "FILE",
      size,
      uploadedAt: "Just now",
      status: "Processing",
      inUse: false,
      extractedRules: "",
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
      onSwitchToRules();

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
    }, 2500);
  };

  const handleManualInput = (title: string, content: string) => {
    const newDoc: DocType = {
      id: `doc-${Date.now()}`,
      name: title,
      type: "TXT",
      size: `${(content.length / 1024).toFixed(1)} KB`,
      uploadedAt: "Just now",
      status: "Processing",
      inUse: false,
      extractedRules: "",
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
      onSwitchToRules();

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
              className={cn(
                "px-4 py-3 flex items-center gap-3 group transition-colors",
                doc.status === "Processed" ? "cursor-pointer hover:bg-[#f8f8f8]" : ""
              )}
              onClick={() => { if (doc.status === "Processed") setSelectedDocId(doc.id); }}
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
        onUploadFile={(name, size) => { setShowAddDialog(false); handleUploadFile(name, size); }}
        onManualInput={(title, content) => { setShowAddDialog(false); handleManualInput(title, content); }}
      />

      {/* Document Detail Sheet — parsed module → topic → rules */}
      {selectedDocId && (
        <DocumentDetailSheet
          docId={selectedDocId}
          open={!!selectedDocId}
          onOpenChange={(open) => !open && setSelectedDocId(null)}
        />
      )}
    </div>
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
  onUploadFile: (name: string, size: string) => void;
  onManualInput: (title: string, content: string) => void;
}) {
  const [tab, setTab] = useState<"upload" | "manual">("upload");
  const [dragOver, setDragOver] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualContent, setManualContent] = useState("");

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      onUploadFile(file.name, `${(file.size / 1024).toFixed(0)} KB`);
    }
  };

  const handleManualSubmit = () => {
    if (!manualTitle.trim() || !manualContent.trim()) {
      toast.error("Please fill in both title and content.");
      return;
    }
    onManualInput(manualTitle.trim(), manualContent.trim());
    setManualTitle("");
    setManualContent("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-[15px]">Add Document</DialogTitle>
        </DialogHeader>

        {/* Tab switcher */}
        <div className="flex gap-1 bg-[#f5f5f5] rounded-lg p-1">
          <button
            onClick={() => setTab("upload")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-[12px] font-medium transition-colors",
              tab === "upload" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Upload size={13} /> Upload File
          </button>
          <button
            onClick={() => setTab("manual")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-[12px] font-medium transition-colors",
              tab === "manual" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <PenLine size={13} /> Manual Input
          </button>
        </div>

        {tab === "upload" ? (
          <div
            className={cn(
              "border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer",
              dragOver ? "border-[#6c47ff] bg-[#f8f6ff]" : "border-border bg-[#fafafa] hover:border-[#6c47ff]/40"
            )}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => onUploadFile(`Document_${Date.now().toString().slice(-4)}.pdf`, "1.2 MB")}
          >
            <Upload size={28} className="mx-auto mb-3 text-muted-foreground" />
            <p className="text-[13px] text-foreground font-medium">Drag & drop files here, or click to upload</p>
            <p className="text-[11px] text-muted-foreground mt-1.5">Supports PDF, PPTX, DOCX, TXT, CSV, XLS</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-[12px] font-medium text-foreground mb-1 block">Title</label>
              <Input
                placeholder="e.g., Return Policy SOP"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                className="text-[13px]"
              />
            </div>
            <div>
              <label className="text-[12px] font-medium text-foreground mb-1 block">Content</label>
              <Textarea
                placeholder="Paste your support policy, FAQ, or rule content here..."
                value={manualContent}
                onChange={(e) => setManualContent(e.target.value)}
                className="text-[13px] min-h-[160px] resize-none"
              />
            </div>
          </div>
        )}

        {tab === "manual" && (
          <DialogFooter>
            <Button variant="outline" className="text-[12px]" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button className="text-[12px] bg-[#6c47ff] hover:bg-[#5a3ad9] text-white" onClick={handleManualSubmit}>
              Submit
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
