import type { User } from "@/types/crm";
import { cn } from "@/lib/utils";

export function UserAvatar({ user, size = "sm", className }: { user?: User; size?: "sm" | "md" | "lg"; className?: string }) {
  const sizes = { sm: "h-7 w-7 text-xs", md: "h-9 w-9 text-sm", lg: "h-12 w-12 text-base" };
  if (!user) {
    return (
      <div className={cn("inline-flex items-center justify-center rounded-full bg-muted text-muted-foreground font-medium", sizes[size], className)}>
        ?
      </div>
    );
  }
  const initials = user.name.split(" ").map((n) => n[0]).slice(0, 2).join("");
  return (
    <div className={cn("inline-flex items-center justify-center rounded-full text-white font-semibold", user.avatarColor, sizes[size], className)}>
      {initials}
    </div>
  );
}