import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useCrm } from "@/store/crmStore";
import { LEAD_SOURCES, LEAD_STATUSES, type Lead, type LeadSource, type LeadStatus } from "@/types/crm";
import { toast } from "sonner";
import { useOnboarding } from "@/store/onboardingStore";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lead?: Lead | null;
}

const empty = {
  name: "",
  phone: "",
  email: "",
  source: "Website" as LeadSource,
  status: "New" as LeadStatus,
  assignedTo: null as string | null,
  notes: "",
  score: 50,
  budget: undefined as number | undefined,
  preferredLocation: "",
};

export function LeadFormDialog({ open, onOpenChange, lead }: Props) {
  const { users, addLead, updateLead } = useCrm();
  const { markDone } = useOnboarding();
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (lead) {
      setForm({
        name: lead.name, phone: lead.phone, email: lead.email,
        source: lead.source, status: lead.status, assignedTo: lead.assignedTo, notes: lead.notes ?? "",
        score: lead.score, budget: lead.budget, preferredLocation: lead.preferredLocation ?? "",
      });
    } else {
      setForm(empty);
    }
  }, [lead, open]);

  const submit = () => {
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Name and phone are required");
      return;
    }
    if (lead) {
      updateLead(lead.id, form);
      toast.success("Lead updated");
      if (form.assignedTo) markDone("assignLead");
    } else {
      addLead({ ...form, nextAction: undefined });
      toast.success("Lead created");
      markDone("addLead");
      if (form.assignedTo) markDone("assignLead");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{lead ? "Edit lead" : "Add new lead"}</DialogTitle>
          <DialogDescription>
            {lead ? "Update the lead details below." : "Capture a new prospect for the PG."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Karthik Reddy" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 ..." />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@example.com" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Source</Label>
              <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v as LeadSource })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAD_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as LeadStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAD_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Assign to</Label>
            <Select value={form.assignedTo ?? "unassigned"} onValueChange={(v) => setForm({ ...form, assignedTo: v === "unassigned" ? null : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name} · {u.role}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="budget">Budget (₹/mo)</Label>
              <Input id="budget" type="number" value={form.budget ?? ""} onChange={(e) => setForm({ ...form, budget: e.target.value ? Number(e.target.value) : undefined })} placeholder="15000" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="loc">Preferred location</Label>
              <Input id="loc" value={form.preferredLocation} onChange={(e) => setForm({ ...form, preferredLocation: e.target.value })} placeholder="Koramangala" />
            </div>
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Lead score</Label>
              <span className="text-sm font-semibold tabular-nums">{form.score}</span>
            </div>
            <Slider value={[form.score]} onValueChange={(v) => setForm({ ...form, score: v[0] })} max={100} step={1} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>{lead ? "Save changes" : "Create lead"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}