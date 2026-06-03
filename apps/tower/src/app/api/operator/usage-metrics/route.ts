import { NextResponse } from "next/server";
import { requireProductAdmin } from "@/server/operator/require-product-admin";
import type { OperatorUsageMetrics } from "@/server/operator/types";
import { fetchOperatorUsageMetrics } from "@/server/operator/usage-metrics";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse<OperatorUsageMetrics | { error: string }>> {
  const auth = await requireProductAdmin();
  if (!auth.ok) {
    return auth.response;
  }
  const metrics = await fetchOperatorUsageMetrics();
  return NextResponse.json(metrics);
}
