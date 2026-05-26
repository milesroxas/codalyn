"use client";

import {
  IconAlertTriangle,
  IconBuilding,
  IconCreditCard,
  IconMail,
  IconTrash,
  IconUserPlus,
  IconUsers,
} from "@tabler/icons-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { OperatorApiError, operatorApi } from "@/features/operator/api/client";
import { formatDateTime, formatRelative, initialsFor } from "@/features/operator/model/format";
import {
  OperatorUsageLimitsSection,
  reloadWorkspaceUsageLimits,
} from "@/features/operator/ui/operator-usage-limits-section";
import type { OperatorWorkspaceDetail, OperatorWorkspacePatch, OperatorWorkspaceRow } from "@/server/operator/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
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
import { Skeleton } from "@/shared/ui/skeleton";

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
    billingPlan: d.billingPlan,
    subscriptionStatus: d.subscriptionStatus,
    stripeCustomerId: d.stripeCustomerId,
    stripeSubscriptionId: d.stripeSubscriptionId,
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
        setSeatLimitDraft(next.seatLimit === null ? "" : String(next.seatLimit));
        setBillingPlanDraft(next.billingPlan ?? "");
        setSubscriptionStatusDraft(next.subscriptionStatus ?? "");
        onUpdated?.(detailToRow(next));
        toast.success("Workspace updated");
      } catch (err) {
        const msg = err instanceof OperatorApiError ? err.message : "Update failed";
        setError(msg);
        toast.error(msg);
      } finally {
        setPatchBusy(false);
      }
    },
    [detail, onUpdated]
  );

  const seatLimitDirty = useMemo(() => {
    if (!detail) {
      return false;
    }
    const raw = seatLimitDraft.trim();
    const next = raw === "" ? null : Number(raw);
    return next !== detail.seatLimit;
  }, [detail, seatLimitDraft]);

  const billingDirty = useMemo(() => {
    if (!detail) {
      return false;
    }
    return (
      billingPlanDraft !== (detail.billingPlan ?? "") || subscriptionStatusDraft !== (detail.subscriptionStatus ?? "")
    );
  }, [detail, billingPlanDraft, subscriptionStatusDraft]);

  const onSaveName = useCallback(() => {
    const v = nameDraft.trim();
    if (!v || v === detail?.name) {
      return;
    }
    void patch({ name: v });
  }, [nameDraft, detail?.name, patch]);

  const onSaveSeatLimit = useCallback(() => {
    const raw = seatLimitDraft.trim();
    if (raw === "") {
      void patch({ seatLimit: null });
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 1) {
      const msg = "Seat limit must be a positive number or blank for unlimited.";
      setError(msg);
      toast.error(msg);
      return;
    }
    void patch({ seatLimit: Math.floor(n) });
  }, [seatLimitDraft, patch]);

  const onSaveBilling = useCallback(() => {
    void patch({
      billingPlan: billingPlanDraft.trim() === "" ? null : billingPlanDraft.trim(),
      subscriptionStatus: subscriptionStatusDraft.trim() === "" ? null : subscriptionStatusDraft.trim(),
    });
  }, [billingPlanDraft, subscriptionStatusDraft, patch]);

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
      const msg =
        err instanceof OperatorApiError
          ? err.message === "confirm_mismatch"
            ? "Slug does not match."
            : err.message
          : "Delete failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setDeleteBusy(false);
    }
  }, [detail, deleteConfirm, onDeleted, onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col p-0 sm:max-w-xl">
        {loading || !detail ? (
          <>
            <SheetHeader>
              <SheetTitle className="sr-only">Workspace details</SheetTitle>
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </SheetHeader>
            <SheetBody className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
            </SheetBody>
          </>
        ) : (
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
                    {detail.billingPlan ? <Badge variant="secondary">{detail.billingPlan}</Badge> : null}
                    {detail.subscriptionStatus ? <Badge variant="outline">{detail.subscriptionStatus}</Badge> : null}
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
                onNameDraftChange={setNameDraft}
                patchBusy={patchBusy}
                onSave={onSaveName}
              />
              <SeatsSection
                detail={detail}
                seatLimitDraft={seatLimitDraft}
                onSeatLimitDraftChange={setSeatLimitDraft}
                dirty={seatLimitDirty}
                patchBusy={patchBusy}
                onSave={onSaveSeatLimit}
              />
              <BillingSection
                detail={detail}
                billingPlanDraft={billingPlanDraft}
                onBillingPlanDraftChange={setBillingPlanDraft}
                subscriptionStatusDraft={subscriptionStatusDraft}
                onSubscriptionStatusDraftChange={setSubscriptionStatusDraft}
                dirty={billingDirty}
                patchBusy={patchBusy}
                onSave={onSaveBilling}
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
                  setDetail((current) => {
                    if (!current) {
                      return current;
                    }
                    const next = { ...current, usage };
                    onUpdated?.(detailToRow(next));
                    return next;
                  });
                  return usage;
                }}
              />

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

              <DangerZoneSection
                slug={detail.slug}
                confirm={deleteConfirm}
                onConfirmChange={setDeleteConfirm}
                deleteBusy={deleteBusy}
                onDelete={() => void onDelete()}
              />
            </SheetBody>

            <SheetFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function IdentitySection({
  detail,
  nameDraft,
  onNameDraftChange,
  patchBusy,
  onSave,
}: {
  detail: OperatorWorkspaceDetail;
  nameDraft: string;
  onNameDraftChange: (next: string) => void;
  patchBusy: boolean;
  onSave: () => void;
}) {
  const disabled = patchBusy || nameDraft.trim() === "" || nameDraft.trim() === detail.name;
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Identity</h3>
      <div className="space-y-3 rounded-lg border border-border bg-card p-3">
        <div className="space-y-1.5">
          <Label htmlFor="workspace-name">Name</Label>
          <div className="flex items-center gap-2">
            <Input id="workspace-name" value={nameDraft} onChange={(event) => onNameDraftChange(event.target.value)} />
            <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={onSave}>
              Save
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Slug is <code className="rounded bg-muted px-1 py-0.5 font-mono">{detail.slug}</code> (immutable in this
          view). Metadata: <span className="font-mono">{detail.metadata ?? "—"}</span>
        </p>
      </div>
    </section>
  );
}

