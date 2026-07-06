import { NextResponse } from "next/server";
import { WorkspaceDeletionError } from "@/server/membership/delete-workspace";
import { DestructiveActionRateLimitError } from "@/server/security/destructive-action-rate-limit";
import type { WorkspaceDeletionErrorCode } from "@/shared/lib/membership/workspace-deletion";

export type WorkspaceDeleteConfirmBody = {
  confirmSlug?: unknown;
  /** Required when operator purges a soft-deleted workspace (`PURGE`). */
  confirmPhrase?: unknown;
};

type OwnerWorkspaceDeleteBody = {
  organizationId?: unknown;
  confirmSlug?: unknown;
  password?: unknown;
};

/** Owner-initiated delete/purge routes: organizationId + slug confirmation + password re-authentication. */
export function parseOwnerWorkspaceDeleteBody(
  raw: unknown
): { organizationId: string; confirmSlug: string; password: string } | { error: string } {
  if (!raw || typeof raw !== "object") {
    return { error: "invalid_body" };
  }
  const body = raw as OwnerWorkspaceDeleteBody;
  const organizationId = typeof body.organizationId === "string" ? body.organizationId.trim() : "";
  const confirmSlug = typeof body.confirmSlug === "string" ? body.confirmSlug : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!organizationId) {
    return { error: "organizationId required" };
  }
  if (!confirmSlug.trim()) {
    return { error: "confirmSlug required" };
  }
  if (!password.trim()) {
    return { error: "password required" };
  }
  return { organizationId, confirmSlug, password };
}

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

export function parseOperatorWorkspacePurgePhrase(
  raw: unknown
): { confirmSlug: string; confirmPhrase: string } | { error: string } {
  const slugParsed = parseWorkspaceDeleteConfirmBody(raw);
  if ("error" in slugParsed) {
    return slugParsed;
  }
  if (!raw || typeof raw !== "object") {
    return { error: "invalid_body" };
  }
  const body = raw as WorkspaceDeleteConfirmBody;
  const confirmPhrase = typeof body.confirmPhrase === "string" ? body.confirmPhrase : "";
  if (!confirmPhrase.trim()) {
    return { error: "confirmPhrase required" };
  }
  return { confirmSlug: slugParsed.confirmSlug, confirmPhrase };
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
