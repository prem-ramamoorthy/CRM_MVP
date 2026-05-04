import { useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, Circle, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useOnboarding, CHECKLIST_STEPS } from "@/store/onboardingStore";
import { cn } from "@/lib/utils";

export function QuickStartChecklist() {
  const { done, completedCount, totalSteps, startTour } = useOnboarding();
  const [open, setOpen] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const pct = Math.round((completedCount / totalSteps) * 100);

  // Auto-collapse when complete
  useEffect(() => { if (completedCount === totalSteps) setOpen(false); }, [completedCount, totalSteps]);

  if (dismissed) return null;

  return (
    <Card className="shadow-elegant-sm overflow-hidden border-primary/20 bg-gradient-to-br from-card to-primary/[0.03]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-lg bg-gradient-primary text-primary-foreground inline-flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm">Quick start</p>
            <p className="text-xs text-muted-foreground">
              {completedCount === totalSteps ? "All set — you're a CRM pro 🎉" : `${completedCount} of ${totalSteps} complete`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:block w-32 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-gradient-primary transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs tabular-nums text-muted-foreground w-9 text-right">{pct}%</span>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </div>
      </button>

      {open && (
        <CardContent className="pt-0 pb-4 animate-fade-in">
          <ul className="divide-y border-t">
            {CHECKLIST_STEPS.map((step) => {
              const isDone = done[step.id];
              return (
                <li key={step.id} className="flex items-start gap-3 py-3">
                  {isDone ? (
                    <CheckCircle2 className="h-5 w-5 text-success mt-0.5 shrink-0 animate-scale-in" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground/40 mt-0.5 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm font-medium", isDone && "line-through text-muted-foreground")}>{step.label}</p>
                    {!isDone && <p className="text-xs text-muted-foreground mt-0.5">{step.hint}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-between gap-2 mt-3">
            <Button variant="ghost" size="sm" onClick={() => setDismissed(true)}>Dismiss</Button>
            <Button variant="outline" size="sm" onClick={startTour}>Replay tour</Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}