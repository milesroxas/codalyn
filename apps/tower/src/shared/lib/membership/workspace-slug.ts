export const WORKSPACE_SLUG_MAX_LENGTH = 80;

/** Lowercase letters, digits, and single hyphens between segments. */
export const WORKSPACE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const WORKSPACE_SLUG_HINT = "Lowercase letters, numbers, and hyphens only (1–80 characters).";

export const RESERVED_WORKSPACE_SLUGS = new Set([
  "account",
  "api",
  "auth",
  "beacon",
  "billing",
  "console",
  "integrations",
  "invitations",
  "operator",
  "request-access",
  "sign-in",
  "sign-up",
  "team",
]);

export type WorkspaceSlugErrorCode = "invalid_slug" | "slug_empty" | "slug_reserved" | "slug_taken";

export function normalizeWorkspaceSlugInput(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function slugifyWorkspaceName(name: string): string {
  const normalized = normalizeWorkspaceSlugInput(name);
  const candidate = (normalized || "workspace").slice(0, WORKSPACE_SLUG_MAX_LENGTH);
  const parsed = parseWorkspaceSlug(candidate);
  if (parsed.ok) {
    return parsed.slug;
  }
  if (parsed.error === "slug_reserved") {
    const suffix = "-ws";
    const base =
      (normalized || "workspace").slice(0, WORKSPACE_SLUG_MAX_LENGTH - suffix.length).replace(/-+$/, "") || "workspace";
    const disambiguated = parseWorkspaceSlug(`${base}${suffix}`);
    if (disambiguated.ok) {
      return disambiguated.slug;
    }
  }
  return "workspace-ws";
}

export function isValidWorkspaceSlugFormat(slug: string): boolean {
  return slug.length >= 1 && slug.length <= WORKSPACE_SLUG_MAX_LENGTH && WORKSPACE_SLUG_PATTERN.test(slug);
}

export function isReservedWorkspaceSlug(slug: string): boolean {
  return RESERVED_WORKSPACE_SLUGS.has(slug);
}

export function parseWorkspaceSlug(
  raw: unknown
): { ok: true; slug: string } | { ok: false; error: WorkspaceSlugErrorCode } {
  if (typeof raw !== "string") {
    return { ok: false, error: "invalid_slug" };
  }
  const slug = normalizeWorkspaceSlugInput(raw);
  if (!slug) {
    return { ok: false, error: "slug_empty" };
  }
  if (!isValidWorkspaceSlugFormat(slug)) {
    return { ok: false, error: "invalid_slug" };
  }
  if (isReservedWorkspaceSlug(slug)) {
    return { ok: false, error: "slug_reserved" };
  }
  return { ok: true, slug };
}
