import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/store/onboardingStore";

interface Step {
  selector: string;
  title: string;
  body: string;
  route?: string;
  placement?: "bottom" | "top" | "right" | "left";
}

const STEPS: Step[] = [
  {
    selector: "[data-tour='nav-dashboard']",
    title: "Welcome to NestCRM 👋",
    body: "This is your Dashboard — a live overview of leads, conversion, and what needs your attention today.",
    route: "/",
    placement: "right",
  },
  {
    selector: "[data-tour='nav-leads']",
    title: "Manage all your leads",
    body: "The Leads page is your full database. Search, filter, sort, reassign, and update status inline.",
    route: "/leads",
    placement: "right",
  },
  {
    selector: "[data-tour='add-lead']",
    title: "Capture a new prospect",
    body: "Click here anytime to add a new lead. You can capture name, phone, budget, location and more.",
    route: "/leads",
    placement: "bottom",
  },
  {
    selector: "[data-tour='nav-pipeline']",
    title: "Visualize your pipeline",
    body: "Drag leads across stages — New, Contacted, Interested, Visit Scheduled, Closed — to update status instantly.",
    route: "/pipeline",
    placement: "right",
  },
];

export function ProductTour() {
  const { tourActive, tourStep, nextStep, prevStep, endTour } = useOnboarding();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [rect, setRect] = useState<DOMRect | null>(null);

  const step = STEPS[Math.min(tourStep, STEPS.length - 1)];

  // Navigate to needed route per step
  useEffect(() => {
    if (!tourActive || !step?.route) return;
    if (pathname !== step.route) navigate(step.route);
  }, [tourActive, step, pathname, navigate]);

  // Track target rect
  useLayoutEffect(() => {
    if (!tourActive) return;
    let raf = 0;
    const update = () => {
      const el = document.querySelector(step.selector) as HTMLElement | null;
      setRect(el ? el.getBoundingClientRect() : null);
      raf = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(raf);
  }, [tourActive, step]);

  if (!tourActive) return null;

  const pad = 8;
  const r = rect
    ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }
    : null;

  // Tooltip placement (constrained to viewport)
  const GUTTER = 16;
  const isMobile = typeof window !== "undefined" ? window.innerWidth < 768 : false;
  const TOOLTIP_WIDTH = typeof window !== "undefined" ? Math.min(320, window.innerWidth - GUTTER * 2) : 320;
  let tipStyle: React.CSSProperties = { top: "50%", left: "50%", transform: "translate(-50%,-50%)" };
  if (r) {
    const placement = isMobile ? "bottom" : (step.placement ?? "bottom");
    // compute numeric left/top
    let left = r.left;
    let top = r.top;
    let transform: string | undefined;

    if (placement === "bottom") {
      top = r.top + r.height + 12;
      left = r.left + r.width / 2 - TOOLTIP_WIDTH / 2;
    } else if (placement === "top") {
      top = r.top - 12;
      left = r.left + r.width / 2 - TOOLTIP_WIDTH / 2;
      transform = "translateY(-100%)";
    } else if (placement === "right") {
      top = r.top;
      left = r.left + r.width + 12;
    } else {
      top = r.top;
      left = r.left - 12;
      transform = "translateX(-100%)";
    }

    // constrain horizontal within viewport
    const maxLeft = window.innerWidth - GUTTER - TOOLTIP_WIDTH;
    if (left < GUTTER) left = GUTTER;
    if (left > maxLeft) left = Math.max(GUTTER, maxLeft);

    // constrain vertical within viewport
    const maxTop = window.innerHeight - GUTTER - 80; // keep some bottom space
    if (top < GUTTER) top = GUTTER;
    if (top > maxTop) top = maxTop;

    tipStyle = { top, left, width: TOOLTIP_WIDTH, ...(transform ? { transform } : {}) };
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] animate-fade-in">
      {/* Dim overlay with SVG mask cutout */}
      <svg className="absolute inset-0 w-full h-full" aria-hidden>
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {r && <rect x={r.left} y={r.top} width={r.width} height={r.height} rx="10" ry="10" fill="black" />}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="hsl(var(--foreground) / 0.55)" mask="url(#tour-mask)" />
      </svg>

      {/* Spotlight glow */}
      {r && (
        <div
          className="absolute pointer-events-none rounded-[10px] ring-2 ring-primary shadow-[0_0_0_6px_hsl(var(--primary)/0.25)] animate-soft-pulse"
          style={{ top: r.top, left: r.left, width: r.width, height: r.height }}
        />
      )}

      {/* Tooltip card */}
      <div
        className="absolute rounded-xl border bg-popover text-popover-foreground p-4 shadow-elegant-lg animate-scale-in pointer-events-auto"
        style={{ ...tipStyle, maxHeight: "90vh", overflow: "auto", right: "auto" }}
      >
        <button
          onClick={endTour}
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground rounded-md p-1"
          aria-label="Skip tour"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Step {tourStep + 1} of {STEPS.length}</div>
        <h3 className="font-semibold text-base mt-1">{step.title}</h3>
        <p className="text-sm text-muted-foreground mt-1.5">{step.body}</p>

        <div className="mt-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={endTour}>Skip</Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={tourStep === 0} onClick={prevStep}>
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
            </Button>
            <Button size="sm" onClick={() => (tourStep === STEPS.length - 1 ? endTour() : nextStep())}>
              {tourStep === STEPS.length - 1 ? "Finish" : (<>Next <ArrowRight className="h-3.5 w-3.5 ml-1" /></>)}
            </Button>
          </div>
        </div>

        {/* Progress dots */}
        <div className="mt-3 flex justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === tourStep ? "w-5 bg-primary" : "w-1.5 bg-muted"}`} />
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}