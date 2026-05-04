/**
 * crmStore.tsx — Hybrid CRM state layer.
 *
 * In MOCK mode (VITE_USE_MOCK_DATA=true):
 *   Uses the in-memory seed data so the UI works without a backend.
 *
 * In LIVE mode:
 *   Mutations call the API; local state is an optimistic cache that React
 *   Query will eventually reconcile. Components that need server-fresh data
 *   should use the useApi hooks directly.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import type { ActivityEvent, ActivityType, Lead, LeadStatus, NextAction, User, Visit } from "@/types/crm";
import { env } from "@/lib/env";
import { leadsApi } from "@/lib/api/leads";
import { visitsApi } from "@/lib/api/index";
import { activitiesApi } from "@/lib/api/index";

// ── Seed helpers ──────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();
const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString();
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600000).toISOString();
const hoursAhead = (h: number) => new Date(Date.now() + h * 3600000).toISOString();

const seedUsers: User[] = [
  { id: "u1", name: "Aarav Sharma",  role: "admin", avatarColor: "bg-stage-new" },
  { id: "u2", name: "Priya Patel",   role: "agent", avatarColor: "bg-stage-contacted" },
  { id: "u3", name: "Rohan Mehta",   role: "agent", avatarColor: "bg-stage-interested" },
  { id: "u4", name: "Sneha Iyer",    role: "agent", avatarColor: "bg-stage-visit" },
  { id: "u5", name: "Devansh Rao",   role: "agent", avatarColor: "bg-stage-closed" },
];

const seedLeads: Lead[] = [
  { id: "l1",  name: "Karthik Reddy",   phone: "+91 98765 43210", email: "karthik@example.com",  source: "Website",      status: "New",             assignedTo: "u2", createdAt: hoursAgo(6),  score: 72, budget: 12000, preferredLocation: "HSR Layout",    lastActivityAt: hoursAgo(2),  nextAction: { type: "call",      dueAt: hoursAhead(3),  note: "Intro call" } },
  { id: "l2",  name: "Ananya Singh",    phone: "+91 99887 12345", email: "ananya@example.com",   source: "Referral",     status: "Contacted",       assignedTo: "u3", createdAt: daysAgo(3),   score: 84, budget: 18000, preferredLocation: "Indiranagar",   lastActivityAt: hoursAgo(8),  nextAction: { type: "follow-up", dueAt: hoursAhead(20) } },
  { id: "l3",  name: "Vikram Joshi",    phone: "+91 91234 56789", email: "vikram@example.com",   source: "Walk-in",      status: "Interested",      assignedTo: "u4", createdAt: daysAgo(5),   score: 91, budget: 22000, preferredLocation: "Koramangala",   lastActivityAt: hoursAgo(14), nextAction: { type: "visit",     dueAt: hoursAhead(48), note: "Show 1BHK" } },
  { id: "l4",  name: "Meera Nair",      phone: "+91 90909 80808", email: "meera@example.com",    source: "Social Media", status: "Visit Scheduled", assignedTo: "u2", createdAt: daysAgo(7),   score: 88, budget: 15000, preferredLocation: "Whitefield",    lastActivityAt: hoursAgo(20), nextAction: { type: "visit",     dueAt: hoursAhead(20), note: "Twin sharing tour" } },
  { id: "l5",  name: "Arjun Desai",     phone: "+91 93456 78901", email: "arjun@example.com",    source: "Phone Call",   status: "Closed",          assignedTo: "u3", createdAt: daysAgo(10),  score: 96, budget: 20000, preferredLocation: "BTM Layout",    lastActivityAt: daysAgo(1) },
  { id: "l6",  name: "Ishita Verma",    phone: "+91 97777 12345", email: "ishita@example.com",   source: "Website",      status: "New",             assignedTo: null, createdAt: hoursAgo(2),  score: 45, budget: 10000, preferredLocation: "Marathahalli",  lastActivityAt: hoursAgo(2),  nextAction: { type: "call",      dueAt: hoursAhead(2) } },
  { id: "l7",  name: "Sahil Kapoor",    phone: "+91 98123 45678", email: "sahil@example.com",    source: "Referral",     status: "Contacted",       assignedTo: "u4", createdAt: daysAgo(2),   score: 67, budget: 14000, preferredLocation: "Electronic City", lastActivityAt: hoursAgo(30), nextAction: { type: "send-info", dueAt: hoursAhead(6) } },
  { id: "l8",  name: "Divya Menon",     phone: "+91 99000 11122", email: "divya@example.com",    source: "Website",      status: "Interested",      assignedTo: "u2", createdAt: daysAgo(4),   score: 78, budget: 16000, preferredLocation: "JP Nagar",      lastActivityAt: hoursAgo(5),  nextAction: { type: "follow-up", dueAt: hoursAhead(36) } },
  { id: "l9",  name: "Rahul Bose",      phone: "+91 98765 11122", email: "rahul@example.com",    source: "Website",      status: "New",             assignedTo: "u5", createdAt: hoursAgo(1),  score: 58, budget: 11000, preferredLocation: "HSR Layout",    lastActivityAt: hoursAgo(1),  nextAction: { type: "call",      dueAt: hoursAhead(1) } },
  { id: "l10", name: "Neha Agarwal",    phone: "+91 90000 22233", email: "neha@example.com",     source: "Referral",     status: "Visit Scheduled", assignedTo: "u3", createdAt: daysAgo(6),   score: 82, budget: 17000, preferredLocation: "Indiranagar",   lastActivityAt: hoursAgo(10), nextAction: { type: "visit",     dueAt: hoursAhead(8),  note: "Single room visit" } },
  { id: "l11", name: "Manish Gupta",    phone: "+91 93333 44455", email: "manish@example.com",   source: "Walk-in",      status: "Interested",      assignedTo: "u4", createdAt: daysAgo(8),   score: 70, budget: 13000, preferredLocation: "Koramangala",   lastActivityAt: hoursAgo(40), nextAction: { type: "follow-up", dueAt: hoursAhead(24) } },
  { id: "l12", name: "Sara Khan",       phone: "+91 95555 66677", email: "sara@example.com",     source: "Social Media", status: "Closed",          assignedTo: "u5", createdAt: daysAgo(12),  score: 94, budget: 25000, preferredLocation: "Whitefield",    lastActivityAt: daysAgo(2) },
  { id: "l13", name: "Aditya Pillai",   phone: "+91 96666 77788", email: "aditya@example.com",   source: "Phone Call",   status: "New",             assignedTo: "u2", createdAt: hoursAgo(4),  score: 51, budget: 9000,  preferredLocation: "BTM Layout",    lastActivityAt: hoursAgo(4),  nextAction: { type: "call",      dueAt: hoursAhead(4) } },
  { id: "l14", name: "Pooja Saxena",    phone: "+91 97000 88899", email: "pooja@example.com",    source: "Website",      status: "Contacted",       assignedTo: "u3", createdAt: daysAgo(1),   score: 76, budget: 16500, preferredLocation: "JP Nagar",      lastActivityAt: hoursAgo(12), nextAction: { type: "follow-up", dueAt: hoursAhead(18) } },
];

const seedVisits: Visit[] = [
  { id: "v1", leadId: "l4",  scheduledAt: hoursAhead(20), notes: "Show twin-sharing room on 2nd floor" },
  { id: "v2", leadId: "l10", scheduledAt: hoursAhead(8),  notes: "Single occupancy, top floor" },
  { id: "v3", leadId: "l3",  scheduledAt: hoursAhead(48), notes: "Prefers single occupancy" },
  { id: "v4", leadId: "l8",  scheduledAt: hoursAhead(72) },
];

const seedActivity: ActivityEvent[] = [
  ...seedLeads.map((l): ActivityEvent => ({ id: uid(), leadId: l.id, type: "lead_created", message: `Lead ${l.name} was created`, createdAt: l.createdAt })),
  ...seedLeads.filter((l) => l.assignedTo).map((l): ActivityEvent => ({ id: uid(), leadId: l.id, type: "assigned", message: `Assigned to ${seedUsers.find((u) => u.id === l.assignedTo)?.name ?? "agent"}`, createdAt: l.createdAt })),
  ...seedVisits.map((v): ActivityEvent => ({ id: uid(), leadId: v.leadId, type: "visit_scheduled", message: `Visit scheduled for ${new Date(v.scheduledAt).toLocaleString()}`, createdAt: hoursAgo(2) })),
];

// ── Context interface ─────────────────────────────────────────────────────────

interface CrmContextValue {
  users: User[];
  leads: Lead[];
  visits: Visit[];
  activity: ActivityEvent[];
  currentUserId: string;
  isLoading: boolean;
  addLead: (data: Omit<Lead, "id" | "createdAt" | "lastActivityAt">) => Promise<Lead>;
  updateLead: (id: string, patch: Partial<Lead>) => Promise<void>;
  setLeadStatus: (id: string, status: LeadStatus) => Promise<void>;
  assignLead: (id: string, userId: string | null) => Promise<void>;
  scheduleVisit: (leadId: string, scheduledAt: string, notes?: string) => Promise<Visit>;
  addNote: (leadId: string, note: string) => Promise<void>;
  setNextAction: (leadId: string, action: NextAction | undefined) => void;
  deleteLead: (leadId: string) => Promise<void>;
  getUser: (id: string | null | undefined) => User | undefined;
  getLeadActivity: (leadId: string) => ActivityEvent[];
}

const CrmContext = createContext<CrmContextValue | null>(null);

// ── Helpers to adapt API response → local Lead shape ─────────────────────────

function apiLeadToLocal(apiLead: Record<string, unknown>): Lead {
  const na = apiLead.next_action as { type: string; due_at: string; note?: string } | null;
  return {
    id: String(apiLead.id),
    name: String(apiLead.name),
    phone: String(apiLead.phone),
    email: String(apiLead.email),
    source: apiLead.source as Lead["source"],
    status: apiLead.status as LeadStatus,
    assignedTo: (apiLead.assigned_to as string | null) ?? null,
    notes: apiLead.notes as string | undefined,
    createdAt: String(apiLead.created_at),
    score: Number(apiLead.score),
    budget: apiLead.budget as number | undefined,
    preferredLocation: apiLead.preferred_location as string | undefined,
    lastActivityAt: String(apiLead.last_activity_at),
    nextAction: na
      ? { type: na.type as Lead["nextAction"]["type"], dueAt: na.due_at, note: na.note }
      : undefined,
  };
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function CrmProvider({ children }: { children: ReactNode }) {
  const [users] = useState<User[]>(seedUsers);
  const [leads, setLeads] = useState<Lead[]>(env.USE_MOCK_DATA ? seedLeads : []);
  const [visits, setVisits] = useState<Visit[]>(env.USE_MOCK_DATA ? seedVisits : []);
  const [activity, setActivity] = useState<ActivityEvent[]>(env.USE_MOCK_DATA ? seedActivity : []);
  const [isLoading, setIsLoading] = useState(false);
  const currentUserId = "u1";

  // ── If live mode: load leads & visits on mount ────────────────────────────
  useEffect(() => {
    if (env.USE_MOCK_DATA) return;
    setIsLoading(true);
    Promise.allSettled([
      leadsApi.list({ page_size: 100 }),
      visitsApi.list(),
    ]).then(([leadsRes, visitsRes]) => {
      if (leadsRes.status === "fulfilled") {
        setLeads(leadsRes.value.items.map(apiLeadToLocal));
      }
      if (visitsRes.status === "fulfilled") {
        setVisits(
          visitsRes.value.map((v) => ({
            id: v.id,
            leadId: v.lead_id,
            scheduledAt: v.scheduled_at,
            notes: v.notes ?? undefined,
          })),
        );
      }
    }).finally(() => setIsLoading(false));
  }, []);

  // Tick to refresh "time ago" displays every minute
  const [, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(i);
  }, []);

  const pushActivity = useCallback((leadId: string, type: ActivityType, message: string) => {
    setActivity((prev) => [
      { id: uid(), leadId, type, message, createdAt: now(), actorId: currentUserId },
      ...prev,
    ]);
  }, []);

  const touch = (lead: Lead): Lead => ({ ...lead, lastActivityAt: now() });

  // ── addLead ───────────────────────────────────────────────────────────────
  const addLead = useCallback(async (data: Omit<Lead, "id" | "createdAt" | "lastActivityAt">): Promise<Lead> => {
    if (env.USE_MOCK_DATA) {
      const lead: Lead = { ...data, id: uid(), createdAt: now(), lastActivityAt: now() };
      setLeads((p) => [lead, ...p]);
      pushActivity(lead.id, "lead_created", `Lead ${lead.name} was created`);
      if (lead.assignedTo) {
        const u = seedUsers.find((x) => x.id === lead.assignedTo);
        pushActivity(lead.id, "assigned", `Assigned to ${u?.name ?? "agent"}`);
      }
      return lead;
    }
    const resp = await leadsApi.create({
      name: data.name, phone: data.phone, email: data.email,
      source: data.source, status: data.status,
      assigned_to: data.assignedTo ?? null,
      notes: data.notes,
      score: data.score,
      budget: data.budget,
      preferred_location: data.preferredLocation,
    });
    const lead = apiLeadToLocal(resp as unknown as Record<string, unknown>);
    setLeads((p) => [lead, ...p]);
    pushActivity(lead.id, "lead_created", `Lead ${lead.name} was created`);
    return lead;
  }, [pushActivity]);

  // ── updateLead ─────────────────────────────────────────────────────────────
  const updateLead = useCallback(async (id: string, patch: Partial<Lead>) => {
    if (env.USE_MOCK_DATA) {
      setLeads((prev) => {
        const old = prev.find((l) => l.id === id);
        if (!old) return prev;
        const next = touch({ ...old, ...patch });
        if (patch.status && patch.status !== old.status)
          pushActivity(id, "status_changed", `Status changed: ${old.status} → ${patch.status}`);
        if (patch.assignedTo !== undefined && patch.assignedTo !== old.assignedTo) {
          const u = seedUsers.find((x) => x.id === patch.assignedTo);
          pushActivity(id, "assigned", `Assigned to ${u?.name ?? "Unassigned"}`);
        }
        return prev.map((l) => (l.id === id ? next : l));
      });
      return;
    }
    const apiPatch: Record<string, unknown> = {};
    if (patch.name !== undefined) apiPatch.name = patch.name;
    if (patch.phone !== undefined) apiPatch.phone = patch.phone;
    if (patch.email !== undefined) apiPatch.email = patch.email;
    if (patch.source !== undefined) apiPatch.source = patch.source;
    if (patch.status !== undefined) apiPatch.status = patch.status;
    if (patch.assignedTo !== undefined) apiPatch.assigned_to = patch.assignedTo;
    if (patch.notes !== undefined) apiPatch.notes = patch.notes;
    if (patch.score !== undefined) apiPatch.score = patch.score;
    if (patch.budget !== undefined) apiPatch.budget = patch.budget;
    if (patch.preferredLocation !== undefined) apiPatch.preferred_location = patch.preferredLocation;
    const resp = await leadsApi.update(id, apiPatch);
    const updated = apiLeadToLocal(resp as unknown as Record<string, unknown>);
    setLeads((prev) => prev.map((l) => (l.id === id ? updated : l)));
    if (patch.status) pushActivity(id, "status_changed", `Status changed to ${patch.status}`);
    if (patch.assignedTo !== undefined) {
      const u = users.find((x) => x.id === patch.assignedTo) ?? seedUsers.find((x) => x.id === patch.assignedTo);
      pushActivity(id, "assigned", `Assigned to ${u?.name ?? "Unassigned"}`);
    }
  }, [pushActivity, users]);

  const setLeadStatus = useCallback(async (id: string, status: LeadStatus) => {
    await updateLead(id, { status });
  }, [updateLead]);

  const assignLead = useCallback(async (id: string, userId: string | null) => {
    await updateLead(id, { assignedTo: userId });
  }, [updateLead]);

  // ── scheduleVisit ──────────────────────────────────────────────────────────
  const scheduleVisit = useCallback(async (leadId: string, scheduledAt: string, notes?: string): Promise<Visit> => {
    if (env.USE_MOCK_DATA) {
      const visit: Visit = { id: uid(), leadId, scheduledAt, notes };
      setVisits((p) => [visit, ...p]);
      setLeads((prev) => prev.map((l) => l.id === leadId ? touch({ ...l, status: "Visit Scheduled", nextAction: { type: "visit", dueAt: scheduledAt, note: notes } }) : l));
      pushActivity(leadId, "visit_scheduled", `Visit scheduled for ${new Date(scheduledAt).toLocaleString()}`);
      return visit;
    }
    const resp = await visitsApi.create({ lead_id: leadId, scheduled_at: scheduledAt, notes });
    const visit: Visit = { id: resp.id, leadId: resp.lead_id, scheduledAt: resp.scheduled_at, notes: resp.notes ?? undefined };
    setVisits((p) => [visit, ...p]);
    setLeads((prev) => prev.map((l) => l.id === leadId ? touch({ ...l, status: "Visit Scheduled", nextAction: { type: "visit", dueAt: scheduledAt, note: notes } }) : l));
    pushActivity(leadId, "visit_scheduled", `Visit scheduled for ${new Date(scheduledAt).toLocaleString()}`);
    return visit;
  }, [pushActivity]);

  // ── addNote ────────────────────────────────────────────────────────────────
  const addNote = useCallback(async (leadId: string, note: string) => {
    setLeads((prev) => prev.map((l) => l.id === leadId ? touch({ ...l, notes: note }) : l));
    pushActivity(leadId, "note_added", "Note updated");
    if (!env.USE_MOCK_DATA) {
      await leadsApi.update(leadId, { notes: note }).catch(() => {
        toast.error("Failed to save note to server");
      });
    }
  }, [pushActivity]);

  // ── setNextAction — optimistic only ───────────────────────────────────────
  const setNextAction = useCallback((leadId: string, action: NextAction | undefined) => {
    setLeads((prev) => prev.map((l) => l.id === leadId ? touch({ ...l, nextAction: action }) : l));
  }, []);

  // ── deleteLead ─────────────────────────────────────────────────────────────
  const deleteLead = useCallback(async (leadId: string) => {
    if (!env.USE_MOCK_DATA) {
      await leadsApi.delete(leadId);
    }
    setLeads((prev) => prev.filter((l) => l.id !== leadId));
    setVisits((prev) => prev.filter((v) => v.leadId !== leadId));
    setActivity((prev) => prev.filter((a) => a.leadId !== leadId));
  }, []);

  const getUser = useCallback((id: string | null | undefined) => users.find((u) => u.id === id), [users]);

  const getLeadActivity = useCallback(
    (leadId: string) => activity.filter((a) => a.leadId === leadId).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [activity],
  );

  const value = useMemo<CrmContextValue>(
    () => ({
      users, leads, visits, activity, currentUserId, isLoading,
      addLead, updateLead, setLeadStatus, assignLead, scheduleVisit, addNote, setNextAction, deleteLead, getUser, getLeadActivity,
    }),
    [users, leads, visits, activity, isLoading, addLead, updateLead, setLeadStatus, assignLead, scheduleVisit, addNote, setNextAction, deleteLead, getUser, getLeadActivity],
  );

  return <CrmContext.Provider value={value}>{children}</CrmContext.Provider>;
}

export function useCrm() {
  const ctx = useContext(CrmContext);
  if (!ctx) throw new Error("useCrm must be used within CrmProvider");
  return ctx;
}
