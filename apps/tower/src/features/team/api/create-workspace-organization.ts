import { authClient } from "@/features/auth/model/auth-client";
import {
  findOrganizationIdBySlug,
  readOrganizationIdFromCreateResponse,
} from "@/features/team/lib/create-workspace-response";
import { slugifyWorkspaceName } from "@/shared/lib/membership/workspace-slug";

export type CreateWorkspaceOrganizationResult =
  | { ok: true; organizationId: string | null; activated: boolean }
  | { ok: false; message: string };

async function resolveCreatedOrganizationId(slug: string, createData: unknown): Promise<string | null> {
  const fromCreate = readOrganizationIdFromCreateResponse(createData);
  if (fromCreate) {
    return fromCreate;
  }

  const list = await authClient.organization.list();
  if (list.error) {
    return null;
  }
  return findOrganizationIdBySlug(list.data, slug);
}

export async function createWorkspaceOrganization(name: string): Promise<CreateWorkspaceOrganizationResult> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, message: "Workspace name is required" };
  }

  const slug = slugifyWorkspaceName(trimmed);
  const res = await authClient.organization.create({
    name: trimmed,
    slug,
  });
  if (res.error) {
    return { ok: false, message: res.error.message ?? "Could not create workspace" };
  }

  const organizationId = await resolveCreatedOrganizationId(slug, res.data);
  if (!organizationId) {
    return { ok: true, organizationId: null, activated: false };
  }

  const active = await authClient.organization.setActive({ organizationId });
  if (active.error) {
    return { ok: true, organizationId, activated: false };
  }

  return { ok: true, organizationId, activated: true };
}
