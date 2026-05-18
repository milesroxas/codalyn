import { and, eq } from "drizzle-orm";
import { getActiveOrganizationIdForAuthHeaders } from "@/server/billing/session-org";
import { db } from "@/shared/lib/db";
import { member } from "@/shared/lib/db/auth-schema";
import { isTowerTeamAdminRole } from "@/shared/lib/membership/tower-organization-access";

/** Whether `userId` is workspace `admin` or `owner` in `organizationId`. */
export async function isTowerTeamAdminMemberOfOrg(userId: string, organizationId: string): Promise<boolean> {
  const rows = await db
    .select({ role: member.role })
    .from(member)
    .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)))
    .limit(1);
  return isTowerTeamAdminRole(rows[0]?.role);
}

/** Tower dashboard / first-party GET OAuth: active-org team admin or owner only. */
export async function canTowerUserManageWebflowOAuthViaDashboard(
  userId: string,
  incoming: Headers
): Promise<boolean> {
  const activeOrganizationId = await getActiveOrganizationIdForAuthHeaders(incoming);
  if (!activeOrganizationId) {
    return false;
  }
  return isTowerTeamAdminMemberOfOrg(userId, activeOrganizationId);
}
