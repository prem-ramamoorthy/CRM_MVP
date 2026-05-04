import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { formatDistanceToNowStrict } from "date-fns";
import { ArrowDown, ArrowUp, ArrowUpDown, Plus, Search, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCrm } from "@/store/crmStore";
import { LEAD_STATUSES, type Lead, type LeadStatus } from "@/types/crm";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { UserAvatar } from "@/components/crm/UserAvatar";
import { LeadFormDialog } from "@/components/crm/LeadFormDialog";
import { ScoreBar } from "@/components/crm/ScoreBar";
import { NextActionPill } from "@/components/crm/NextActionPill";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useOnboarding } from "@/store/onboardingStore";
import { EmptyState } from "@/components/onboarding/EmptyState";

type SortKey = "name" | "status" | "score" | "lastActivityAt" | "createdAt";
type SortDir = "asc" | "desc";

export default function Leads() {
  const { leads, users, getUser, setLeadStatus, assignLead } = useCrm();
  const { markDone } = useOnboarding();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [agentFilter, setAgentFilter] = useState<string | "all">("all");
  const [open, setOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("lastActivityAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // sync ?status= from URL (dashboard deep-links)
  useEffect(() => {
    const s = params.get("status");
    if (s && (LEAD_STATUSES as string[]).includes(s)) setStatusFilter(s as LeadStatus);
  }, [params]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let rows = leads.filter((l) => {
      const matchesQ = !term || l.name.toLowerCase().includes(term) || l.phone.toLowerCase().includes(term) || l.email.toLowerCase().includes(term);
      const matchesS = statusFilter === "all" || l.status === statusFilter;
      const matchesA = agentFilter === "all" || l.assignedTo === agentFilter || (agentFilter === "unassigned" && !l.assignedTo);
      return matchesQ && matchesS && matchesA;
    });
    rows = [...rows].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
    return rows;
  }, [leads, q, statusFilter, agentFilter, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir(k === "name" ? "asc" : "desc"); }
  };

  const clearFilters = () => {
    setQ(""); setStatusFilter("all"); setAgentFilter("all");
    if (params.get("status")) { params.delete("status"); setParams(params, { replace: true }); }
  };
  const hasFilters = q || statusFilter !== "all" || agentFilter !== "all";
  const isEmpty = leads.length === 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground mt-1">{filtered.length} of {leads.length} leads</p>
        </div>
        <Button
          onClick={() => setOpen(true)}
          data-tour="add-lead"
          className={cn("shadow-elegant-md", isEmpty && "animate-soft-pulse ring-2 ring-primary/40")}
        >
          <Plus className="h-4 w-4 mr-1" /> Add lead
        </Button>
      </div>

      {isEmpty ? (
        <Card className="shadow-elegant-sm">
          <EmptyState
            icon={Users}
            title="No leads yet"
            description="Start by capturing your first prospect. You'll see them here in a sortable, filterable table."
            action={
              <Button onClick={() => setOpen(true)} className="animate-soft-pulse">
                <Plus className="h-4 w-4 mr-1" /> Add your first lead
              </Button>
            }
          />
        </Card>
      ) : (
      <Card className="shadow-elegant-sm">
        <div className="p-4 flex flex-col lg:flex-row gap-3 border-b">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search by name, phone, or email..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as LeadStatus | "all")}>
            <SelectTrigger className="lg:w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {LEAD_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={agentFilter} onValueChange={setAgentFilter}>
            <SelectTrigger className="lg:w-[200px]"><SelectValue placeholder="Agent" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All agents</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}><X className="h-4 w-4 mr-1" /> Clear</Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHead label="Name"          k="name"           sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <TableHead>Phone</TableHead>
                <SortHead label="Status"        k="status"         sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <TableHead>Assigned to</TableHead>
                <SortHead label="Score"         k="score"          sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} tooltip="Quality score (0–100). Higher = more likely to convert based on engagement & budget." />
                <TableHead>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help underline decoration-dotted underline-offset-4">Next action</span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[220px]">The upcoming task scheduled for this lead — call, follow-up, visit, or send-info.</TooltipContent>
                  </Tooltip>
                </TableHead>
                <SortHead label="Last activity" k="lastActivityAt" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                  <p className="font-medium text-foreground">No leads match your filters</p>
                  <p className="text-sm mt-1">Try adjusting search or filters.</p>
                </TableCell></TableRow>
              ) : filtered.map((l) => <LeadRow key={l.id} lead={l} users={users} getUser={getUser} setLeadStatus={setLeadStatus} assignLead={assignLead} navigate={navigate} markDone={markDone} />)}
            </TableBody>
          </Table>
        </div>
      </Card>
      )}

      <LeadFormDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function SortHead({ label, k, sortKey, sortDir, onClick, className, tooltip }: { label: string; k: SortKey; sortKey: SortKey; sortDir: SortDir; onClick: (k: SortKey) => void; className?: string; tooltip?: string }) {
  const active = sortKey === k;
  const Icon = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
  const btn = (
    <button onClick={() => onClick(k)} className={cn("inline-flex items-center gap-1 hover:text-foreground", active ? "text-foreground" : "text-muted-foreground")}>
      {label}<Icon className="h-3 w-3" />
    </button>
  );
  return (
    <TableHead className={className}>
      {tooltip ? (
        <Tooltip>
          <TooltipTrigger asChild>{btn}</TooltipTrigger>
          <TooltipContent className="max-w-[220px]">{tooltip}</TooltipContent>
        </Tooltip>
      ) : btn}
    </TableHead>
  );
}

