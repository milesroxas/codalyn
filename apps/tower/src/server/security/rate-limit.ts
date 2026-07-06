import { eq, sql } from "drizzle-orm";
import { db } from "@/shared/lib/db";
import { towerDestructiveActionRateLimit } from "@/shared/lib/db/auth-schema";

export type RateLimitOptions = { maxAttempts: number; windowSeconds: number };

/** Thrown when a key exceeds its window budget. Carries a stable `code` for HTTP mapping. */
export class RateLimitError extends Error {
  readonly code = "rate_limited" as const;

  constructor(message = "Too many attempts. Try again later.") {
    super(message);
    this.name = "RateLimitError";
  }
}

export function isRateLimitWindowExpired(windowStartedAt: Date, windowSeconds: number, now: Date): boolean {
  return now.getTime() - windowStartedAt.getTime() >= windowSeconds * 1000;
}

/**
 * Postgres-backed fixed-window counter, shared across serverless instances via an advisory lock.
 * Counts every attempt (including failures) so it also slows enumeration. Throws `errorFactory()`
 * (defaults to `RateLimitError`) once `key` exceeds `maxAttempts` within the window.
 *
 * Reuses the generic `tower_destructive_action_rate_limit` table — namespace keys with a prefix
 * (`"early-access:ip:1.2.3.4"`) so counters from different features never collide.
 */
export async function assertPostgresRateLimit(
  key: string,
  options: RateLimitOptions,
  errorFactory: () => Error = () => new RateLimitError()
): Promise<void> {
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${key}))`);

    const [row] = await tx
      .select({
        windowStartedAt: towerDestructiveActionRateLimit.windowStartedAt,
        attemptCount: towerDestructiveActionRateLimit.attemptCount,
      })
      .from(towerDestructiveActionRateLimit)
      .where(eq(towerDestructiveActionRateLimit.key, key))
      .limit(1);

    if (!row) {
      await tx.insert(towerDestructiveActionRateLimit).values({
        key,
        windowStartedAt: now,
        attemptCount: 1,
      });
      return;
    }

    const expired = isRateLimitWindowExpired(row.windowStartedAt, options.windowSeconds, now);
    const nextCount = expired ? 1 : row.attemptCount + 1;
    if (!expired && nextCount > options.maxAttempts) {
      throw errorFactory();
    }

    await tx
      .update(towerDestructiveActionRateLimit)
      .set({
        windowStartedAt: expired ? now : row.windowStartedAt,
        attemptCount: nextCount,
      })
      .where(eq(towerDestructiveActionRateLimit.key, key));
  });
}
