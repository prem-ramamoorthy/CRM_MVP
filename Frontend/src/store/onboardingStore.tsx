import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type ChecklistStep = "addLead" | "assignLead" | "moveLead" | "scheduleVisit";
export const CHECKLIST_STEPS: { id: ChecklistStep; label: string; hint: string }[] = [
  { id: "addLead",       label: "Add your first lead",        hint: "Click Add lead on the Leads page." },
  { id: "assignLead",    label: "Assign a lead to an agent",  hint: "Pick an agent from the assignment dropdown." },
  { id: "moveLead",      label: "Move a lead in the pipeline", hint: "Drag a card across stages on the Pipeline." },
  { id: "scheduleVisit", label: "Schedule a property visit",   hint: "Open a lead and click Schedule visit." },
];

const KEY_DONE = "nestcrm.onboarding.done.v1";
const KEY_TOUR = "nestcrm.onboarding.tourSeen.v1";
const KEY_TIPS = "nestcrm.onboarding.tipsSeen.v1";

interface OnboardingValue {
  done: Record<ChecklistStep, boolean>;
  completedCount: number;
  totalSteps: number;
  markDone: (s: ChecklistStep) => void;
  resetChecklist: () => void;

  tourActive: boolean;
  tourStep: number;
  startTour: () => void;
  endTour: () => void;
  nextStep: () => void;
  prevStep: () => void;

  tipSeen: (id: string) => boolean;
  markTipSeen: (id: string) => void;
  resetTips: () => void;
}

const Ctx = createContext<OnboardingValue | null>(null);

function load<T>(k: string, fb: T): T {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) as T : fb; } catch { return fb; }
}
function save<T>(k: string, v: T) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* noop */ } }

export const TOUR_STEP_COUNT = 4;

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [done, setDone] = useState<Record<ChecklistStep, boolean>>(() =>
    load(KEY_DONE, { addLead: false, assignLead: false, moveLead: false, scheduleVisit: false }),
  );
  const [tips, setTips] = useState<Record<string, boolean>>(() => load(KEY_TIPS, {}));
  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  // Auto-start tour for first time visitors
  useEffect(() => {
    const seen = load<boolean>(KEY_TOUR, false);
    if (!seen) {
      const t = setTimeout(() => setTourActive(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => save(KEY_DONE, done), [done]);
  useEffect(() => save(KEY_TIPS, tips), [tips]);

  const markDone = useCallback((s: ChecklistStep) => {
    setDone((prev) => (prev[s] ? prev : { ...prev, [s]: true }));
  }, []);

  const resetChecklist = useCallback(() => {
    setDone({ addLead: false, assignLead: false, moveLead: false, scheduleVisit: false });
  }, []);

  const startTour = useCallback(() => { setTourStep(0); setTourActive(true); }, []);
  const endTour = useCallback(() => { setTourActive(false); save(KEY_TOUR, true); }, []);
  const nextStep = useCallback(() => {
    setTourStep((s) => {
      if (s + 1 >= TOUR_STEP_COUNT) { setTourActive(false); save(KEY_TOUR, true); return s; }
      return s + 1;
    });
  }, []);
  const prevStep = useCallback(() => setTourStep((s) => Math.max(0, s - 1)), []);

  const tipSeen = useCallback((id: string) => !!tips[id], [tips]);
  const markTipSeen = useCallback((id: string) => setTips((p) => (p[id] ? p : { ...p, [id]: true })), []);
  const resetTips = useCallback(() => setTips({}), []);

  const completedCount = Object.values(done).filter(Boolean).length;

  const value = useMemo<OnboardingValue>(() => ({
    done, completedCount, totalSteps: CHECKLIST_STEPS.length,
    markDone, resetChecklist,
    tourActive, tourStep, startTour, endTour, nextStep, prevStep,
    tipSeen, markTipSeen, resetTips,
  }), [done, completedCount, markDone, resetChecklist, tourActive, tourStep, startTour, endTour, nextStep, prevStep, tipSeen, markTipSeen, resetTips]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOnboarding() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useOnboarding must be used within OnboardingProvider");
  return v;
}