import { NextResponse } from "next/server";
import { WorkspaceOwnershipTransferError } from "@/server/membership/workspace-ownership-transfer";

function ownershipTransferErrorStatus(code: WorkspaceOwnershipTransferError["code"]): number {
  switch (code) {
    case "not_found":
      return 404;
    case "forbidden":
      return 403;
    case "pending_exists":
      return 409;
    case "billing_setup_required":
      return 409;
    case "expired":
      return 410;
    default:
      return 400;
  }
}

export function ownershipTransferErrorResponse(error: unknown): NextResponse<{ error: string; code?: string }> | null {
  if (error instanceof WorkspaceOwnershipTransferError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: ownershipTransferErrorStatus(error.code) }
    );
  }
  return null;
}
