export type WorkspaceDeletionErrorCode =
  | "not_found"
  | "confirm_mismatch"
  | "confirm_phrase_mismatch"
  | "forbidden"
  | "deletion_incomplete";

/** Operator-only second factor when permanently purging a soft-deleted workspace. */
export const OPERATOR_WORKSPACE_PURGE_CONFIRM_PHRASE = "PURGE";

export function operatorWorkspacePurgePhraseMatches(phrase: string): boolean {
  return phrase.trim().toUpperCase() === OPERATOR_WORKSPACE_PURGE_CONFIRM_PHRASE;
}

function workspaceSlugConfirmationMatches(confirmSlug: string, expectedSlug: string): boolean {
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
