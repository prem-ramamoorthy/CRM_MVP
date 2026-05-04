import { Link } from "react-router-dom";
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { Phone } from "lucide-react";
import { useCrm } from "@/store/crmStore";
import { LEAD_STATUSES, type LeadStatus } from "@/types/crm";
import { UserAvatar } from "@/components/crm/UserAvatar";
import { ScoreBar } from "@/components/crm/ScoreBar";
import { NextActionPill } from "@/components/crm/NextActionPill";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useOnboarding } from "@/store/onboardingStore";
import { FirstTimeTip } from "@/components/onboarding/FirstTimeTip";

const stageHelp: Record<LeadStatus, string> = {
  "New":             "Fresh leads — first contact pending.",
  "Contacted":       "You've reached out, awaiting response.",
  "Interested":      "Lead expressed real interest. Nurture toward a visit.",
  "Visit Scheduled": "Property visit booked. Confirm before the day.",
  "Closed":          "Deal complete — booking confirmed.",
};

const stageDot: Record<LeadStatus, string> = {
  "New": "bg-stage-new",
  "Contacted": "bg-stage-contacted",
  "Interested": "bg-stage-interested",
  "Visit Scheduled": "bg-stage-visit",
  "Closed": "bg-stage-closed",
};

export default function Pipeline() {
  const { leads, getUser, setLeadStatus } = useCrm();
  const { markDone } = useOnboarding();

  const onDragEnd = (r: DropResult) => {
    if (!r.destination) return;
    const newStatus = r.destination.droppableId as LeadStatus;
    const lead = leads.find((l) => l.id === r.draggableId);
    if (!lead || lead.status === newStatus) return;
    setLeadStatus(lead.id, newStatus);
    markDone("moveLead");
    toast.success(`${lead.name} moved to ${newStatus}`);
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Pipeline</h1>
        <p className="text-muted-foreground mt-1">Drag leads between stages to update status. Changes sync everywhere.</p>
      </div>

      <FirstTimeTip
        id="pipeline-dnd"
        title="Drag-and-drop tip"
        body="Grab any card and drop it into another column to instantly update that lead's status. Hover a stage name to see what it means."
      />

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {LEAD_STATUSES.map((status) => {
            const items = [...leads].filter((l) => l.status === status).sort((a, b) => b.score - a.score);
            const totalScore = items.reduce((s, l) => s + l.score, 0);
            return (
              <Droppable droppableId={status} key={status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "rounded-xl border bg-card/60 backdrop-blur p-3 flex flex-col min-h-[300px] transition-base",
                      snapshot.isDraggingOver && "bg-accent border-primary/40 shadow-elegant-md",
                    )}
                  >
                    <div className="flex items-center justify-between px-1 pb-3 border-b mb-3">
                      <div className="flex items-center gap-2">
                        <span className={cn("h-2 w-2 rounded-full", stageDot[status])} />
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <h2 className="text-sm font-semibold cursor-help">{status}</h2>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[220px]">{stageHelp[status]}</TooltipContent>
                        </Tooltip>
                        <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">{items.length}</span>
                      </div>
                      {items.length > 0 && (
                        <span className="text-[10px] text-muted-foreground tabular-nums">avg {Math.round(totalScore / items.length)}</span>
                      )}
                    </div>

                    <div className="space-y-2 flex-1">
                      {items.map((lead, idx) => {
                        const agent = getUser(lead.assignedTo);
                        return (
                          <Draggable draggableId={lead.id} index={idx} key={lead.id}>
                            {(p, snap) => (
                              <div
                                ref={p.innerRef}
                                {...p.draggableProps}
                                {...p.dragHandleProps}
                                style={p.draggableProps.style}
                                className={cn(
                                    "rounded-lg border bg-card p-3 shadow-elegant-sm hover-lift hover:border-primary/30 group animate-scale-in touch-none",
                                    snap.isDragging && "shadow-elegant-lg ring-2 ring-primary/30 scale-[1.03] rotate-1",
                                  )}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <Link to={`/leads/${lead.id}`} className="font-medium text-sm hover:text-primary block min-w-0 truncate">
                                    {lead.name}
                                  </Link>
                                  <UserAvatar user={agent} />
                                </div>
                                <p className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-1">
                                  <Phone className="h-3 w-3" />{lead.phone}
                                </p>
                                <div className="mt-2.5">
                                  <ScoreBar score={lead.score} />
                                </div>
                                {lead.nextAction && (
                                  <div className="mt-2.5">
                                    <NextActionPill action={lead.nextAction} />
                                  </div>
                                )}
                                <div className="mt-2.5 flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
                                  <span>{lead.source}</span>
                                  {lead.budget && <span className="tabular-nums">₹{lead.budget.toLocaleString("en-IN")}</span>}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                      {items.length === 0 && !snapshot.isDraggingOver && (
                        <p className="text-xs text-muted-foreground text-center py-8">Drop leads here</p>
                      )}
                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}