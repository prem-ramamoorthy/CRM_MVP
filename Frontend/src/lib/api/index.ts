import { apiClient } from "@/lib/apiClient";

// ── Dashboard ─────────────────────────────────────────────────────────────────

export interface MetricsOut {
  total_leads: number;
  leads_today: number;
  visits_today: number;
  visits_scheduled: number;
  closed: number;
  conversion_rate: number;
  hot_leads: number;
  overdue_leads: number;
}

export interface FunnelStage {
  status: string;
  count: number;
  percentage: number;
}

export interface FunnelOut {
  stages: FunnelStage[];
  total: number;
}

export interface AgentPerformance {
  agent_id: string;
  agent_name: string;
  total: number;
  closed: number;
  conversion_rate: number;
}

export interface ActivitySummaryOut {
  recent_activity_count: number;
  by_type: Record<string, number>;
  agent_performance: AgentPerformance[];
}

export const dashboardApi = {
  metrics: async (): Promise<MetricsOut> => {
    const { data } = await apiClient.get<MetricsOut>("/dashboard/metrics");
    return data;
  },
  funnel: async (): Promise<FunnelOut> => {
    const { data } = await apiClient.get<FunnelOut>("/dashboard/funnel");
    return data;
  },
  activitySummary: async (): Promise<ActivitySummaryOut> => {
    const { data } = await apiClient.get<ActivitySummaryOut>("/dashboard/activity");
    return data;
  },
};

// ── Visits ────────────────────────────────────────────────────────────────────

export interface VisitOut {
  id: string;
  lead_id: string;
  lead_name?: string;
  lead_phone?: string;
  scheduled_at: string;
  notes?: string | null;
  created_at: string;
}

export const visitsApi = {
  list: async (leadId?: string): Promise<VisitOut[]> => {
    const params = leadId ? `?lead_id=${leadId}` : "";
    const { data } = await apiClient.get<VisitOut[]>(`/visits${params}`);
    return data;
  },
  upcoming: async (): Promise<VisitOut[]> => {
    const { data } = await apiClient.get<VisitOut[]>("/visits/upcoming");
    return data;
  },
  create: async (payload: { lead_id: string; scheduled_at: string; notes?: string }): Promise<VisitOut> => {
    const { data } = await apiClient.post<VisitOut>("/visits", payload);
    return data;
  },
};

// ── Activities ────────────────────────────────────────────────────────────────

export interface ActivityOut {
  id: string;
  lead_id: string;
  type: string;
  message: string;
  meta?: Record<string, string | null> | null;
  created_at: string;
  actor_id?: string | null;
}

export const activitiesApi = {
  forLead: async (leadId: string): Promise<ActivityOut[]> => {
    const { data } = await apiClient.get<ActivityOut[]>(`/activities/${leadId}`);
    return data;
  },
  create: async (payload: {
    lead_id: string;
    type: string;
    message: string;
    meta?: Record<string, string | null>;
  }): Promise<ActivityOut> => {
    const { data } = await apiClient.post<ActivityOut>("/activities", payload);
    return data;
  },
};

// ── Users ─────────────────────────────────────────────────────────────────────

export interface UserOut {
  id: string;
  name: string;
  email: string;
  role: "admin" | "agent";
  avatar_color: string;
  is_active: boolean;
  created_at: string;
}

export const usersApi = {
  list: async (): Promise<UserOut[]> => {
    const { data } = await apiClient.get<UserOut[]>("/users");
    return data;
  },
  get: async (id: string): Promise<UserOut> => {
    const { data } = await apiClient.get<UserOut>(`/users/${id}`);
    return data;
  },
  update: async (
    id: string,
    payload: { name?: string; email?: string; avatar_color?: string; role?: string },
  ): Promise<UserOut> => {
    const { data } = await apiClient.put<UserOut>(`/users/${id}`, payload);
    return data;
  },
  deactivate: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },
};
