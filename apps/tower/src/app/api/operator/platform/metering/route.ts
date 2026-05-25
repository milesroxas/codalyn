import { NextResponse } from "next/server";
import {
  fetchOperatorPlatformMeteringConfig,
  sanitizeOperatorPlatformMeteringPatch,
  saveOperatorPlatformMeteringConfig,
} from "@/server/operator/platform-metering";
import { requireProductAdmin } from "@/server/operator/require-product-admin";
import type { OperatorPlatformMeteringConfig } from "@/server/operator/types";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse<OperatorPlatformMeteringConfig | { error: string }>> {
  const auth = await requireProductAdmin();
  if (!auth.ok) {
    return auth.response;
  }
  return NextResponse.json(await fetchOperatorPlatformMeteringConfig());
}

export async function PATCH(req: Request): Promise<NextResponse<OperatorPlatformMeteringConfig | { error: string }>> {
  const auth = await requireProductAdmin();
  if (!auth.ok) {
    return auth.response;
  }
  const raw = (await req.json().catch(() => null)) as unknown;
  const parsed = sanitizeOperatorPlatformMeteringPatch(raw);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  if (Object.keys(parsed).length === 0) {
    return NextResponse.json({ error: "empty_patch" }, { status: 400 });
  }
  return NextResponse.json(await saveOperatorPlatformMeteringConfig(parsed));
}
