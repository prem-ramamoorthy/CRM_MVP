import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Eye, EyeOff, Loader2, Lock, Mail, Shield, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/store/authStore";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";

export default function Login() {
  const { login, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch {
      /* error already set in store */
    }
  };

  const toggleMockData = (checked: boolean) => {
    localStorage.setItem("FORCE_MOCK_DATA", String(checked));
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background grid */}
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-[0.35]" aria-hidden />

      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-stage-visit/10 blur-3xl" aria-hidden />

      <div className="w-full max-w-md relative">
        {/* Card */}
        <div className="rounded-2xl border bg-card/90 backdrop-blur-xl shadow-elegant-lg p-8 space-y-6">

          {/* Logo + heading */}
          <div className="text-center space-y-3">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-elegant-md mx-auto">
              <Building2 className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{env.APP_NAME}</h1>
              <p className="text-sm text-muted-foreground mt-1">PG Lead Management · Sign in to continue</p>
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Demo Mode Toggle */}
          <div className="flex items-center justify-between rounded-lg border bg-card p-3 shadow-sm">
            <div className="flex items-center gap-2 text-sm">
              <Database className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">Demo Mode</p>
                <p className="text-xs text-muted-foreground">Use sample local data instead of an API</p>
              </div>
            </div>
            <Switch checked={env.USE_MOCK_DATA} onCheckedChange={toggleMockData} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  disabled={isLoading || env.USE_MOCK_DATA}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-10"
                  disabled={isLoading || env.USE_MOCK_DATA}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className={cn("w-full shadow-elegant-md", env.USE_MOCK_DATA && "cursor-default")}
              disabled={isLoading}
              onClick={env.USE_MOCK_DATA ? () => navigate("/", { replace: true }) : undefined}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : env.USE_MOCK_DATA ? (
                "Enter Demo"
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          {/* Footer note */}
          <p className="text-center text-xs text-muted-foreground">
            {env.APP_NAME} v{env.APP_VERSION} · Secured with JWT
          </p>
        </div>
      </div>
    </div>
  );
}
