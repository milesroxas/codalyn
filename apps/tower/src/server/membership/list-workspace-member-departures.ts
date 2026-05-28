import { desc, eq } from "drizzle-orm";
import { isTowerTeamAdminMemberOfOrg } from "@/server/tower-webflow-oauth-team-admin";
import { db } from "@/shared/lib/db";
import { workspaceMemberDeparture } from "@/shared/lib/db/auth-schema";

export type WorkspaceMemberDepartureRow = {
  id: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  role: string;
  departedAt: Date;
};

export class WorkspaceMemberDepartureListError extends Error {
  readonly code: "forbidden";

  constructor() {
    super("forbidden");
    this.name = "WorkspaceMemberDepartureListError";
    this.code = "forbidden";
  }
}

export async function listWorkspaceMemberDepartures(input: {
  organizationId: string;
  actorUserId: string;
  limit?: number;
}): Promise<WorkspaceMemberDepartureRow[]> {
  const organizationId = input.organizationId.trim();
  if (!(await isTowerTeamAdminMemberOfOrg(input.actorUserId, organizationId))) {
    throw new WorkspaceMemberDepartureListError();
  }

  const limit = Math.min(Math.max(input.limit ?? 25, 1), 100);

  return db
    .select({
      id: workspaceMemberDeparture.id,
      userId: workspaceMemberDeparture.userId,
      userEmail: workspaceMemberDeparture.userEmail,
      userName: workspaceMemberDeparture.userName,
      role: workspaceMemberDeparture.role,
      departedAt: workspaceMemberDeparture.departedAt,
    })
    .from(workspaceMemberDeparture)
    .where(eq(workspaceMemberDeparture.organizationId, organizationId))
    .orderBy(desc(workspaceMemberDeparture.departedAt))
    .limit(limit);
}