function LeadRow({ lead, users, getUser, setLeadStatus, assignLead, navigate, markDone }: {
  lead: Lead; users: ReturnType<typeof useCrm>["users"]; getUser: ReturnType<typeof useCrm>["getUser"];
  setLeadStatus: ReturnType<typeof useCrm>["setLeadStatus"]; assignLead: ReturnType<typeof useCrm>["assignLead"];
  navigate: ReturnType<typeof useNavigate>;
  markDone: ReturnType<typeof useOnboarding>["markDone"];
}) {
  const agent = getUser(lead.assignedTo);
  // Stop propagation on inline controls so clicks don't navigate
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  return (
    <TableRow className="cursor-pointer transition-colors duration-150 hover:bg-accent/40 hover:shadow-[inset_2px_0_0_hsl(var(--primary))]" onClick={() => navigate(`/leads/${lead.id}`)}>
      <TableCell>
        <p className="font-medium">{lead.name}</p>
        <p className="text-xs text-muted-foreground">{lead.email}</p>
      </TableCell>
      <TableCell className="text-sm tabular-nums">{lead.phone}</TableCell>
      <TableCell onClick={stop}>
        <Select value={lead.status} onValueChange={(v) => { setLeadStatus(lead.id, v as LeadStatus); markDone("moveLead"); toast.success(`Moved to ${v}`); }}>
          <SelectTrigger className="h-8 w-[160px] border-transparent shadow-none hover:border-input bg-transparent px-2">
            <StatusBadge status={lead.status} />
          </SelectTrigger>
          <SelectContent>
            {LEAD_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell onClick={stop}>
        <Select value={lead.assignedTo ?? "unassigned"} onValueChange={(v) => { assignLead(lead.id, v === "unassigned" ? null : v); if (v !== "unassigned") markDone("assignLead"); toast.success("Assignment updated"); }}>
          <SelectTrigger className="h-8 w-[170px] border-transparent shadow-none hover:border-input bg-transparent px-2">
            <div className="flex items-center gap-2 min-w-0">
              <UserAvatar user={agent} />
              <span className="text-sm truncate">{agent?.name ?? "Unassigned"}</span>
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell><ScoreBar score={lead.score} /></TableCell>
      <TableCell><NextActionPill action={lead.nextAction} /></TableCell>
      <TableCell className="text-right text-sm text-muted-foreground whitespace-nowrap">
        {formatDistanceToNowStrict(new Date(lead.lastActivityAt), { addSuffix: true })}
      </TableCell>
    </TableRow>
  );
}