"use client";

import { useDeferredLoadingIndicator } from "@codalyn/webflow-kit/react";
import { IconBuilding, IconMail, IconUserPlus, IconUsers } from "@tabler/icons-react";
import Link from "next/link";
import { type Dispatch, type SetStateAction, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  formatOperatorWorkspaceDeleteError,
  formatOperatorWorkspacePatchError,
  OperatorApiError,
  operatorApi,
} from "@/features/operator/api/client";
import { buildOperatorWorkspaceBillingOverridePatch } from "@/features/operator/lib/operator-workspace-billing-patch";
import { formatDateTime, formatRelative, initialsFor } from "@/features/operator/model/format";
import {
  OperatorDetailSheetAccessibleTitle,
  OperatorDetailSheetSkeleton,
} from "@/features/operator/ui/operator-detail-sheet-skeleton";
import {
  OperatorUsageLimitsSection,
  reloadWorkspaceUsageLimits,
} from "@/features/operator/ui/operator-usage-limits-section";
import { OperatorUsageTrendSection } from "@/features/operator/ui/operator-usage-trend-section";
import { OperatorWorkspaceBillingSection } from "@/features/operator/ui/operator-workspace-billing-section";
import type { OperatorWorkspaceDetail, OperatorWorkspacePatch, OperatorWorkspaceRow } from "@/server/operator/types";
import {
  formatTowerInvitationStatusLabel,
  towerInvitationBadgeVariant,
} from "@/shared/lib/membership/tower-invitation-status";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { FormField, FormFieldRow } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/ui/sheet";
import { DangerZoneTypedDelete } from "@/shared/ui/typed-confirm-alert-dialog";
import { WorkspaceSlugField } from "@/shared/ui/workspace-slug-field";

export type OperatorWorkspaceDetailSheetProps = {
  workspaceId: string | null;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onUpdated?: (row: OperatorWorkspaceRow) => void;
  onDeleted?: (id: string) => void;
};

function detailToRow(d: OperatorWorkspaceDetail): OperatorWorkspaceRow {
  return {
    id: d.id,
    name: d.name,
    slug: d.slug,
    logo: d.logo,
    seatLimit: d.seatLimit,
    effectiveSeatLimit: d.effectiveSeatLimit,
    isAtSeatCap: d.isAtSeatCap,
    isOverSeatCap: d.isOverSeatCap,
    billingPlan: d.billingPlan,
    subscriptionStatus: d.subscriptionStatus,
    stripeCustomerId: d.stripeCustomerId,
    stripeSubscriptionId: d.stripeSubscriptionId,
    billingMode: d.billingMode,
    billingManagedByStripe: d.billingManagedByStripe,
    isProEntitled: d.isProEntitled,
    displayBillingPlan: d.displayBillingPlan,
    planLabel: d.planLabel,
    canOperatorEditBilling: d.canOperatorEditBilling,
    canOperatorEditSeatLimit: d.canOperatorEditSeatLimit,
    operatorSeatLimitOverride: d.operatorSeatLimitOverride,
    stripeSeatQuantity: d.stripeSeatQuantity,
    memberCount: d.memberCount,
    pendingInvitations: d.pendingInvitations,
    usage: d.usage,
    createdAt: d.createdAt,
  };
}

