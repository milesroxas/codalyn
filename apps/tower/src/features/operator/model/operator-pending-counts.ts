import type { OperatorMetrics } from "@/server/operator/types";

export type OperatorPendingCountKey = "pendingEarlyAccessRequests" | "pendingSupportRequests";

export const OPERATOR_NAV_PENDING_COUNT_KEYS: Partial<Record<string, OperatorPendingCountKey>> = {
  "/console/access-requests": "pendingEarlyAccessRequests",
  "/console/support-requests": "pendingSupportRequests",
};

export function operatorPendingCountForHref(href: string, totals: OperatorMetrics["totals"] | undefined): number {
  const key = OPERATOR_NAV_PENDING_COUNT_KEYS[href];
  if (!key || !totals) {
    return 0;
  }
  return totals[key];
}
