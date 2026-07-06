import { eq } from "drizzle-orm";
import { db } from "@/shared/lib/db";
import { user } from "@/shared/lib/db/auth-schema";

/**
 * Mark a user's email verified. Only called from a genuine ownership signal (a completed email
 * verification, or `beforeAcceptInvitation` when the accepting session's email matches the
 * invitation). Never flip `emailVerified` from mere invite/token possession at sign-up/sign-in.
 */
export async function markEmailVerifiedForUserId(userId: string): Promise<void> {
  await db.update(user).set({ emailVerified: true }).where(eq(user.id, userId));
}
