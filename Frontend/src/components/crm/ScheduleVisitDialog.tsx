import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCrm } from "@/store/crmStore";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useOnboarding } from "@/store/onboardingStore";

export function ScheduleVisitDialog({ open, onOpenChange, leadId }: { open: boolean; onOpenChange: (o: boolean) => void; leadId: string }) {
  const { scheduleVisit } = useCrm();
  const { markDone } = useOnboarding();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState("10:00");
  const [notes, setNotes] = useState("");

  const submit = () => {
    if (!date) { toast.error("Pick a date"); return; }
    const [hh, mm] = time.split(":").map(Number);
    const dt = new Date(date);
    dt.setHours(hh || 0, mm || 0, 0, 0);
    scheduleVisit(leadId, dt.toISOString(), notes || undefined);
    markDone("scheduleVisit");
    toast.success("Visit scheduled");
    onOpenChange(false);
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Schedule property visit</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left font-normal", !date && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={setDate} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="time">Time</Label>
            <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Room preferences, budget..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Schedule visit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}