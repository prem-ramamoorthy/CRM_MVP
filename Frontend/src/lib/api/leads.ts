import { apiClient } from "@/lib/apiClient";
import type { LeadStatus, LeadSource, NextActionType } from "@/types/crm";

// ── Shared types ──────────────────────────────────────────────────────────────

export interface NextActionDto {
  type: NextActionType;
  due_at: string; // ISO
  note?: string | null;
}

export interface LeadListOut {
  id: string;
  name: string;
  phone: string;
  email: string;
  source: LeadSource;
  status: LeadStatus;
  assigned_to: string | null;
  assigned_user?: { id: string; name: string; role: string; avatar_color: string } | null;
  score: number;
  budget: number | null;
  preferred_location: string | null;
  last_activity_at: string;
  created_at: string;
  next_action?: NextActionDto | null;
  sla_breached: boolean;
}

export interface LeadOut extends LeadListOut {
  notes: string | null;
  updated_at: string;
}

export interface LeadCreatePayload {
  name: string;
  phone: string;
  email: string;
  source: LeadSource;
  status?: LeadStatus;
  assigned_to?: string | null;
  notes?: string;
  score?: number;
  budget?: number | null;
  preferred_location?: string;
  next_action?: NextActionDto | null;
}

export type LeadUpdatePayload = Partial<LeadCreatePayload>;

export interface PaginatedLeads {
  items: LeadListOut[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface LeadFilters {
  status?: LeadStatus;
  assigned_to?: string;
  search?: string;
  overdue?: boolean;
  hot?: boolean;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
  page?: number;
  page_size?: number;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export const leadsApi = {
  list: async (filters: LeadFilters = {}): Promise<PaginatedLeads> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
    });
    const { data } = await apiClient.get<PaginatedLeads>(`/leads?${params}`);
    return data;
  },

  get: async (id: string): Promise<LeadOut> => {
    const { data } = await apiClient.get<LeadOut>(`/leads/${id}`);
    return data;
  },

  create: async (payload: LeadCreatePayload): Promise<LeadOut> => {
    const { data } = await apiClient.post<LeadOut>("/leads", payload);
    return data;
  },

  update: async (id: string, payload: LeadUpdatePayload): Promise<LeadOut> => {
    const { data } = await apiClient.put<LeadOut>(`/leads/${id}`, payload);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/leads/${id}`);
  },

  assign: async (id: string, userId: string | null): Promise<LeadOut> => {
    const { data } = await apiClient.patch<LeadOut>(`/leads/${id}/assign`, {
      user_id: userId,
    });
    return data;
  },

  bulkAssign: async (leadIds: string[], userId: string | null): Promise<{ message: string }> => {
    const { data } = await apiClient.post("/leads/bulk/assign", {
      lead_ids: leadIds,
      user_id: userId,
    });
    return data;
  },

  bulkStatus: async (leadIds: string[], status: LeadStatus): Promise<{ message: string }> => {
    const { data } = await apiClient.post("/leads/bulk/status", {
      lead_ids: leadIds,
      status,
    });
    return data;
  },
};
