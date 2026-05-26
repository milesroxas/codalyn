import type { WorkspaceSlugErrorCode } from "@/shared/lib/membership/workspace-slug";

const WORKSPACE_SLUG_ERROR_MESSAGES: Record<WorkspaceSlugErrorCode, string> = {
  invalid_slug: "Slug must use lowercase letters, numbers, and hyphens (1–80 characters).",
  slug_empty: "Slug is required.",
  slug_reserved: "That slug is reserved. Choose another.",
  slug_taken: "That slug is already in use. Choose another.",
};

export function workspaceSlugErrorMessage(error: WorkspaceSlugErrorCode | string): string {
  if (error in WORKSPACE_SLUG_ERROR_MESSAGES) {
    return WORKSPACE_SLUG_ERROR_MESSAGES[error as WorkspaceSlugErrorCode];
  }
  if (error === "ORGANIZATION_SLUG_ALREADY_TAKEN" || error === "Organization slug already taken") {
    return WORKSPACE_SLUG_ERROR_MESSAGES.slug_taken;
  }
  return error;
}
