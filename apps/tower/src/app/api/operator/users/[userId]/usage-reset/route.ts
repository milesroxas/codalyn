import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireProductAdmin } from "@/server/operator/require-product-admin";
import { resetOperatorUserUsage } from "@/server/operator/usage-limits";
import { db } from "@/shared/lib/db";
import { user } from "@/shared/lib/db/auth-schema";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ userId: string }> }
): Promise<NextResponse<{ ok: true } | { error: string }>> {
  const authRes = await requireProductAdmin();
  if (!authRes.ok) {
    return authRes.response;
  }

  const { userId } = await ctx.params;
  const [target] = await db.select({ id: user.id }).from(user).where(eq(user.id, userId)).limit(1);
  if (!target) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await resetOperatorUserUsage(userId);
  return NextResponse.json({ ok: true });
}
