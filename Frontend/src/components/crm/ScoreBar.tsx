import { cn } from "@/lib/utils";

export function ScoreBar({ score, className }: { score: number; className?: string }) {
  const tone =
    score >= 80 ? "bg-stage-closed text-stage-closed"
    : score >= 60 ? "bg-stage-interested text-stage-interested"
    : score >= 40 ? "bg-stage-contacted text-stage-contacted"
    : "bg-muted-foreground text-muted-foreground";
  const [bg] = tone.split(" ");
  return (
    <div className={cn("flex items-center gap-2 min-w-[90px]", className)}>
      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", bg)} style={{ width: `${Math.max(2, score)}%` }} />
      </div>
      <span className="text-xs font-semibold tabular-nums w-7 text-right">{score}</span>
    </div>
  );
}