import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/store/authStore";
import { env } from "@/lib/env";

/**
 * ProtectedRoute — wraps app routes that require authentication.
 *
 * In mock mode (VITE_USE_MOCK_DATA=true) the route is always accessible;
 * the AuthProvider automatically injects a mock admin user.
 */
export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  // In mock/demo mode allow everything through
  if (env.USE_MOCK_DATA) return <Outlet />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
