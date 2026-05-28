import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { workspaceOwnershipTransferService } from "@/server/membership/workspace-ownership-transfer";
import { ownershipTransferErrorResponse } from "@/server/membership/workspace-ownership-transfer-http";

export const dynamic = "force-dynamic";

type CreateTransferBody = {
  organizationId?: unknown;
  toUserId?: unknown;
};

function parseCreateTransferBody(raw: unknown): { organizationId: string; toUserId: string } | { error: string } {
  if (!raw || typeof raw !== "object") {
    return { error: "invalid_body" };
  }
  const body = raw as CreateTransferBody;
  const organizationId = typeof body.organizationId === "string" ? body.organizationId.trim() : "";
  const toUserId = typeof body.toUserId === "string" ? body.toUserId.trim() : "";
  if (!organizationId || !toUserId) {
    return { error: "organizationId and toUserId required" };
  }
  return { organizationId, toUserId };
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = parseCreateTransferBody(await req.json().catch(() => null));
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const result = await workspaceOwnershipTransferService.createTransfer({
      organizationId: parsed.organizationId,
      fromUserId: userId,
      toUserId: parsed.toUserId,
    });
    return NextResponse.json(result);
  } catch (error) {
    const response = ownershipTransferErrorResponse(error);
    if (response) {
      return response;
    }
    throw error;
  }
}

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const organizationId = url.searchParams.get("organizationId")?.trim();
  if (organizationId) {
    try {
      const pending = await workspaceOwnershipTransferService.getPendingForOrganization(organizationId, userId);
      return NextResponse.json({ pending });
    } catch (error) {
      const response = ownershipTransferErrorResponse(error);
      if (response) {
        return response;
      }
      if (error instanceof Error && error.message === "forbidden") {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
      throw error;
    }
  }

  const incoming = await workspaceOwnershipTransferService.listPendingForUser(userId);
  return NextResponse.json({ transfers: incoming });
}
