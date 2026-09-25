import { and, eq } from "drizzle-orm";
import { db } from "@/shared/lib/db";
import { session as sessionTable, user } from "@/shared/lib/db/auth-schema";

/**
 * After someone else removes a member, that member's live sessions still point at the workspace and would
 * keep resolving its Webflow token and settings until they expire (Better Auth nulls the pointer only when
 * the remover is the member themself). Null the pointer on every session of theirs that holds it, and drop
 * the preferred-workspace default, so the next request resolves from memberships alone. Self-leave and
 * workspace deletion do the same inline (`leave-workspace.ts`, `delete-workspace.ts`).
 */
export async function forgetWorkspaceOnUserSessions(userId: string, organizationId: string): Promise<void> {
  await db
    .update(sessionTable)
    .set({ activeOrganizationId: null })
    .where(and(eq(sessionTable.userId, userId), eq(sessionTable.activeOrganizationId, organizationId)));
  await db
    .update(user)
    .set({ preferredOrganizationId: null })
    .where(and(eq(user.id, userId), eq(user.preferredOrganizationId, organizationId)));
}
