/**
 * Better Auth rate-limit storage backend.
 *
 * Defaults to `"memory"` (Better Auth's default — per serverless instance), which is exactly the
 * current behavior, so this code is safe to deploy at ANY time regardless of migration state.
 *
 * Set `TOWER_AUTH_RATELIMIT_DB_STORAGE=1` **after** migration 0035 has created the `rate_limit` table
 * to switch to `"database"` storage, which shares counters across all serverless instances (a true
 * global limit instead of N× per-instance). Flipping this before the table exists would 500 every
 * rate-limited auth request, hence the explicit opt-in.
 */
export function resolveTowerAuthRateLimitStorage(): "memory" | "database" {
  return process.env.TOWER_AUTH_RATELIMIT_DB_STORAGE === "1" ? "database" : "memory";
}