export function OperatorWorkspaceDetailSheet(props: OperatorWorkspaceDetailSheetProps) {
  const { workspaceId, open, onOpenChange, onUpdated, onDeleted } = props;
  const [detail, setDetail] = useState<OperatorWorkspaceDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patchBusy, setPatchBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [slugDraft, setSlugDraft] = useState("");
  const [seatLimitDraft, setSeatLimitDraft] = useState("");
  const [billingPlanDraft, setBillingPlanDraft] = useState("");
  const [subscriptionStatusDraft, setSubscriptionStatusDraft] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const d = await operatorApi.getWorkspace(id);
      setDetail(d);
      setNameDraft(d.name);
      setSlugDraft(d.slug);
      setSeatLimitDraft(d.seatLimit === null ? "" : String(d.seatLimit));
      setBillingPlanDraft(d.billingPlan ?? "");
      setSubscriptionStatusDraft(d.subscriptionStatus ?? "");
    } catch (err) {
      setError(err instanceof OperatorApiError ? err.message : "Could not load workspace");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !workspaceId) {
      return;
    }
    void load(workspaceId);
  }, [open, workspaceId, load]);

  useEffect(() => {
    if (!open) {
      setDetail(null);
      setError(null);
      setDeleteConfirm("");
    }
  }, [open]);

  const patch = useCallback(
    async (update: OperatorWorkspacePatch) => {
      if (!detail) {
        return;
      }
      setPatchBusy(true);
      setError(null);
      try {
        const next = await operatorApi.patchWorkspace(detail.id, update);
        setDetail(next);
        setNameDraft(next.name);
        setSlugDraft(next.slug);
        setSeatLimitDraft(next.seatLimit === null ? "" : String(next.seatLimit));
        setBillingPlanDraft(next.billingPlan ?? "");
        setSubscriptionStatusDraft(next.subscriptionStatus ?? "");
        onUpdated?.(detailToRow(next));
        toast.success("Workspace updated");
      } catch (err) {
        const msg = err instanceof OperatorApiError ? formatOperatorWorkspacePatchError(err) : "Update failed";
        setError(msg);
        toast.error(msg);
      } finally {
        setPatchBusy(false);
      }
    },
    [detail, onUpdated]
  );

  const onRestoreStripeSeatSync = useCallback(() => {
    void patch({ clearOperatorSeatOverride: true });
  }, [patch]);

  const billingOverridesDirty = useMemo(() => {
    if (!detail) {
      return false;
    }
    const raw = seatLimitDraft.trim();
    const nextSeatLimit = raw === "" ? null : Number(raw);
    const seatDirty = nextSeatLimit !== detail.seatLimit;
    const billingDirty =
      billingPlanDraft !== (detail.billingPlan ?? "") || subscriptionStatusDraft !== (detail.subscriptionStatus ?? "");
    return seatDirty || billingDirty;
  }, [detail, seatLimitDraft, billingPlanDraft, subscriptionStatusDraft]);

  const onSaveName = useCallback(() => {
    const v = nameDraft.trim();
    if (!v || v === detail?.name) {
      return;
    }
    void patch({ name: v });
  }, [nameDraft, detail?.name, patch]);

  const onSaveSlug = useCallback(() => {
    const v = slugDraft.trim();
    if (!v || v === detail?.slug) {
      return;
    }
    void patch({ slug: v });
  }, [slugDraft, detail?.slug, patch]);

  const onSaveBillingOverrides = useCallback(() => {
    if (!detail) {
      return;
    }
    const result = buildOperatorWorkspaceBillingOverridePatch(detail, {
      seatLimitDraft,
      billingPlanDraft,
      subscriptionStatusDraft,
    });
    if (result === null) {
      return;
    }
    if ("error" in result) {
      setError(result.error);
      toast.error(result.error);
      return;
    }
    void patch(result);
  }, [billingPlanDraft, subscriptionStatusDraft, detail, patch, seatLimitDraft]);

  const onDelete = useCallback(async () => {
    if (!detail) {
      return;
    }
    setDeleteBusy(true);
    setError(null);
    try {
      await operatorApi.deleteWorkspace(detail.id, deleteConfirm);
      toast.success("Workspace deleted");
      onDeleted?.(detail.id);
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof OperatorApiError ? formatOperatorWorkspaceDeleteError(err) : "Delete failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setDeleteBusy(false);
    }
  }, [detail, deleteConfirm, onDeleted, onOpenChange]);

  const showPlaceholder = useDeferredLoadingIndicator(loading);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col p-0 sm:max-w-xl">
        <OperatorWorkspaceDetailSheetBody
          showPlaceholder={showPlaceholder}
          detail={detail}
          error={error}
          nameDraft={nameDraft}
          slugDraft={slugDraft}
          seatLimitDraft={seatLimitDraft}
          billingPlanDraft={billingPlanDraft}
          subscriptionStatusDraft={subscriptionStatusDraft}
          deleteConfirm={deleteConfirm}
          patchBusy={patchBusy}
          deleteBusy={deleteBusy}
          billingOverridesDirty={billingOverridesDirty}
          onNameDraftChange={setNameDraft}
          onSlugDraftChange={setSlugDraft}
          onSeatLimitDraftChange={setSeatLimitDraft}
          onBillingPlanDraftChange={setBillingPlanDraft}
          onSubscriptionStatusDraftChange={setSubscriptionStatusDraft}
          onDeleteConfirmChange={setDeleteConfirm}
          onOpenChange={onOpenChange}
          onSaveName={onSaveName}
          onSaveSlug={onSaveSlug}
          onSaveBillingOverrides={onSaveBillingOverrides}
          onRestoreStripeSeatSync={onRestoreStripeSeatSync}
          onDelete={onDelete}
          onUpdated={onUpdated}
          setDetail={setDetail}
        />
      </SheetContent>
    </Sheet>
  );
}

