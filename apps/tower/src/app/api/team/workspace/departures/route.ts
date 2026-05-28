import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import {
  listWorkspaceMemberDepartures,
  WorkspaceMemberDepartureListError,
} from "@/server/membership/list-workspace-member-departures";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request
): Promise<
  NextResponse<{ departures: Awaited<ReturnType<typeof listWorkspaceMemberDepartures>> } | { error: string }>
> {
  const session = await auth.api.getSession({ headers: req.headers });
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const organizationId = url.searchParams.get("organizationId")?.trim() ?? "";
  if (!organizationId) {
    return NextResponse.json({ error: "organizationId required" }, { status: 400 });
  }

  try {
    const departures = await listWorkspaceMemberDepartures({ organizationId, actorUserId: userId });
    return NextResponse.json({ departures });
  } catch (error) {
    if (error instanceof WorkspaceMemberDepartureListError) {
      return NextResponse.json({ error: error.code }, { status: 403 });
    }
    throw error;
  }
}
