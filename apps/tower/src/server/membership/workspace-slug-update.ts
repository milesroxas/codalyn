import { APIError } from "better-auth/api";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/shared/lib/db";
import { organization } from "@/shared/lib/db/auth-schema";
import {
  parseWorkspaceSlug,
  slugifyWorkspaceName,
  type WorkspaceSlugErrorCode,
} from "@/shared/lib/membership/workspace-slug";
import { workspaceSlugErrorMessage } from "@/shared/lib/membership/workspace-slug-messages";

export async function isWorkspaceSlugTaken(slug: string, excludeOrgId?: string): Promise<boolean> {
  const whereClause =
    excludeOrgId === undefined
      ? eq(organization.slug, slug)
      : and(eq(organization.slug, slug), ne(organization.id, excludeOrgId));
  const [row] = await db.select({ id: organization.id }).from(organization).where(whereClause).limit(1);
  return Boolean(row);
}

export function resolveWorkspaceSlugInput(
  raw: unknown
): { ok: true; slug: string } | { ok: false; error: WorkspaceSlugErrorCode } {
  return parseWorkspaceSlug(raw);
}

export function resolveWorkspaceSlugForCreate(input: {
  slug?: unknown;
  name?: unknown;
}): { ok: true; slug: string } | { ok: false; error: WorkspaceSlugErrorCode } {
  const slugSource =
    typeof input.slug === "string" && input.slug.trim().length > 0
      ? input.slug
      : typeof input.name === "string"
        ? slugifyWorkspaceName(input.name)
        : "";
  return parseWorkspaceSlug(slugSource);
}

export async function assertWorkspaceSlugAvailableForUpdate(slug: string, organizationId: string): Promise<void> {
  if (await isWorkspaceSlugTaken(slug, organizationId)) {
    throw new APIError("BAD_REQUEST", {
      message: workspaceSlugErrorMessage("slug_taken"),
      code: "slug_taken",
    });
  }
}

export async function resolveWorkspaceSlugPatch(
  organizationId: string,
  raw: unknown
): Promise<
  | { ok: true; slug: string; changed: boolean }
  | { ok: false; error: WorkspaceSlugErrorCode | "not_found"; status: number }
> {
  const parsed = resolveWorkspaceSlugInput(raw);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error, status: 400 };
  }

  const [current] = await db
    .select({ slug: organization.slug })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);
  if (!current) {
    return { ok: false, error: "not_found", status: 404 };
  }
  if (current.slug === parsed.slug) {
    return { ok: true, slug: parsed.slug, changed: false };
  }
  if (await isWorkspaceSlugTaken(parsed.slug, organizationId)) {
    return { ok: false, error: "slug_taken", status: 409 };
  }
  return { ok: true, slug: parsed.slug, changed: true };
}
