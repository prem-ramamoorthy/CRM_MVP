import { CalendarClock, Mail, Phone, RotateCw } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import type { NextAction } from "@/types/crm";
import { cn } from "@/lib/utils";

const map = {
  call:        { Icon: Phone,         label: "Call",        color: "bg-stage-new/10 text-stage-new" },
  visit:       { Icon: CalendarClock, label: "Visit",       color: "bg-stage-visit/10 text-stage-visit" },
  "follow-up": { Icon: RotateCw,      label: "Follow-up",   color: "bg-stage-interested/10 text-stage-interested" },
  "send-info": { Icon: Mail,          label: "Send info",   color: "bg-stage-contacted/10 text-stage-contacted" },
} as const;

export function NextActionPill({ action, compact, className }: { action?: NextAction; compact?: boolean; className?: string }) {
  if (!action) return <span className="text-xs text-muted-foreground">—</span>;
  const { Icon, label, color } = map[action.type];
  const due = new Date(action.dueAt);
  const overdue = due.getTime() < Date.now();
  const rel = formatDistanceToNowStrict(due, { addSuffix: true });
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium", color, className)}>
      <Icon className="h-3 w-3" />
      {label}
      {!compact && (
        <span className={cn("font-normal opacity-75", overdue && "text-destructive font-semibold opacity-100")}>
          · {rel}
        </span>
      )}
    </span>
  );
}