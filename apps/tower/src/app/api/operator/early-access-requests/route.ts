import { NextResponse } from "next/server";
import { listEarlyAccessRequests } from "@/server/access/early-access-request";
import { requireProductAdmin } from "@/server/operator/require-product-admin";

export const dynamic = "force-dynamic";

function parseStatus(raw: string | null): "pending" | "approved" | "dismissed" | "all" {
  if (raw === "approved" || raw === "dismissed" || raw === "all") {
    return raw;
  }
  return "pending";
}

export async function GET(req: Request) {
  const auth = await requireProductAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  const url = new URL(req.url);
  const status = parseStatus(url.searchParams.get("status"));
  const rows = await listEarlyAccessRequests(status);

  return NextResponse.json({
    rows: rows.map((row) => ({
      id: row.id,
      email: row.email,
      name: row.name,
      note: row.note,
      teamMemberEmails: row.teamMemberEmails,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
      resolvedByUserId: row.resolvedByUserId,
    })),
  });
}
