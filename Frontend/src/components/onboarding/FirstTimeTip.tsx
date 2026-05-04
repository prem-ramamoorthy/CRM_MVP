import { useEffect, useState } from "react";
import { Lightbulb, X } from "lucide-react";
import { useOnboarding } from "@/store/onboardingStore";
import { cn } from "@/lib/utils";

interface Props {
  id: string;
  title: string;
  body: string;
  className?: string;
}

/** Inline contextual tip that shows once per id, then never again. */
export function FirstTimeTip({ id, title, body, className }: Props) {
  const { tipSeen, markTipSeen } = useOnboarding();
  const [visible, setVisible] = useState(false);

  useEffect(() => { if (!tipSeen(id)) setVisible(true); }, [id, tipSeen]);

  if (!visible) return null;

  return (
    <div
      role="status"
      className={cn(
        "relative flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/[0.06] p-3 pr-9 text-sm animate-fade-in",
        className,
      )}
    >
      <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground text-xs mt-0.5">{body}</p>
      </div>
      <button
        onClick={() => { setVisible(false); markTipSeen(id); }}
        aria-label="Dismiss"
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground rounded p-1"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}