type OperatorWorkspaceDetailSheetBodyProps = {
  showPlaceholder: boolean;
  detail: OperatorWorkspaceDetail | null;
  error: string | null;
  nameDraft: string;
  slugDraft: string;
  seatLimitDraft: string;
  billingPlanDraft: string;
  subscriptionStatusDraft: string;
  deleteConfirm: string;
  patchBusy: boolean;
  deleteBusy: boolean;
  billingOverridesDirty: boolean;
  onNameDraftChange: (next: string) => void;
  onSlugDraftChange: (next: string) => void;
  onSeatLimitDraftChange: (next: string) => void;
  onBillingPlanDraftChange: (next: string) => void;
  onSubscriptionStatusDraftChange: (next: string) => void;
  onDeleteConfirmChange: (next: string) => void;
  onOpenChange: (open: boolean) => void;
  onSaveName: () => void;
  onSaveSlug: () => void;
  onSaveBillingOverrides: () => void;
  onRestoreStripeSeatSync: () => void;
  onDelete: () => void | Promise<void>;
  onUpdated?: (row: OperatorWorkspaceRow) => void;
  setDetail: Dispatch<SetStateAction<OperatorWorkspaceDetail | null>>;
};

function OperatorWorkspaceDetailSheetBody(props: OperatorWorkspaceDetailSheetBodyProps) {
  const {
    showPlaceholder,
    detail,
    error,
    nameDraft,
    slugDraft,
    seatLimitDraft,
    billingPlanDraft,
    subscriptionStatusDraft,
    deleteConfirm,
    patchBusy,
    deleteBusy,
    billingOverridesDirty,
    onNameDraftChange,
    onSlugDraftChange,
    onSeatLimitDraftChange,
    onBillingPlanDraftChange,
    onSubscriptionStatusDraftChange,
    onDeleteConfirmChange,
    onOpenChange,
    onSaveName,
    onSaveSlug,
    onSaveBillingOverrides,
    onRestoreStripeSeatSync,
    onDelete,
    onUpdated,
    setDetail,
  } = props;

  if (showPlaceholder) {
    return <OperatorDetailSheetSkeleton title="Workspace details" />;
  }
  if (!detail) {
    if (error) {
      return (
        <>
          <SheetHeader>
            <SheetTitle>Workspace details</SheetTitle>
          </SheetHeader>
          <SheetBody>
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </SheetFooter>
        </>
      );
    }
    return <OperatorDetailSheetAccessibleTitle title="Workspace details" />;
  }

  return (
    <>
      <SheetHeader>
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <IconBuilding className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <SheetTitle className="truncate">{detail.name}</SheetTitle>
            <SheetDescription className="truncate font-mono">{detail.slug}</SheetDescription>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge variant="outline">
                <IconUsers className="size-3" />
                {detail.memberCount} members
              </Badge>
              {detail.pendingInvitations > 0 ? (
                <Badge variant="outline">
                  <IconMail className="size-3" />
                  {detail.pendingInvitations} pending
                </Badge>
              ) : null}
              {detail.isOverSeatCap ? (
                <Badge variant="destructive">Over seat limit</Badge>
              ) : (
                <Badge variant={detail.billingMode === "free" ? "outline" : "secondary"}>{detail.planLabel}</Badge>
              )}
            </div>
          </div>
        </div>
      </SheetHeader>

      <SheetBody className="space-y-6">
        {error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        ) : null}

        <IdentitySection
          detail={detail}
          nameDraft={nameDraft}
          slugDraft={slugDraft}
          onNameDraftChange={onNameDraftChange}
          onSlugDraftChange={onSlugDraftChange}
          patchBusy={patchBusy}
          onSaveName={onSaveName}
          onSaveSlug={onSaveSlug}
        />
        <OperatorWorkspaceBillingSection
          detail={detail}
          billingPlanDraft={billingPlanDraft}
          onBillingPlanDraftChange={onBillingPlanDraftChange}
          subscriptionStatusDraft={subscriptionStatusDraft}
          onSubscriptionStatusDraftChange={onSubscriptionStatusDraftChange}
          seatLimitDraft={seatLimitDraft}
          onSeatLimitDraftChange={onSeatLimitDraftChange}
          overridesDirty={billingOverridesDirty}
          patchBusy={patchBusy}
          onSaveOverrides={onSaveBillingOverrides}
          onRestoreStripeSeatSync={onRestoreStripeSeatSync}
        />
        <OperatorUsageLimitsSection
          scope="workspace"
          usage={detail.usage}
          busy={patchBusy}
          onSave={async (update) => {
            const next = await operatorApi.patchWorkspace(detail.id, update);
            setDetail(next);
            onUpdated?.(detailToRow(next));
            return next.usage;
          }}
          onReset={async () => {
            await operatorApi.resetWorkspaceUsage(detail.id);
            const usage = await reloadWorkspaceUsageLimits(detail.id);
            setDetail((current) => (current ? { ...current, usage } : current));
            onUpdated?.(detailToRow({ ...detail, usage }));
            return usage;
          }}
        />

        <OperatorUsageTrendSection trend={detail.usageTrend} />
        <MembersSection members={detail.members} onCloseSheet={() => onOpenChange(false)} />
        <InvitationsSection invitations={detail.invitations} />

        <section className="space-y-3">
          <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Metadata</h3>
          <dl className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-card p-3 text-xs">
            <div>
              <dt className="text-muted-foreground">Workspace ID</dt>
              <dd className="truncate font-mono text-foreground" title={detail.id}>
                {detail.id}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd className="text-foreground">{formatDateTime(detail.createdAt)}</dd>
            </div>
          </dl>
        </section>

        <DangerZoneTypedDelete
          panelDescription={
            <>
              Permanently delete this workspace, its memberships, and invitations. Users keep their accounts and Webflow
              tokens.
            </>
          }
          triggerLabel="Delete workspace"
          title="Delete workspace?"
          confirmFieldLabel="Slug"
          confirmFieldId="confirm-slug"
          expectedValue={detail.slug}
          confirmValue={deleteConfirm}
          onConfirmValueChange={onDeleteConfirmChange}
          busy={deleteBusy}
          onConfirm={() => void onDelete()}
        />
      </SheetBody>

      <SheetFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      </SheetFooter>
    </>
  );
}

