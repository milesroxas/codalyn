import { readStringLikeValue } from "@/features/team/lib/team-org-boundary";

/** Reads organization id from Better Auth `organization.create` payloads. */
export function readOrganizationIdFromCreateResponse(data: unknown): string | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }
  const record = data as Record<string, unknown>;
  const direct = readStringLikeValue(record.id);
  if (direct) {
    return direct;
  }
  const nested = record.organization;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return readStringLikeValue((nested as Record<string, unknown>).id);
  }
  return null;
}

function normalizeOrganizationListRows(data: unknown): Array<{ id: string; slug: string }> {
  const rows = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as Record<string, unknown>).organizations)
      ? ((data as Record<string, unknown>).organizations as unknown[])
      : [];

  const out: Array<{ id: string; slug: string }> = [];
  for (const row of rows) {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      continue;
    }
    const record = row as Record<string, unknown>;
    const id = readStringLikeValue(record.id);
    const slug = readStringLikeValue(record.slug);
    if (id && slug) {
      out.push({ id, slug });
    }
  }
  return out;
}

export function findOrganizationIdBySlug(data: unknown, slug: string): string | null {
  const normalizedSlug = slug.trim();
  if (!normalizedSlug) {
    return null;
  }
  for (const row of normalizeOrganizationListRows(data)) {
    if (row.slug === normalizedSlug) {
      return row.id;
    }
  }
  return null;
}