function SeatsSection({
  detail,
  seatLimitDraft,
  onSeatLimitDraftChange,
  dirty,
  patchBusy,
  onSave,
}: {
  detail: OperatorWorkspaceDetail;
  seatLimitDraft: string;
  onSeatLimitDraftChange: (next: string) => void;
  dirty: boolean;
  patchBusy: boolean;
  onSave: () => void;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Seats</h3>
      <div className="space-y-3 rounded-lg border border-border bg-card p-3">
        <div className="space-y-1.5">
          <Label htmlFor="workspace-seat-limit">Seat limit (blank = unpaid solo cap)</Label>
          <div className="flex items-center gap-2">
            <Input
              id="workspace-seat-limit"
              type="number"
              min={1}
              step={1}
              value={seatLimitDraft}
              onChange={(event) => onSeatLimitDraftChange(event.target.value)}
            />
            <Button type="button" size="sm" variant="outline" disabled={patchBusy || !dirty} onClick={onSave}>
              Save
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Current usage: <span className="text-foreground">{detail.memberCount + detail.pendingInvitations}</span> of{" "}
          <span className="text-foreground">{detail.effectiveSeatLimit}</span> seats
          {detail.pendingInvitations > 0 ? (
            <>
              {" "}
              (<span className="text-foreground">{detail.pendingInvitations}</span> pending invite
              {detail.pendingInvitations === 1 ? "" : "s"})
            </>
          ) : null}
          .
        </p>
      </div>
    </section>
  );
}

function BillingSection({
  detail,
  billingPlanDraft,
  onBillingPlanDraftChange,
  subscriptionStatusDraft,
  onSubscriptionStatusDraftChange,
  dirty,
  patchBusy,
  onSave,
}: {
  detail: OperatorWorkspaceDetail;
  billingPlanDraft: string;
  onBillingPlanDraftChange: (next: string) => void;
  subscriptionStatusDraft: string;
  onSubscriptionStatusDraftChange: (next: string) => void;
  dirty: boolean;
  patchBusy: boolean;
  onSave: () => void;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Billing</h3>
      <div className="space-y-3 rounded-lg border border-border bg-card p-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="billing-plan">Plan</Label>
            <Input
              id="billing-plan"
              value={billingPlanDraft}
              onChange={(event) => onBillingPlanDraftChange(event.target.value)}
              placeholder="starter · pro · scale"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="subscription-status">Subscription status</Label>
            <Input
              id="subscription-status"
              value={subscriptionStatusDraft}
              onChange={(event) => onSubscriptionStatusDraftChange(event.target.value)}
              placeholder="active · past_due · canceled"
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <IconCreditCard className="size-3.5" />
            <span>
              Stripe customer: <code className="font-mono">{detail.stripeCustomerId ?? "—"}</code>
            </span>
            <span>
              Sub: <code className="font-mono">{detail.stripeSubscriptionId ?? "—"}</code>
            </span>
          </div>
          <Button type="button" size="sm" variant="outline" disabled={patchBusy || !dirty} onClick={onSave}>
            Save billing
          </Button>
        </div>
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

function invitationBadgeVariant(status: string): "outline" | "secondary" | "destructive" {
  if (status === "pending") return "outline";
  if (status === "accepted") return "secondary";
  return "destructive";
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
                <Badge variant={invitationBadgeVariant(inv.status)} className="shrink-0">
                  {inv.status}
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

function DangerZoneSection({
  slug,
  confirm,
  onConfirmChange,
  deleteBusy,
  onDelete,
}: {
  slug: string;
  confirm: string;
  onConfirmChange: (next: string) => void;
  deleteBusy: boolean;
  onDelete: () => void;
}) {
  const matches = confirm.trim().toLowerCase() === slug.toLowerCase();
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-destructive">Danger zone</h3>
      <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
        <p className="text-xs text-destructive">
          Permanently delete this workspace, its memberships, and invitations. Users keep their accounts and Webflow
          tokens.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="destructive" size="sm" className="gap-1.5">
              <IconTrash className="size-4" />
              Delete workspace
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="inline-flex items-center gap-1.5">
                <IconAlertTriangle className="size-4 text-destructive" />
                Delete workspace?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This cannot be undone. Type the slug{" "}
                <code className="rounded bg-muted px-1 font-mono text-xs">{slug}</code> to confirm.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2 py-2">
              <Label htmlFor="confirm-slug">Slug</Label>
              <Input
                id="confirm-slug"
                value={confirm}
                onChange={(event) => onConfirmChange(event.target.value)}
                placeholder={slug}
                autoComplete="off"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button variant="destructive" disabled={deleteBusy || !matches} onClick={onDelete}>
                  {deleteBusy ? "Deleting…" : "Delete permanently"}
                </Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </section>
  );
}
