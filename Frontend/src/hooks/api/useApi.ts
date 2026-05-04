/**
 * useApi.ts — React Query hooks for all backend endpoints.
 *
 * Exports:
 *   useLeads, useLead, useCreateLead, useUpdateLead, useDeleteLead, useAssignLead
 *   useVisits, useUpcomingVisits, useCreateVisit
 *   useActivities, useCreateActivity
 *   useUsers
 *   useDashboardMetrics, useDashboardFunnel, useDashboardActivitySummary
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { leadsApi, type LeadFilters, type LeadCreatePayload, type LeadUpdatePayload } from "@/lib/api/leads";
import { visitsApi, activitiesApi, usersApi, dashboardApi } from "@/lib/api/index";
import { env } from "@/lib/env";
import type { LeadStatus } from "@/types/crm";

// ── Query keys factory ────────────────────────────────────────────────────────

export const qk = {
  leads: (filters?: LeadFilters) => ["leads", filters ?? {}] as const,
  lead: (id: string) => ["lead", id] as const,
  visits: (leadId?: string) => ["visits", leadId ?? "all"] as const,
  upcomingVisits: () => ["visits", "upcoming"] as const,
  activities: (leadId: string) => ["activities", leadId] as const,
  users: () => ["users"] as const,
  metrics: () => ["dashboard", "metrics"] as const,
  funnel: () => ["dashboard", "funnel"] as const,
  activitySummary: () => ["dashboard", "activity"] as const,
} as const;

const DISABLED = env.USE_MOCK_DATA;

// ── Leads ─────────────────────────────────────────────────────────────────────

export function useLeads(filters: LeadFilters = {}) {
  return useQuery({
    queryKey: qk.leads(filters),
    queryFn: () => leadsApi.list(filters),
    enabled: !DISABLED,
    staleTime: 30_000,
  });
}

export function useLead(id: string, options?: Partial<UseQueryOptions>) {
  return useQuery({
    queryKey: qk.lead(id),
    queryFn: () => leadsApi.get(id),
    enabled: !DISABLED && !!id,
    staleTime: 30_000,
    ...(options as object),
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: LeadCreatePayload) => leadsApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err: unknown) => {
      const msg = (err as { message?: string })?.message ?? "Failed to create lead";
      toast.error(msg);
    },
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: LeadUpdatePayload }) =>
      leadsApi.update(id, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.setQueryData(qk.lead(data.id), data);
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err: unknown) => {
      const msg = (err as { message?: string })?.message ?? "Failed to update lead";
      toast.error(msg);
    },
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => leadsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err: unknown) => {
      const msg = (err as { message?: string })?.message ?? "Failed to delete lead";
      toast.error(msg);
    },
  });
}

export function useAssignLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string | null }) =>
      leadsApi.assign(id, userId),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.setQueryData(qk.lead(data.id), data);
    },
  });
}

export function useSetLeadStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: LeadStatus }) =>
      leadsApi.update(id, { status }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.setQueryData(qk.lead(data.id), data);
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

// ── Visits ────────────────────────────────────────────────────────────────────

export function useVisits(leadId?: string) {
  return useQuery({
    queryKey: qk.visits(leadId),
    queryFn: () => visitsApi.list(leadId),
    enabled: !DISABLED,
    staleTime: 60_000,
  });
}

export function useUpcomingVisits() {
  return useQuery({
    queryKey: qk.upcomingVisits(),
    queryFn: () => visitsApi.upcoming(),
    enabled: !DISABLED,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000, // refresh every 5 min
  });
}

export function useCreateVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { lead_id: string; scheduled_at: string; notes?: string }) =>
      visitsApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["visits"] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err: unknown) => {
      const msg = (err as { message?: string })?.message ?? "Failed to schedule visit";
      toast.error(msg);
    },
  });
}

// ── Activities ────────────────────────────────────────────────────────────────

export function useActivities(leadId: string) {
  return useQuery({
    queryKey: qk.activities(leadId),
    queryFn: () => activitiesApi.forLead(leadId),
    enabled: !DISABLED && !!leadId,
    staleTime: 30_000,
  });
}

export function useCreateActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      lead_id: string;
      type: string;
      message: string;
      meta?: Record<string, string | null>;
    }) => activitiesApi.create(payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: qk.activities(data.lead_id) });
    },
  });
}

// ── Users ─────────────────────────────────────────────────────────────────────

export function useUsers() {
  return useQuery({
    queryKey: qk.users(),
    queryFn: () => usersApi.list(),
    enabled: !DISABLED,
    staleTime: 5 * 60_000,
  });
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function useDashboardMetrics() {
  return useQuery({
    queryKey: qk.metrics(),
    queryFn: () => dashboardApi.metrics(),
    enabled: !DISABLED,
    staleTime: 60_000,
    refetchInterval: 2 * 60_000,
  });
}

export function useDashboardFunnel() {
  return useQuery({
    queryKey: qk.funnel(),
    queryFn: () => dashboardApi.funnel(),
    enabled: !DISABLED,
    staleTime: 60_000,
  });
}

export function useDashboardActivitySummary() {
  return useQuery({
    queryKey: qk.activitySummary(),
    queryFn: () => dashboardApi.activitySummary(),
    enabled: !DISABLED,
    staleTime: 60_000,
  });
}
