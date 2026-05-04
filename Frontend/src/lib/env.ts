/**
 * env.ts — Centralised environment configuration.
 *
 * All access to import.meta.env goes through this module so that:
 *  - Types are enforced at compile time.
 *  - A single place to add validation or defaults.
 *  - Easy to mock in tests.
 */

function get(key: string, fallback = ""): string {
  return (import.meta.env[key] as string | undefined) ?? fallback;
}

function getBool(key: string, fallback = false): boolean {
  const v = get(key, String(fallback));
  return v === "true" || v === "1";
}

function getNumber(key: string, fallback: number): number {
  const v = get(key, String(fallback));
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function getMockDataFlag(): boolean {
  const local = localStorage.getItem("FORCE_MOCK_DATA");
  if (local !== null) {
    return local === "true";
  }
  return getBool("VITE_USE_MOCK_DATA", false);
}

export const env = {
  /** Base URL of the FastAPI backend, e.g. http://localhost:8000 */
  API_BASE_URL: get("VITE_API_BASE_URL", "http://localhost:8000"),

  /** API version prefix, e.g. "v1" */
  API_VERSION: get("VITE_API_VERSION", "v1"),

  /** Full API prefix derived from above */
  get API_PREFIX() {
    return `${this.API_BASE_URL}/api/${this.API_VERSION}`;
  },

  /** Axios request timeout (ms) */
  API_TIMEOUT: getNumber("VITE_API_TIMEOUT", 10_000),

  /** localStorage key for JWT */
  TOKEN_KEY: get("VITE_TOKEN_KEY", "nestcrm_token"),

  /** localStorage key for user JSON */
  USER_KEY: get("VITE_USER_KEY", "nestcrm_user"),

  /**
   * When true the app uses local seed data instead of hitting the API.
   * Useful for UI-only development.
   */
  USE_MOCK_DATA: getMockDataFlag(),

  APP_NAME: get("VITE_APP_NAME", "NestCRM"),
  APP_VERSION: get("VITE_APP_VERSION", "1.0.0"),

  /** Are we in production mode? */
  IS_PROD: import.meta.env.PROD,
  IS_DEV: import.meta.env.DEV,
} as const;
