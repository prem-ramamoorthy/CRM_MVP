import { useState } from "react";
import { HelpCircle, KanbanSquare, LayoutDashboard, Play, RotateCcw, Users } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/store/onboardingStore";
import { toast } from "sonner";

export function HelpButton() {
  const { startTour, resetChecklist, resetTips } = useOnboarding();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-elegant-lg bg-gradient-primary text-primary-foreground hover:scale-105 transition-transform"
          aria-label="Help"
        >
          <HelpCircle className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-80 p-0">
        <div className="p-4 border-b">
          <p className="font-semibold">Need a hand?</p>
          <p className="text-xs text-muted-foreground mt-0.5">Quick tips to get the most out of NestCRM.</p>
        </div>
        <ul className="p-2 text-sm">
          <Tip icon={LayoutDashboard} title="Dashboard" body="Track KPIs, hot leads and upcoming visits." />
          <Tip icon={Users}            title="Leads"     body="Search, filter, sort. Click a row to view full detail." />
          <Tip icon={KanbanSquare}     title="Pipeline"  body="Drag cards across columns to update status." />
        </ul>
        <div className="p-3 border-t flex flex-col gap-1.5">
          <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => { setOpen(false); startTour(); }}>
            <Play className="h-3.5 w-3.5 mr-2" /> Replay product tour
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={() => { resetChecklist(); resetTips(); toast.success("Onboarding reset"); }}>
            <RotateCcw className="h-3.5 w-3.5 mr-2" /> Reset onboarding
          </Button>
        </div>
        <div className="px-4 py-2 border-t text-[10px] text-muted-foreground">
          Pro tip: hover the <kbd className="px-1.5 py-0.5 rounded bg-muted text-foreground">score</kbd> bar or <kbd className="px-1.5 py-0.5 rounded bg-muted text-foreground">next action</kbd> pill to see details.
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Tip({ icon: Icon, title, body }: { icon: React.ElementType; title: string; body: string }) {
  return (
    <li className="flex items-start gap-3 px-2 py-2 rounded-md hover:bg-muted/40">
      <div className="h-7 w-7 rounded-md bg-primary/10 text-primary inline-flex items-center justify-center shrink-0">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0">
        <p className="font-medium text-sm leading-tight">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{body}</p>
      </div>
    </li>
  );
}