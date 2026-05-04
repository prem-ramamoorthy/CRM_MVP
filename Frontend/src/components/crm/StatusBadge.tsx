import type { LeadStatus } from "@/types/crm";
import { cn } from "@/lib/utils";

const map: Record<LeadStatus, { dot: string; text: string; bg: string }> = {
  "New":              { dot: "bg-stage-new",        text: "text-stage-new",        bg: "bg-stage-new/10" },
  "Contacted":        { dot: "bg-stage-contacted",  text: "text-stage-contacted",  bg: "bg-stage-contacted/10" },
  "Interested":       { dot: "bg-stage-interested", text: "text-stage-interested", bg: "bg-stage-interested/10" },
  "Visit Scheduled":  { dot: "bg-stage-visit",      text: "text-stage-visit",      bg: "bg-stage-visit/10" },
  "Closed":           { dot: "bg-stage-closed",     text: "text-stage-closed",     bg: "bg-stage-closed/10" },
};

export function StatusBadge({ status, className }: { status: LeadStatus; className?: string }) {
  const s = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-200 hover:scale-105", s.bg, s.text, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full animate-soft-pulse", s.dot)} />
      {status}
    </span>
  );
}