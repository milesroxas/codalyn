export type WorkspaceDeletionErrorCode = "not_found" | "confirm_mismatch" | "forbidden" | "deletion_incomplete";

export function workspaceSlugConfirmationMatches(confirmSlug: string, expectedSlug: string): boolean {
  return confirmSlug.trim().toLowerCase() === expectedSlug.trim().toLowerCase();
}

export function assertWorkspaceSlugConfirmation(
  confirmSlug: string,
  expectedSlug: string
): { ok: true } | { ok: false; code: "confirm_mismatch" } {
  if (!workspaceSlugConfirmationMatches(confirmSlug, expectedSlug)) {
    return { ok: false, code: "confirm_mismatch" };
  }
  return { ok: true };
}
