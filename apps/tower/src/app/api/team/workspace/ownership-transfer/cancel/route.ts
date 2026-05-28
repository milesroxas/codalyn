import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { workspaceOwnershipTransferService } from "@/server/membership/workspace-ownership-transfer";
import { ownershipTransferErrorResponse } from "@/server/membership/workspace-ownership-transfer-http";

export const dynamic = "force-dynamic";

type TransferActionBody = {
  transferId?: unknown;
};

function parseTransferId(raw: unknown): { transferId: string } | { error: string } {
  if (!raw || typeof raw !== "object") {
    return { error: "invalid_body" };
  }
  const body = raw as TransferActionBody;
  const transferId = typeof body.transferId === "string" ? body.transferId.trim() : "";
  if (!transferId) {
    return { error: "transferId required" };
  }
  return { transferId };
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = parseTransferId(await req.json().catch(() => null));
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    await workspaceOwnershipTransferService.cancelTransfer({
      transferId: parsed.transferId,
      ownerUserId: userId,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const response = ownershipTransferErrorResponse(error);
    if (response) {
      return response;
    }
    throw error;
  }
}
