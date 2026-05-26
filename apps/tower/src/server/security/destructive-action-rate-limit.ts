import { eq, sql } from "drizzle-orm";
import { db } from "@/shared/lib/db";
import { towerDestructiveActionRateLimit } from "@/shared/lib/db/auth-schema";

export const WORKSPACE_DELETE_RATE_LIMIT = {
  maxAttempts: 5,
  windowSeconds: 300,
} as const;

export class DestructiveActionRateLimitError extends Error {
  readonly code = "rate_limited" as const;

  constructor() {
    super("Too many attempts. Try again later.");
    this.name = "DestructiveActionRateLimitError";
  }
}

function isRateLimitWindowExpired(windowStartedAt: Date, windowSeconds: number, now: Date): boolean {
  return now.getTime() - windowStartedAt.getTime() >= windowSeconds * 1000;
}

export { isRateLimitWindowExpired };

/**
 * Postgres-backed sliding window (works across serverless instances).
 * Counts every attempt, including failed slug confirmation, to slow enumeration.
 */
export async function assertDestructiveActionRateLimit(
  key: string,
  options: { maxAttempts: number; windowSeconds: number }
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
      throw new DestructiveActionRateLimitError();
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

export async function assertWorkspaceDeleteRateLimit(actorUserId: string): Promise<void> {
  await assertDestructiveActionRateLimit(`workspace-delete:${actorUserId}`, WORKSPACE_DELETE_RATE_LIMIT);
}
