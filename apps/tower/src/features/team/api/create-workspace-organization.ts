import { authClient } from "@/features/auth/model/auth-client";
import { slugifyWorkspaceName } from "@/shared/lib/membership/workspace-slug";

export async function createWorkspaceOrganization(
  name: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, message: "Workspace name is required" };
  }

  const res = await authClient.organization.create({
    name: trimmed,
    slug: slugifyWorkspaceName(trimmed),
  });
  if (res.error) {
    return { ok: false, message: res.error.message ?? "Could not create workspace" };
  }

  return { ok: true };
}
