import { Link, useNavigate } from "react-router-dom";
import { format, isToday } from "date-fns";
import { ArrowRight, CalendarClock, CheckCircle2, Clock, Sparkles, TrendingUp, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCrm } from "@/store/crmStore";
import { LEAD_STATUSES, type LeadStatus } from "@/types/crm";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { UserAvatar } from "@/components/crm/UserAvatar";
import { ActivityTimeline } from "@/components/crm/ActivityTimeline";
import { NextActionPill } from "@/components/crm/NextActionPill";
import { cn } from "@/lib/utils";
import { QuickStartChecklist } from "@/components/onboarding/QuickStartChecklist";
import { EmptyState } from "@/components/onboarding/EmptyState";
import { Card as UICard } from "@/components/ui/card";

const stageHsl: Record<LeadStatus, string> = {
  "New": "hsl(var(--stage-new))",
  "Contacted": "hsl(var(--stage-contacted))",
  "Interested": "hsl(var(--stage-interested))",
  "Visit Scheduled": "hsl(var(--stage-visit))",
  "Closed": "hsl(var(--stage-closed))",
};

export default function Dashboard() {
  const { leads, visits, activity, getUser } = useCrm();
  const navigate = useNavigate();

  const total = leads.length;
  const closedCount = leads.filter((l) => l.status === "Closed").length;
  const conversion = total ? Math.round((closedCount / total) * 100) : 0;
  const createdToday = leads.filter((l) => isToday(new Date(l.createdAt))).length;
  const visitsToday = visits.filter((v) => isToday(new Date(v.scheduledAt))).length;

  const counts = LEAD_STATUSES.map((s) => ({
    status: s,
    count: leads.filter((l) => l.status === s).length,
    fill: stageHsl[s],
  }));

  const upcoming = [...visits]
    .filter((v) => new Date(v.scheduledAt) >= new Date(Date.now() - 3600000))
    .sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt))
    .slice(0, 5);

  const recent = activity.slice(0, 7);

  const goToLeads = (status?: LeadStatus) => {
    navigate(status ? `/leads?status=${encodeURIComponent(status)}` : "/leads");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="relative overflow-hidden rounded-2xl border bg-card/60 backdrop-blur-sm p-6 md:p-8">
        <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07]" preserveAspectRatio="none" viewBox="0 0 800 200">
          <defs>
            <linearGradient id="dh" x1="0" x2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="hsl(var(--stage-visit))" />
            </linearGradient>
          </defs>
          {Array.from({ length: 8 }).map((_, i) => (
            <path key={i} d={`M 0 ${30 + i * 20} Q 200 ${10 + i * 18}, 400 ${40 + i * 18} T 800 ${30 + i * 20}`} stroke="url(#dh)" strokeWidth="1" fill="none" />
          ))}
        </svg>
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Overview of your PG lead pipeline.</p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground rounded-full border bg-background/60 px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-soft-pulse" />
            Live
          </div>
        </div>
      </div>

      <QuickStartChecklist />

      {total === 0 && (
        <UICard className="shadow-elegant-sm">
          <EmptyState
            icon={Sparkles}
            title="Your dashboard is waiting"
            description="Once you add leads, you'll see live KPIs, stage distribution, hot leads, upcoming visits and recent activity right here."
            action={<Button onClick={() => navigate('/leads')}>Go to Leads <ArrowRight className="h-4 w-4 ml-1" /></Button>}
          />
        </UICard>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total leads"      value={total}        icon={Users}         accent="bg-stage-new/10 text-stage-new"           onClick={() => goToLeads()} />
        <StatCard label="Created today"    value={createdToday} icon={Sparkles}      accent="bg-stage-contacted/10 text-stage-contacted" onClick={() => goToLeads()} />
        <StatCard label="Visits today"     value={visitsToday}  icon={CalendarClock} accent="bg-stage-visit/10 text-stage-visit"        onClick={() => goToLeads("Visit Scheduled")} />
        <StatCard label="Visits scheduled" value={counts.find((c) => c.status === "Visit Scheduled")!.count} icon={Clock} accent="bg-info/10 text-info" onClick={() => goToLeads("Visit Scheduled")} />
        <StatCard label="Closed"           value={closedCount}  icon={CheckCircle2}  accent="bg-stage-closed/10 text-stage-closed"     onClick={() => goToLeads("Closed")} />
        <StatCard label="Conversion rate"  value={`${conversion}%`} icon={TrendingUp} accent="bg-gradient-primary text-primary-foreground" onClick={() => goToLeads("Closed")} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="shadow-elegant-sm lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Stage distribution</CardTitle>
            <Button variant="ghost" size="sm" asChild><Link to="/pipeline">Open pipeline <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={counts} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="status" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {counts.map((c) => <Cell key={c.status} fill={c.fill} cursor="pointer" onClick={() => goToLeads(c.status)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-4">
              {counts.map((c) => (
                <button key={c.status} onClick={() => goToLeads(c.status)}
                  className="rounded-lg border p-2.5 text-left hover:border-primary/50 hover:shadow-elegant-sm transition-base">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: c.fill }} />
                    <span className="text-xs text-muted-foreground">{c.status}</span>
                  </div>
                  <p className="text-lg font-bold mt-1">{c.count}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-elegant-sm">
          <CardHeader><CardTitle>Upcoming visits</CardTitle></CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground py-10 text-center">No upcoming visits</p>
            ) : (
              <ul className="divide-y">
                {upcoming.map((v) => {
                  const lead = leads.find((l) => l.id === v.leadId);
                  if (!lead) return null;
                  const agent = getUser(lead.assignedTo);
                  return (
                    <li key={v.id} className="flex items-center justify-between py-3 gap-2">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <UserAvatar user={agent} />
                        <div className="min-w-0">
                          <Link to={`/leads/${lead.id}`} className="font-medium text-sm hover:text-primary truncate block">{lead.name}</Link>
                          <p className="text-xs text-muted-foreground">{format(new Date(v.scheduledAt), "MMM d · p")}</p>
                        </div>
                      </div>
                      <StatusBadge status={lead.status} />
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="shadow-elegant-sm lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Hot leads</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => goToLeads()}>View all <ArrowRight className="ml-1 h-4 w-4" /></Button>
          </CardHeader>
          <CardContent className="px-0">
            <ul className="divide-y">
              {[...leads].sort((a, b) => b.score - a.score).slice(0, 5).map((lead) => {
                const agent = getUser(lead.assignedTo);
                return (
                  <li key={lead.id} className="flex items-center gap-3 px-6 py-3 hover:bg-muted/40 cursor-pointer" onClick={() => navigate(`/leads/${lead.id}`)}>
                    <UserAvatar user={agent} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{lead.name}</p>
                      <p className="text-xs text-muted-foreground">{lead.preferredLocation ?? lead.source}</p>
                    </div>
                    <NextActionPill action={lead.nextAction} compact className="hidden md:inline-flex" />
                    <StatusBadge status={lead.status} />
                    <div className="hidden sm:flex items-center gap-1 w-12 justify-end">
                      <span className="text-sm font-semibold tabular-nums">{lead.score}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <Card className="shadow-elegant-sm">
          <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
          <CardContent>
            <ActivityTimeline events={recent} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, accent, onClick }: { label: string; value: number | string; icon: React.ElementType; accent: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group text-left rounded-xl border bg-card p-4 shadow-elegant-sm hover-lift hover:border-primary/40"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-2xl font-bold mt-1 tabular-nums">{value}</p>
        </div>
        <div className={cn("h-9 w-9 rounded-lg inline-flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-3", accent)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </button>
  );
}