import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { env } from "@/lib/env";
import { tokenStorage } from "@/lib/apiClient";
import { authApi, type UserOut, type TokenResponse } from "@/lib/api/auth";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuthState {
  user: UserOut | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadUserFromStorage(): UserOut | null {
  try {
    const raw = localStorage.getItem(env.USER_KEY);
    return raw ? (JSON.parse(raw) as UserOut) : null;
  } catch {
    return null;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserOut | null>(loadUserFromStorage);
  const [token, setToken] = useState<string | null>(tokenStorage.get);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When using mock mode, auto-inject a fake admin user
  useEffect(() => {
    if (env.USE_MOCK_DATA && !user) {
      const mockUser: UserOut = {
        id: "u1",
        name: "Aarav Sharma",
        email: "aarav@nestcrm.dev",
        role: "admin",
        avatar_color: "bg-stage-new",
        is_active: true,
        created_at: new Date().toISOString(),
      };
      setUser(mockUser);
      setToken("mock-token");
    }
  }, [user]);

  // Listen for auth:expired events emitted by the API client
  useEffect(() => {
    const handler = () => {
      setUser(null);
      setToken(null);
    };
    window.addEventListener("auth:expired", handler);
    return () => window.removeEventListener("auth:expired", handler);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const resp: TokenResponse = await authApi.login({ email, password });
      tokenStorage.set(resp.access_token);
      localStorage.setItem(env.USER_KEY, JSON.stringify(resp.user));
      setToken(resp.access_token);
      setUser(resp.user);
    } catch (err: unknown) {
      const msg =
        typeof err === "object" && err !== null && "message" in err
          ? (err as { message: string }).message
          : "Login failed. Please try again.";
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
    setToken(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: !!token,
      isLoading,
      error,
      login,
      logout,
      clearError,
    }),
    [user, token, isLoading, error, login, logout, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
