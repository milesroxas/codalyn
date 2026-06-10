import { NextResponse } from "next/server";
import {
  listFlintBetaGroupRequests,
  parseFlintBetaGroupRequestListStatus,
} from "@/server/marketing/flint-beta-group-request";
import { requireProductAdmin } from "@/server/operator/require-product-admin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireProductAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  const url = new URL(req.url);
  const status = parseFlintBetaGroupRequestListStatus(url.searchParams.get("status"));
  const rows = await listFlintBetaGroupRequests(status);

  return NextResponse.json({
    rows: rows.map((row) => ({
      id: row.id,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      status: row.status,
      operatorNote: row.operatorNote,
      createdAt: row.createdAt.toISOString(),
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
      resolvedByUserId: row.resolvedByUserId,
    })),
  });
}
