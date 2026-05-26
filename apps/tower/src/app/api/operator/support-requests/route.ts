import { NextResponse } from "next/server";
import { requireProductAdmin } from "@/server/operator/require-product-admin";
import {
  listSupportRequests,
  parseSupportRequestListKind,
  parseSupportRequestListStatus,
} from "@/server/support/support-request";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireProductAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  const url = new URL(req.url);
  const status = parseSupportRequestListStatus(url.searchParams.get("status"));
  const kind = parseSupportRequestListKind(url.searchParams.get("kind"));
  const rows = await listSupportRequests({ status, kind });

  return NextResponse.json({
    rows: rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      topic: row.topic,
      details: row.details,
      email: row.email,
      userId: row.userId,
      status: row.status,
      operatorNote: row.operatorNote,
      createdAt: row.createdAt.toISOString(),
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
      resolvedByUserId: row.resolvedByUserId,
    })),
  });
}
