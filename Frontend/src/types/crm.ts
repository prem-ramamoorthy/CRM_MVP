export type LeadStatus =
  | "New"
  | "Contacted"
  | "Interested"
  | "Visit Scheduled"
  | "Closed";

export const LEAD_STATUSES: LeadStatus[] = [
  "New",
  "Contacted",
  "Interested",
  "Visit Scheduled",
  "Closed",
];

export type LeadSource =
  | "Website"
  | "Referral"
  | "Walk-in"
  | "Social Media"
  | "Phone Call"
  | "Other";

export const LEAD_SOURCES: LeadSource[] = [
  "Website",
  "Referral",
  "Walk-in",
  "Social Media",
  "Phone Call",
  "Other",
];

export interface User {
  id: string;
  name: string;
  role: "admin" | "agent";
  avatarColor: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  source: LeadSource;
  status: LeadStatus;
  assignedTo: string | null; // user id
  notes?: string;
  createdAt: string; // ISO
  score: number; // 0-100
  budget?: number; // monthly rent budget INR
  preferredLocation?: string;
  lastActivityAt: string; // ISO
  nextAction?: NextAction;
}

export type NextActionType = "call" | "visit" | "follow-up" | "send-info";

export interface NextAction {
  type: NextActionType;
  dueAt: string; // ISO
  note?: string;
}

export interface Visit {
  id: string;
  leadId: string;
  scheduledAt: string; // ISO
  notes?: string;
}

export type ActivityType =
  | "lead_created"
  | "status_changed"
  | "assigned"
  | "visit_scheduled"
  | "note_added";

export interface ActivityEvent {
  id: string;
  leadId: string;
  type: ActivityType;
  message: string;
  meta?: Record<string, string | null>;
  createdAt: string; // ISO
  actorId?: string;
}