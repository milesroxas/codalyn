"use client";

import { IconCreditCard } from "@tabler/icons-react";
import { WorkspaceSeatUsageBlock } from "@/features/billing/ui/workspace-seat-usage-block";
import { operatorWorkspaceBillingModeDescription } from "@/features/operator/lib/operator-workspace-billing-copy";
import type { OperatorWorkspaceDetail } from "@/server/operator/types";
import { buildWorkspaceSeatUsage } from "@/shared/lib/billing/workspace-seat-usage";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { FormField, FormFieldGrid, FormFieldRow } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

export type OperatorWorkspaceBillingSectionProps = {
  detail: OperatorWorkspaceDetail;
  billingPlanDraft: string;
  subscriptionStatusDraft: string;
  seatLimitDraft: string;
  onBillingPlanDraftChange: (next: string) => void;
  onSubscriptionStatusDraftChange: (next: string) => void;
  onSeatLimitDraftChange: (next: string) => void;
  overridesDirty: boolean;
  patchBusy: boolean;
  onSaveOverrides: () => void;
  onRestoreStripeSeatSync: () => void;
};

function WorkspaceBillingSummary(props: { detail: OperatorWorkspaceDetail }) {
  const { detail } = props;
  const seatsUsed = detail.memberCount + detail.pendingInvitations;
  const seatUsage = buildWorkspaceSeatUsage(seatsUsed, {
    seatLimit: detail.seatLimit,
    stripeSeatQuantity: detail.stripeSeatQuantity,
    operatorSeatLimitOverride: detail.operatorSeatLimitOverride,
  });

  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-3">
      <div>
        <dt className="text-xs text-muted-foreground">Plan</dt>
        <dd className="mt-1">
          <Badge variant={detail.billingMode === "free" ? "outline" : "secondary"}>{detail.planLabel}</Badge>
        </dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Subscription</dt>
        <dd className="mt-1 font-mono text-xs text-foreground">{detail.subscriptionStatus ?? "—"}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Seats</dt>
        <dd className="mt-1">
          <WorkspaceSeatUsageBlock usage={seatUsage} />
        </dd>
      </div>
    </dl>
  );
}

function StripeBillingReferences(props: { detail: OperatorWorkspaceDetail }) {
  const { detail } = props;
  if (!detail.stripeCustomerId && !detail.stripeSubscriptionId) {
    return null;
  }
  return (
    <dl className="grid gap-2 rounded-md border border-border bg-muted/30 p-3 text-xs">
      <div>
        <dt className="text-muted-foreground">Stripe customer</dt>
        <dd className="truncate font-mono text-foreground" title={detail.stripeCustomerId ?? undefined}>
          {detail.stripeCustomerId ?? "—"}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Stripe subscription</dt>
        <dd className="truncate font-mono text-foreground" title={detail.stripeSubscriptionId ?? undefined}>
          {detail.stripeSubscriptionId ?? "—"}
        </dd>
      </div>
    </dl>
  );
}

