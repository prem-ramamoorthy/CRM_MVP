import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Building2, KanbanSquare, LayoutDashboard, LogOut, Users, WifiOff, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProductTour } from "@/components/onboarding/ProductTour";
import { HelpButton } from "@/components/onboarding/HelpButton";
import { useAuth } from "@/store/authStore";
import { env } from "@/lib/env";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true, tour: "nav-dashboard" },
  { to: "/leads", label: "Leads", icon: Users, tour: "nav-leads" },
  { to: "/pipeline", label: "Pipeline", icon: KanbanSquare, tour: "nav-pipeline" },
];

function getUserInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function ApiStatusBadge() {
  if (env.USE_MOCK_DATA) {
    return (
      <div className="hidden md:flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400 rounded-full border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1">
        <WifiOff className="h-3 w-3" />
        Demo
      </div>
    );
  }
  return (
    <div className="hidden md:flex items-center gap-1.5 text-[10px] text-emerald-600 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-soft-pulse" />
      Live
    </div>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  const initials = getUserInitials(user.name);

  const toggleMockData = (checked: boolean) => {
    localStorage.setItem("FORCE_MOCK_DATA", String(checked));
    window.location.reload();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-3 rounded-lg px-2 py-1.5 w-full hover:bg-sidebar-accent/60 transition-colors text-left">
          <div className={cn("h-9 w-9 rounded-full inline-flex items-center justify-center text-sm font-semibold text-white shadow-elegant-md shrink-0", user.avatar_color || "bg-gradient-primary")}>
            {initials}
          </div>
          <div className="text-sm min-w-0 flex-1">
            <p className="font-medium text-sidebar-foreground truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuLabel className="font-normal">
          <p className="font-medium truncate">{user.name}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="flex items-center justify-between px-2 py-1.5 text-sm">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            <span>Use Demo Data</span>
          </div>
          <Switch 
            checked={env.USE_MOCK_DATA} 
            onCheckedChange={toggleMockData}
          />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => { logout(); navigate("/login", { replace: true }); }} className="text-destructive focus:text-destructive focus:bg-destructive/10">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppLayout() {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen flex w-full bg-gradient-subtle relative">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-[0.35]" aria-hidden />
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r bg-sidebar/80 backdrop-blur-xl relative z-10">
        <div className="flex h-16 items-center justify-between px-4 border-b">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shadow-elegant-md transition-transform hover:scale-105">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-sidebar-foreground leading-tight">{env.APP_NAME}</p>
              <p className="text-xs text-muted-foreground">PG Lead Management</p>
            </div>
          </div>
          <ApiStatusBadge />
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} data-tour={item.tour}
              className={({ isActive }) => cn("group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200", isActive ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-elegant-sm" : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:translate-x-0.5")}>
              <item.icon className="h-4 w-4 transition-transform group-hover:scale-110" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t">
          <UserMenu />
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <header className="md:hidden h-14 flex items-center justify-between gap-3 border-b px-4 bg-background/80 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-primary text-primary-foreground">
              <Building2 className="h-4 w-4" />
            </div>
            <p className="font-semibold">{env.APP_NAME}</p>
          </div>
          {env.USE_MOCK_DATA && <span className="text-[10px] text-amber-600 border border-amber-200 rounded-full px-2 py-0.5 bg-amber-50">Demo</span>}
        </header>
        <nav className="md:hidden flex border-b bg-background/80 backdrop-blur-md overflow-x-auto">
          {nav.map((item) => {
            const active = item.end ? pathname === item.to : pathname.startsWith(item.to);
            return (
              <NavLink key={item.to} to={item.to} end={item.end} data-tour={item.tour}
                className={cn("flex items-center gap-2 px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors", active ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground")}>
                <item.icon className="h-4 w-4" />{item.label}
              </NavLink>
            );
          })}
        </nav>
        <main key={pathname} className="flex-1 p-4 md:p-8 animate-fade-in-up">
          <Outlet />
        </main>
      </div>
      <ProductTour />
      <HelpButton />
    </div>
  );
}
