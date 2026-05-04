/**
 * apiClient.ts — Axios instance with auth, error-handling, and retry logic.
 *
 * Usage:
 *   import { apiClient } from "@/lib/apiClient";
 *   const leads = await apiClient.get("/leads");
 */

import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { env } from "@/lib/env";

// ── Token helpers ────────────────────────────────────────────────────────────

export const tokenStorage = {
  get: (): string | null => localStorage.getItem(env.TOKEN_KEY),
  set: (token: string): void => localStorage.setItem(env.TOKEN_KEY, token),
  clear: (): void => {
    localStorage.removeItem(env.TOKEN_KEY);
    localStorage.removeItem(env.USER_KEY);
  },
};

// ── Error shape ───────────────────────────────────────────────────────────────

export interface ApiError {
  status: number;
  message: string;
  detail?: string | string[];
}

export function isApiError(err: unknown): err is ApiError {
  return (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    "message" in err
  );
}

function parseError(error: AxiosError): ApiError {
  const status = error.response?.status ?? 0;
  const data = error.response?.data as Record<string, unknown> | undefined;

  let message = "An unexpected error occurred.";
  let detail: string | string[] | undefined;

  if (data) {
    if (typeof data.detail === "string") {
      message = data.detail;
    } else if (Array.isArray(data.detail)) {
      message = (data.detail as string[]).join(". ");
      detail = data.detail as string[];
    } else if (typeof data.message === "string") {
      message = data.message;
    }
  }

  if (status === 401) message = "Session expired. Please log in again.";
  if (status === 403) message = "You don't have permission to do that.";
  if (status === 404) message = "Resource not found.";
  if (status === 0) message = "Cannot reach the server. Check your connection.";

  return { status, message, detail };
}

// ── Axios instance ────────────────────────────────────────────────────────────

const client: AxiosInstance = axios.create({
  baseURL: env.API_PREFIX,
  timeout: env.API_TIMEOUT,
  headers: { "Content-Type": "application/json" },
});

// ── Request interceptor — attach JWT ─────────────────────────────────────────

client.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenStorage.get();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor — normalise errors & handle 401 ─────────────────────

client.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    const apiErr = parseError(error);

    // Auto-clear credentials on 401 so UI can redirect to login
    if (apiErr.status === 401) {
      tokenStorage.clear();
      // Dispatch a custom event so AuthProvider can react
      window.dispatchEvent(new CustomEvent("auth:expired"));
    }

    return Promise.reject(apiErr);
  },
);

export { client as apiClient };