function IdentitySection({
  detail,
  nameDraft,
  slugDraft,
  onNameDraftChange,
  onSlugDraftChange,
  patchBusy,
  onSaveName,
  onSaveSlug,
}: {
  detail: OperatorWorkspaceDetail;
  nameDraft: string;
  slugDraft: string;
  onNameDraftChange: (next: string) => void;
  onSlugDraftChange: (next: string) => void;
  patchBusy: boolean;
  onSaveName: () => void;
  onSaveSlug: () => void;
}) {
  const nameDisabled = patchBusy || nameDraft.trim() === "" || nameDraft.trim() === detail.name;
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Identity</h3>
      <div className="space-y-3 rounded-lg border border-border bg-card p-3">
        <FormField>
          <Label htmlFor="workspace-name">Name</Label>
          <FormFieldRow>
            <Input id="workspace-name" value={nameDraft} onChange={(event) => onNameDraftChange(event.target.value)} />
            <Button type="button" size="sm" variant="outline" disabled={nameDisabled} onClick={onSaveName}>
              Save
            </Button>
          </FormFieldRow>
        </FormField>
        <WorkspaceSlugField
          id="workspace-slug"
          value={slugDraft}
          currentSlug={detail.slug}
          busy={patchBusy}
          onChange={onSlugDraftChange}
          onSave={onSaveSlug}
        />
        <p className="text-xs text-muted-foreground">
          Metadata: <span className="font-mono">{detail.metadata ?? "—"}</span>
        </p>
      </div>
    </section>
  );
}

function MembersSection({
  members,
  onCloseSheet,
}: {
  members: OperatorWorkspaceDetail["members"];
  onCloseSheet: () => void;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
        Members ({members.length})
      </h3>
      <div className="rounded-lg border border-border">
        {members.length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground">No members yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {members.map((m) => (
              <li key={m.memberId} className="flex items-center gap-3 p-3">
                <Avatar className="size-7">
                  <AvatarFallback>{initialsFor(m.name || m.email)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.name || m.email}</p>
                  <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                </div>
                <Badge variant="outline" className="shrink-0">
                  {m.role}
                </Badge>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/console/customers?id=${encodeURIComponent(m.userId)}`} onClick={onCloseSheet}>
                    Open
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function InvitationsSection({ invitations }: { invitations: OperatorWorkspaceDetail["invitations"] }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
        Invitations ({invitations.length})
      </h3>
      <div className="rounded-lg border border-border">
        {invitations.length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground">No invitations.</p>
        ) : (
          <ul className="divide-y divide-border">
            {invitations.map((inv) => (
              <li key={inv.id} className="flex items-center gap-3 p-3">
                <span className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <IconUserPlus className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{inv.email}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    by {inv.inviterEmail ?? "—"} · exp {formatRelative(inv.expiresAt)}
                  </p>
                </div>
                <Badge variant={towerInvitationBadgeVariant(inv.status)} className="shrink-0">
                  {formatTowerInvitationStatusLabel(inv.status)}
                </Badge>
                {inv.role ? (
                  <Badge variant="outline" className="shrink-0">
                    {inv.role}
                  </Badge>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
