/*
 * AgentProfileSheet — Read-only display of agent config
 * Round 3: All editing moved to Settings page, this is view-only
 */
import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import type { Agent } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Eye, Zap, Lock, Settings, CheckCircle2, XCircle,
  Bot, Crown, Pencil,
} from "lucide-react";

function AiBadge() {
  return (
    <span className="inline-flex items-center px-1.5 py-0 rounded text-[9px] font-bold tracking-wider bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-600 border border-indigo-200/60 ml-1.5 select-none">
      <Bot size={9} className="mr-0.5" />AI
    </span>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#f8f9fa] rounded-lg p-3 text-center">
      <p className="text-[18px] font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function PermissionRow({ name, enabled, locked }: { name: string; system?: string; enabled: boolean; locked: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-2">
        <span className="text-[12px] text-foreground">{name}</span>
        {locked && <Lock size={10} className="text-muted-foreground" />}
      </div>
      <div className="flex items-center gap-1.5">
        {enabled ? (
          <CheckCircle2 size={14} className="text-emerald-500" />
        ) : (
          <XCircle size={14} className="text-muted-foreground/40" />
        )}
      </div>
    </div>
  );
}

export default function AgentProfileSheet({
  agent, open, onOpenChange,
}: {
  agent: Agent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const {
    hiredRepName, repPersonality, repPermissions, goLiveMode,
    setShowSettings,
  } = useApp();
  const [activeTab, setActiveTab] = useState<"overview" | "permissions" | "history">("overview");

  const readPerms = repPermissions.filter((p) => p.type === "read");
  const writePerms = repPermissions.filter((p) => p.type === "write");

  const handleEditInSettings = () => {
    onOpenChange(false);
    setTimeout(() => setShowSettings(true), 200);
  };

  const tabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "permissions" as const, label: "Permissions" },
    { id: "history" as const, label: "History" },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[440px] p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-0">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold"
              style={{ background: agent.color }}
            >
              {agent.isTeamLead ? <Crown size={18} /> : agent.initials}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1">
                <SheetTitle className="text-[15px]">
                  {agent.isTeamLead ? agent.name : hiredRepName}
                </SheetTitle>
                <AiBadge />
              </div>
              <p className="text-[12px] text-muted-foreground">
                {agent.isTeamLead ? "Team Lead" : "AI Support Rep"}
              </p>
            </div>
            {!agent.isTeamLead && (
              <Badge variant="outline" className={cn(
                "text-[10px] font-medium",
                goLiveMode === "production"
                  ? "border-emerald-200 text-emerald-700 bg-emerald-50"
                  : "border-amber-200 text-amber-700 bg-amber-50"
              )}>
                {goLiveMode === "production" ? "Production" : "Training"}
              </Badge>
            )}
          </div>
        </SheetHeader>

        {/* Tabs */}
        <div className="flex border-b border-border px-5 mt-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-3 py-2 text-[12px] font-medium border-b-2 transition-colors -mb-px",
                activeTab === tab.id
                  ? "border-[#6c47ff] text-[#6c47ff]"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {activeTab === "overview" && (
            <div className="space-y-5">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                <StatCard label="Tickets Today" value={String(agent.tickets?.today ?? 0)} />
                <StatCard label="Resolution" value={agent.resolution ? `${agent.resolution}%` : "—"} />
                <StatCard label="CSAT" value={agent.csat ? `${agent.csat}/5` : "—"} />
              </div>

              {/* Config Summary */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Configuration</h4>

                <div className="bg-[#f8f9fa] rounded-lg p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[12px] text-muted-foreground">Name</span>
                    <span className="text-[12px] font-medium text-foreground">{hiredRepName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[12px] text-muted-foreground">Personality</span>
                    <span className="text-[12px] font-medium text-foreground">{repPersonality}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[12px] text-muted-foreground">Mode</span>
                    <Badge variant="outline" className={cn(
                      "text-[10px]",
                      goLiveMode === "production"
                        ? "border-emerald-200 text-emerald-700 bg-emerald-50"
                        : "border-amber-200 text-amber-700 bg-amber-50"
                    )}>
                      {goLiveMode === "production" ? "Production" : "Training"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[12px] text-muted-foreground">Permissions</span>
                    <span className="text-[12px] font-medium text-foreground">
                      {repPermissions.filter((p) => p.enabled).length}/{repPermissions.length} enabled
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "permissions" && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Eye size={13} className="text-blue-500" />
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Read Actions</span>
                </div>
                <div className="border border-border rounded-lg overflow-hidden">
                  {readPerms.map((perm) => (
                    <PermissionRow key={perm.id} name={perm.label} system={perm.system} enabled={perm.enabled} locked={perm.locked} />
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Zap size={13} className="text-amber-500" />
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Write Actions</span>
                </div>
                <div className="border border-border rounded-lg overflow-hidden">
                  {writePerms.map((perm) => (
                    <PermissionRow key={perm.id} name={perm.label} system={perm.system} enabled={perm.enabled} locked={perm.locked} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-3">
              {(agent.configHistory ?? []).length === 0 ? (
                <p className="text-[12px] text-muted-foreground text-center py-8">No configuration changes yet.</p>
              ) : (
                agent.configHistory?.map((entry, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-[#6c47ff] mt-1.5" />
                      {i < (agent.configHistory?.length ?? 0) - 1 && (
                        <div className="w-px h-full bg-border mt-1" />
                      )}
                    </div>
                    <div className="pb-4">
                      <p className="text-[12px] font-medium text-foreground">{entry.summary}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {entry.timestamp} &middot; {entry.author}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Edit icon in header area */}
        {!agent.isTeamLead && (
          <div className="px-5 py-3 border-t border-border bg-[#fafafa] flex justify-end">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={handleEditInSettings}
              title="Edit in Settings"
            >
              <Pencil size={14} />
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
