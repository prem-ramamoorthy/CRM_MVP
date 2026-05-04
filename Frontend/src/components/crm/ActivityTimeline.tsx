import { CalendarClock, FileText, PlusCircle, RefreshCw, UserPlus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { ActivityEvent } from "@/types/crm";
import { cn } from "@/lib/utils";

const iconMap = {
  lead_created:    { Icon: PlusCircle,    color: "bg-stage-new/15 text-stage-new" },
  status_changed:  { Icon: RefreshCw,     color: "bg-stage-interested/15 text-stage-interested" },
  assigned:        { Icon: UserPlus,      color: "bg-stage-contacted/15 text-stage-contacted" },
  visit_scheduled: { Icon: CalendarClock, color: "bg-stage-visit/15 text-stage-visit" },
  note_added:      { Icon: FileText,      color: "bg-muted text-muted-foreground" },
} as const;

export function ActivityTimeline({ events, empty }: { events: ActivityEvent[]; empty?: string }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">{empty ?? "No activity yet"}</p>;
  }
  return (
    <ol className="relative space-y-4">
      {events.map((e, idx) => {
        const { Icon, color } = iconMap[e.type];
        return (
          <li key={e.id} className="flex gap-3 animate-fade-in">
            <div className="flex flex-col items-center">
              <div className={cn("flex h-8 w-8 items-center justify-center rounded-full", color)}>
                <Icon className="h-4 w-4" />
              </div>
              {idx < events.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
            </div>
            <div className="flex-1 pb-2">
              <p className="text-sm text-foreground">{e.message}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDistanceToNow(new Date(e.createdAt), { addSuffix: true })}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}