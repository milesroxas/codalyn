import type { InvitationRow } from "@/features/team/model/workspace-types";

export function formatInvitationExpiry(v: InvitationRow["expiresAt"]): string | null {
  if (v == null) {
    return null;
  }
  const d = typeof v === "string" ? new Date(v) : v;
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(d);
}
