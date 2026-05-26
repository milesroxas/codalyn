import type { InvitationRow, MemberRow } from "@/features/team/model/workspace-types";

export function readStringLikeValue(raw: unknown): string | null {
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (raw && typeof raw === "object" && "value" in raw) {
    return readStringLikeValue((raw as { value: unknown }).value);
  }
  return null;
}

function readExpiresAt(raw: unknown): string | Date | null | undefined {
  if (raw == null) {
    return raw === null ? null : undefined;
  }
  if (typeof raw === "string" || raw instanceof Date) {
    return raw;
  }
  return undefined;
}

function readUserSummary(raw: unknown): MemberRow["user"] | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const id = readStringLikeValue(record.id);
  const email = readStringLikeValue(record.email);
  if (!id || !email) {
    return null;
  }
  return {
    id,
    email,
    name: readStringLikeValue(record.name) ?? "",
  };
}

export function normalizeMemberRow(raw: unknown): MemberRow | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const id = readStringLikeValue(record.id);
  const userId = readStringLikeValue(record.userId);
  const role = readStringLikeValue(record.role);
  const user = readUserSummary(record.user);
  if (!id || !userId || !role || !user) {
    return null;
  }
  return { id, userId, role, user };
}

export function normalizeMemberRows(raw: unknown): MemberRow[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map(normalizeMemberRow).filter((row): row is MemberRow => row != null);
}

export function normalizeInvitationRow(raw: unknown): InvitationRow | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const id = readStringLikeValue(record.id);
  const email = readStringLikeValue(record.email);
  const status = readStringLikeValue(record.status);
  if (!id || !email || !status) {
    return null;
  }
  const roleRaw = record.role;
  const role = roleRaw == null ? null : readStringLikeValue(roleRaw);
  const expiresAt = "expiresAt" in record ? readExpiresAt(record.expiresAt) : undefined;
  return { id, email, role, status, expiresAt };
}

export function normalizeInvitationRows(raw: unknown): InvitationRow[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map(normalizeInvitationRow).filter((row): row is InvitationRow => row != null);
}

export function countPendingInvitations(invitations: readonly InvitationRow[]): number {
  return invitations.reduce((count, inv) => (inv.status === "pending" ? count + 1 : count), 0);
}
