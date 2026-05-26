import { NextResponse } from "next/server";
import { WorkspaceDeletionError } from "@/server/membership/delete-workspace";
import { DestructiveActionRateLimitError } from "@/server/security/destructive-action-rate-limit";
import type { WorkspaceDeletionErrorCode } from "@/shared/lib/membership/workspace-deletion";

export type WorkspaceDeleteConfirmBody = {
  confirmSlug?: unknown;
};

export function parseWorkspaceDeleteConfirmBody(raw: unknown): { confirmSlug: string } | { error: string } {
  if (!raw || typeof raw !== "object") {
    return { error: "invalid_body" };
  }
  const body = raw as WorkspaceDeleteConfirmBody;
  const confirmSlug = typeof body.confirmSlug === "string" ? body.confirmSlug : "";
  if (!confirmSlug.trim()) {
    return { error: "confirmSlug required" };
  }
  return { confirmSlug };
}

export function workspaceDeletionErrorStatus(code: WorkspaceDeletionErrorCode): number {
  switch (code) {
    case "not_found":
      return 404;
    case "forbidden":
      return 403;
    case "deletion_incomplete":
      return 503;
    default:
      return 400;
  }
}

export function workspaceDeleteErrorResponse(error: unknown): NextResponse<{ error: string }> | null {
  if (error instanceof WorkspaceDeletionError) {
    return NextResponse.json({ error: error.code }, { status: workspaceDeletionErrorStatus(error.code) });
  }
  if (error instanceof DestructiveActionRateLimitError) {
    return NextResponse.json({ error: error.code }, { status: 429 });
  }
  return null;
}
