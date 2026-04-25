import { and, desc, eq, gt } from "drizzle-orm";
import { auth } from "@/server/auth";
import { db } from "@/shared/lib/db";
import { session as sessionTable } from "@/shared/lib/db/auth-schema";

/** Duplicates the active-org resolution used in `getTowerDashboardSummary` for API routes and billing UI. */
export async function getActiveOrganizationIdForAuthHeaders(incoming: Headers): Promise<string | null> {
  const sessionData = await auth.api.getSession({ headers: incoming });
  const userId = sessionData?.user?.id;
  if (!userId) {
    return null;
  }
  const rawSession = sessionData.session as { id?: string } | undefined;
  let activeOrganizationId: string | null = null;
  if (rawSession?.id) {
    const rows = await db
      .select({ activeOrganizationId: sessionTable.activeOrganizationId })
      .from(sessionTable)
      .where(eq(sessionTable.id, rawSession.id))
      .limit(1);
    activeOrganizationId = rows[0]?.activeOrganizationId ?? null;
  }
  if (!activeOrganizationId) {
    const rows = await db
      .select({ activeOrganizationId: sessionTable.activeOrganizationId })
      .from(sessionTable)
      .where(and(eq(sessionTable.userId, userId), gt(sessionTable.expiresAt, new Date())))
      .orderBy(desc(sessionTable.updatedAt))
      .limit(1);
    activeOrganizationId = rows[0]?.activeOrganizationId ?? null;
  }
  return activeOrganizationId;
}

export function getActiveOrganizationIdForApiRequest(request: Request): Promise<string | null> {
  return getActiveOrganizationIdForAuthHeaders(request.headers);
}
