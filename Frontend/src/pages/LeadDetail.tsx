import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { format, formatDistanceToNowStrict } from "date-fns";
import { ArrowLeft, CalendarPlus, Mail, MapPin, Pencil, Phone, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCrm } from "@/store/crmStore";
import { LEAD_STATUSES, type LeadStatus, type NextActionType } from "@/types/crm";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { UserAvatar } from "@/components/crm/UserAvatar";
import { ActivityTimeline } from "@/components/crm/ActivityTimeline";
import { LeadFormDialog } from "@/components/crm/LeadFormDialog";
import { ScheduleVisitDialog } from "@/components/crm/ScheduleVisitDialog";
import { ScoreBar } from "@/components/crm/ScoreBar";
import { NextActionPill } from "@/components/crm/NextActionPill";
import { toast } from "sonner";
import { FirstTimeTip } from "@/components/onboarding/FirstTimeTip";

const NEXT_ACTION_TYPES: NextActionType[] = ["call", "visit", "follow-up", "send-info"];

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { leads, users, getUser, getLeadActivity, setLeadStatus, assignLead, addNote, setNextAction, deleteLead, visits } = useCrm();
  const lead = leads.find((l) => l.id === id);

  const [editing, setEditing] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [noteDraft, setNoteDraft] = useState(lead?.notes ?? "");

  useEffect(() => { setNoteDraft(lead?.notes ?? ""); }, [lead?.id, lead?.notes]);

  if (!lead) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <p className="text-muted-foreground">Lead not found.</p>
        <Button variant="link" onClick={() => navigate("/leads")}>Back to leads</Button>
      </div>
    );
  }

  const agent = getUser(lead.assignedTo);
  const events = getLeadActivity(lead.id);
  const leadVisits = visits.filter((v) => v.leadId === lead.id).sort((a, b) => +new Date(b.scheduledAt) - +new Date(a.scheduledAt));

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Button variant="ghost" size="sm" asChild><Link to="/leads"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link></Button>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setConfirmDelete(true)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4 mr-1" /> Delete</Button>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil className="h-4 w-4 mr-1" /> Edit</Button>
          <Button size="sm" onClick={() => setScheduling(true)}><CalendarPlus className="h-4 w-4 mr-1" /> Schedule visit</Button>
        </div>
      </div>

      <FirstTimeTip
        id="lead-detail-intro"
        title="This is the lead workspace"
        body="Update status, reassign owner, set the next action, save notes, and schedule visits — every change is logged in the activity timeline on the right."
      />

      <Card className="shadow-elegant-md overflow-hidden border-0">
        <div className="bg-gradient-primary p-6 text-primary-foreground">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold">{lead.name}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-primary-foreground/90">
                <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{lead.phone}</span>
                <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{lead.email}</span>
                {lead.preferredLocation && <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{lead.preferredLocation}</span>}
                {lead.budget && <span className="inline-flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5" />₹{lead.budget.toLocaleString("en-IN")}/mo</span>}
              </div>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-2">
              <StatusBadge status={lead.status} className="bg-white/20 text-white" />
              <div className="text-xs text-primary-foreground/80">Last activity {formatDistanceToNowStrict(new Date(lead.lastActivityAt), { addSuffix: true })}</div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-elegant-sm">
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <Field label="Source" value={lead.source} />
              <Field label="Created" value={format(new Date(lead.createdAt), "PPp")} />
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Status</p>
                <Select value={lead.status} onValueChange={(v) => { setLeadStatus(lead.id, v as LeadStatus); toast.success("Status updated"); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEAD_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Assigned to</p>
                <Select value={lead.assignedTo ?? "unassigned"} onValueChange={(v) => { assignLead(lead.id, v === "unassigned" ? null : v); toast.success("Assignment updated"); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground mb-1.5">Lead score</p>
                <ScoreBar score={lead.score} />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-elegant-sm">
            <CardHeader><CardTitle>Next action</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <NextActionPill action={lead.nextAction} />
                {lead.nextAction && (
                  <Button size="sm" variant="ghost" onClick={() => { setNextAction(lead.id, undefined); toast.success("Marked done"); }}>
                    Mark done
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Select value={lead.nextAction?.type ?? ""} onValueChange={(v) => setNextAction(lead.id, { type: v as NextActionType, dueAt: lead.nextAction?.dueAt ?? new Date(Date.now() + 86400000).toISOString(), note: lead.nextAction?.note })}>
                  <SelectTrigger><SelectValue placeholder="Choose action" /></SelectTrigger>
                  <SelectContent>
                    {NEXT_ACTION_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                <input
                  type="datetime-local"
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={lead.nextAction ? new Date(lead.nextAction.dueAt).toISOString().slice(0, 16) : ""}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const dt = new Date(e.target.value).toISOString();
                    setNextAction(lead.id, { type: lead.nextAction?.type ?? "follow-up", dueAt: dt, note: lead.nextAction?.note });
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-elegant-sm">
            <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder="Add notes about this lead..." className="min-h-[100px]" />
              <div className="flex justify-end">
                <Button size="sm" onClick={() => { addNote(lead.id, noteDraft); toast.success("Notes saved"); }}>Save notes</Button>
              </div>
            </CardContent>
          </Card>

          {leadVisits.length > 0 && (
            <Card className="shadow-elegant-sm">
              <CardHeader><CardTitle>Visits</CardTitle></CardHeader>
              <CardContent>
                <ul className="divide-y">
                  {leadVisits.map((v) => (
                    <li key={v.id} className="py-3">
                      <p className="font-medium text-sm">{format(new Date(v.scheduledAt), "PPp")}</p>
                      {v.notes && <p className="text-sm text-muted-foreground mt-1">{v.notes}</p>}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="shadow-elegant-sm">
            <CardHeader><CardTitle>Owner</CardTitle></CardHeader>
            <CardContent>
              {agent ? (
                <div className="flex items-center gap-3">
                  <UserAvatar user={agent} size="md" />
                  <div>
                    <p className="font-medium">{agent.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{agent.role}</p>
                  </div>
                </div>
              ) : <p className="text-sm text-muted-foreground">Unassigned</p>}
            </CardContent>
          </Card>

          <Card className="shadow-elegant-sm">
            <CardHeader><CardTitle>Activity timeline</CardTitle></CardHeader>
            <CardContent>
              <ActivityTimeline events={events} />
            </CardContent>
          </Card>
        </div>
      </div>

      <LeadFormDialog open={editing} onOpenChange={setEditing} lead={lead} />
      <ScheduleVisitDialog open={scheduling} onOpenChange={setScheduling} leadId={lead.id} />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this lead?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {lead.name} and all related visits and activity. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { deleteLead(lead.id); toast.success("Lead deleted"); navigate("/leads"); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete lead
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}