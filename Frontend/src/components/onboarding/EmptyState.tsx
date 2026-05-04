import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: Props) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center py-12 px-6 animate-fade-in", className)}>
      <div className="relative mb-4">
        <div className="absolute inset-0 rounded-2xl bg-gradient-primary opacity-20 blur-xl animate-soft-pulse" />
        <div className="relative h-14 w-14 rounded-2xl bg-gradient-primary text-primary-foreground inline-flex items-center justify-center shadow-elegant-md">
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <h3 className="font-semibold text-base">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1.5 max-w-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}