function OperatorSeatLimitForm(
  props: Pick<
    OperatorWorkspaceBillingSectionProps,
    | "detail"
    | "seatLimitDraft"
    | "onSeatLimitDraftChange"
    | "overridesDirty"
    | "patchBusy"
    | "onSaveOverrides"
    | "onRestoreStripeSeatSync"
  >
) {
  const {
    detail,
    seatLimitDraft,
    onSeatLimitDraftChange,
    overridesDirty,
    patchBusy,
    onSaveOverrides,
    onRestoreStripeSeatSync,
  } = props;

  if (!detail.canOperatorEditSeatLimit) {
    return null;
  }

  return (
    <div className="space-y-3 border-t border-border pt-3">
      <p className="text-xs font-medium text-foreground">Seat cap</p>
      {detail.billingMode === "stripe_team" ? (
        <p className="text-xs text-muted-foreground">
          Raising the cap grants extra seats without updating the Stripe subscription quantity or charging the customer
          more.
        </p>
      ) : null}
      <FormField>
        <Label htmlFor="workspace-seat-limit">Effective seat limit (blank = solo free cap)</Label>
        <FormFieldRow>
          <Input
            id="workspace-seat-limit"
            type="number"
            min={1}
            step={1}
            value={seatLimitDraft}
            onChange={(event) => onSeatLimitDraftChange(event.target.value)}
          />
        </FormFieldRow>
      </FormField>
      <div className="flex flex-wrap justify-end gap-2">
        {detail.billingMode === "stripe_team" && detail.operatorSeatLimitOverride ? (
          <Button type="button" size="sm" variant="ghost" disabled={patchBusy} onClick={onRestoreStripeSeatSync}>
            Restore Stripe seat sync
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={patchBusy || !overridesDirty}
          onClick={onSaveOverrides}
        >
          Save seat cap
        </Button>
      </div>
    </div>
  );
}

function OperatorBillingMetadataForm(
  props: Pick<
    OperatorWorkspaceBillingSectionProps,
    | "billingPlanDraft"
    | "subscriptionStatusDraft"
    | "onBillingPlanDraftChange"
    | "onSubscriptionStatusDraftChange"
    | "overridesDirty"
    | "patchBusy"
    | "onSaveOverrides"
  >
) {
  const {
    billingPlanDraft,
    subscriptionStatusDraft,
    onBillingPlanDraftChange,
    onSubscriptionStatusDraftChange,
    overridesDirty,
    patchBusy,
    onSaveOverrides,
  } = props;

  return (
    <div className="space-y-3 border-t border-border pt-3">
      <p className="text-xs font-medium text-foreground">Billing metadata</p>
      <FormFieldGrid className="sm:grid-cols-2">
        <FormField>
          <Label htmlFor="billing-plan">Plan label</Label>
          <Input
            id="billing-plan"
            value={billingPlanDraft}
            onChange={(event) => onBillingPlanDraftChange(event.target.value)}
            placeholder="pro team · pro+"
          />
        </FormField>
        <FormField>
          <Label htmlFor="subscription-status">Subscription status</Label>
          <Input
            id="subscription-status"
            value={subscriptionStatusDraft}
            onChange={(event) => onSubscriptionStatusDraftChange(event.target.value)}
            placeholder="active · past_due · canceled"
          />
        </FormField>
      </FormFieldGrid>
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={patchBusy || !overridesDirty}
          onClick={onSaveOverrides}
        >
          Save billing metadata
        </Button>
      </div>
    </div>
  );
}

export function OperatorWorkspaceBillingSection(props: OperatorWorkspaceBillingSectionProps) {
  const { detail, overridesDirty, patchBusy, onSaveOverrides, onRestoreStripeSeatSync, ...draftProps } = props;
  const seatsUsed = detail.memberCount + detail.pendingInvitations;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <IconCreditCard className="size-4 text-muted-foreground" aria-hidden />
        <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Team & billing</h3>
      </div>
      <div className="space-y-4 rounded-lg border border-border bg-card p-3">
        <WorkspaceBillingSummary detail={detail} />
        <p className="text-xs text-muted-foreground">{operatorWorkspaceBillingModeDescription(detail.billingMode)}</p>

        {detail.pendingInvitations > 0 ? (
          <p className="text-xs text-muted-foreground">
            Includes <span className="text-foreground">{detail.pendingInvitations}</span> pending invite
            {detail.pendingInvitations === 1 ? "" : "s"} in seat usage ({seatsUsed} total).
          </p>
        ) : null}

        {detail.isOverSeatCap ? (
          <p className="text-xs text-destructive">
            Over seat limit ({seatsUsed}/{detail.effectiveSeatLimit}). Remove members or restore Team billing before
            inviting.
          </p>
        ) : null}

        {detail.billingMode === "stripe_team" ? <StripeBillingReferences detail={detail} /> : null}

        <OperatorSeatLimitForm
          detail={detail}
          seatLimitDraft={draftProps.seatLimitDraft}
          onSeatLimitDraftChange={draftProps.onSeatLimitDraftChange}
          overridesDirty={overridesDirty}
          patchBusy={patchBusy}
          onSaveOverrides={onSaveOverrides}
          onRestoreStripeSeatSync={onRestoreStripeSeatSync}
        />

        {detail.canOperatorEditBilling ? (
          <OperatorBillingMetadataForm
            billingPlanDraft={draftProps.billingPlanDraft}
            subscriptionStatusDraft={draftProps.subscriptionStatusDraft}
            onBillingPlanDraftChange={draftProps.onBillingPlanDraftChange}
            onSubscriptionStatusDraftChange={draftProps.onSubscriptionStatusDraftChange}
            overridesDirty={overridesDirty}
            patchBusy={patchBusy}
            onSaveOverrides={onSaveOverrides}
          />
        ) : null}
      </div>
    </section>
  );
}
