import { eq } from "drizzle-orm";
import { syncOrganizationSeatQuantityWithStripe } from "@/server/billing/stripe-org-seat-sync";
import { resolveWorkspaceSlugPatch } from "@/server/membership/workspace-slug-update";
import { resolveOperatorStripeManagedPatchConflict } from "@/server/operator/operator-billing";
import {
  type OperatorWorkspaceSeatPatchPlan,
  planOperatorWorkspaceSeatPatch,
} from "@/server/operator/operator-workspace-seat-patch";
import type { OperatorWorkspacePatch } from "@/server/operator/types";
import { usageLimitsPatchToDbUpdates } from "@/server/operator/usage-limits";
import { db } from "@/shared/lib/db";
import { organization } from "@/shared/lib/db/auth-schema";

export type OperatorWorkspacePatchApplyError = {
  ok: false;
  status: number;
  error: string;
};

export type OperatorWorkspacePatchApplySuccess = {
  ok: true;
};

export type OperatorWorkspacePatchApplyResult = OperatorWorkspacePatchApplyError | OperatorWorkspacePatchApplySuccess;

function buildOperatorWorkspacePatchDbUpdates(
  parsed: OperatorWorkspacePatch,
  seatPlan: OperatorWorkspaceSeatPatchPlan
): Record<string, unknown> {
  const updates: Record<string, unknown> = {};
  if (parsed.name !== undefined) {
    updates.name = parsed.name;
  }
  if (parsed.slug !== undefined) {
    updates.slug = parsed.slug;
  }
  if (parsed.billingPlan !== undefined) {
    updates.billingPlan = parsed.billingPlan;
  }
  if (parsed.subscriptionStatus !== undefined) {
    updates.subscriptionStatus = parsed.subscriptionStatus;
  }
  Object.assign(updates, usageLimitsPatchToDbUpdates(parsed));

  if (seatPlan.seatLimit !== undefined) {
    updates.seatLimit = seatPlan.seatLimit;
  }
  if (seatPlan.operatorSeatLimitOverride !== undefined) {
    updates.operatorSeatLimitOverride = seatPlan.operatorSeatLimitOverride;
  }

  return updates;
}

async function resolveOperatorWorkspaceSlugUpdate(
  orgId: string,
  updates: Record<string, unknown>
): Promise<OperatorWorkspacePatchApplyResult> {
  if (!("slug" in updates)) {
    return { ok: true };
  }

  const slugPatch = await resolveWorkspaceSlugPatch(orgId, updates.slug);
  if (!slugPatch.ok) {
    return { ok: false, status: slugPatch.status, error: slugPatch.error };
  }
  if (!slugPatch.changed) {
    delete updates.slug;
  } else {
    updates.slug = slugPatch.slug;
  }
  return { ok: true };
}

export async function applyOperatorWorkspacePatch(
  orgId: string,
  parsed: OperatorWorkspacePatch
): Promise<OperatorWorkspacePatchApplyResult> {
  const [orgRow] = await db
    .select({
      stripeSubscriptionId: organization.stripeSubscriptionId,
      deletedAt: organization.deletedAt,
    })
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1);

  if (!orgRow) {
    return { ok: false, status: 404, error: "not_found" };
  }
  if (orgRow.deletedAt) {
    return { ok: false, status: 409, error: "workspace_scheduled_for_deletion" };
  }

  const stripeSubscriptionId = orgRow.stripeSubscriptionId ?? null;

  if ("billingPlan" in parsed || "subscriptionStatus" in parsed) {
    const conflict = resolveOperatorStripeManagedPatchConflict(stripeSubscriptionId, parsed);
    if (conflict) {
      return { ok: false, status: 409, error: conflict };
    }
  }

  const seatPatchResult = await planOperatorWorkspaceSeatPatch(orgId, stripeSubscriptionId, {
    seatLimit: "seatLimit" in parsed ? parsed.seatLimit : undefined,
    clearOperatorSeatOverride: parsed.clearOperatorSeatOverride,
  });
  if ("error" in seatPatchResult) {
    return { ok: false, status: 400, error: seatPatchResult.error };
  }

  const updates = buildOperatorWorkspacePatchDbUpdates(parsed, seatPatchResult.plan);
  const slugResult = await resolveOperatorWorkspaceSlugUpdate(orgId, updates);
  if (!slugResult.ok) {
    return slugResult;
  }

  if (Object.keys(updates).length > 0) {
    await db.update(organization).set(updates).where(eq(organization.id, orgId));
  }

  if (seatPatchResult.plan.clearOperatorSeatOverride === true) {
    await syncOrganizationSeatQuantityWithStripe(orgId);
  }

  return { ok: true };
}
