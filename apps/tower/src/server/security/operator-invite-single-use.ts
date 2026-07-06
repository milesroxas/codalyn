import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/shared/lib/db";
import { towerOperatorInviteRedemption } from "@/shared/lib/db/auth-schema";

/** Postgres `undefined_table` — the single-use ledger migration (0035) has not been applied yet. */
const PG_UNDEFINED_TABLE = "42P01";

export type OperatorInviteClaimResult = "claimed" | "already_by_self" | "already_by_other";

/** Never store the raw token; the hash is the ledger key. */
function hashOperatorInviteToken(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}

function isUndefinedTableError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === PG_UNDEFINED_TABLE
  );
}

/**
 * Atomically claim an operator invite token for single use.
 *
 * - First redemption inserts the token hash → `"claimed"`.
 * - Same user retrying (e.g. network retry / re-run of the post-auth step) → `"already_by_self"`
 *   (caller treats as success; grants are idempotent).
 * - Anyone else → `"already_by_other"` (replay — caller rejects).
 *
 * Degrades gracefully if migration 0035 has not been applied yet (table missing → `"claimed"`), so a
 * deploy-before-migration window never blocks onboarding; single-use activates once the table exists.
 */
export async function claimOperatorInviteToken(
  token: string,
  userId: string,
  email: string
): Promise<OperatorInviteClaimResult> {
  const tokenHash = hashOperatorInviteToken(token);
  try {
    const inserted = await db
      .insert(towerOperatorInviteRedemption)
      .values({ tokenHash, email, redeemedByUserId: userId })
      .onConflictDoNothing({ target: towerOperatorInviteRedemption.tokenHash })
      .returning({ tokenHash: towerOperatorInviteRedemption.tokenHash });
    if (inserted.length > 0) {
      return "claimed";
    }
    const [row] = await db
      .select({ redeemedByUserId: towerOperatorInviteRedemption.redeemedByUserId })
      .from(towerOperatorInviteRedemption)
      .where(eq(towerOperatorInviteRedemption.tokenHash, tokenHash))
      .limit(1);
    return row?.redeemedByUserId === userId ? "already_by_self" : "already_by_other";
  } catch (error) {
    if (isUndefinedTableError(error)) {
      console.error(
        "[operator-invite] single-use ledger table missing (apply migration 0035); allowing redemption without single-use enforcement"
      );
      return "claimed";
    }
    throw error;
  }
}
