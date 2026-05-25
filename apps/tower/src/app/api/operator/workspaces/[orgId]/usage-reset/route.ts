import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireProductAdmin } from "@/server/operator/require-product-admin";
import { resetOperatorWorkspaceMemberUsage } from "@/server/operator/usage-limits";
import { db } from "@/shared/lib/db";
import { organization } from "@/shared/lib/db/auth-schema";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ orgId: string }> }
): Promise<NextResponse<{ ok: true } | { error: string }>> {
  const authRes = await requireProductAdmin();
  if (!authRes.ok) {
    return authRes.response;
  }

  const { orgId } = await ctx.params;
  const [target] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1);
  if (!target) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await resetOperatorWorkspaceMemberUsage(orgId);
  return NextResponse.json({ ok: true });
}
