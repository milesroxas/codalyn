import type { MemberDepartureRow } from "@/features/team/model/workspace-types";

class TeamWorkspaceDeparturesApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "TeamWorkspaceDeparturesApiError";
    this.status = status;
  }
}

export async function fetchTeamWorkspaceDepartures(organizationId: string): Promise<MemberDepartureRow[]> {
  const params = new URLSearchParams({ organizationId });
  const res = await fetch(`/api/team/workspace/departures?${params.toString()}`, {
    credentials: "include",
  });
  const payload = (await res.json().catch(() => null)) as { departures?: MemberDepartureRow[]; error?: string } | null;
  if (!res.ok) {
    throw new TeamWorkspaceDeparturesApiError(payload?.error ?? "departures_failed", res.status);
  }
  return payload?.departures ?? [];
}
