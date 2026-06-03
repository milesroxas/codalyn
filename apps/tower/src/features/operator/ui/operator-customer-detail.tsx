"use client";

import { useDeferredLoadingIndicator } from "@codalyn/webflow-kit/react";
import {
  IconBan,
  IconBuilding,
  IconCheck,
  IconCreditCard,
  IconDeviceDesktop,
  IconMail,
  IconShieldCheck,
  IconShieldOff,
  IconUserCheck,
} from "@tabler/icons-react";
import Link from "next/link";
import { type Dispatch, type SetStateAction, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { OperatorApiError, operatorApi } from "@/features/operator/api/client";
import {
  appRoleLabel,
  formatDateTime,
  formatRelative,
  initialsFor,
  userAgentSummary,
} from "@/features/operator/model/format";
import {
  OperatorDetailSheetAccessibleTitle,
  OperatorDetailSheetSkeleton,
} from "@/features/operator/ui/operator-detail-sheet-skeleton";
import { OperatorStripeBillingMeta } from "@/features/operator/ui/operator-stripe-billing-meta";
import {
  OperatorUsageLimitsSection,
  reloadUserUsageLimits,
} from "@/features/operator/ui/operator-usage-limits-section";
import { OperatorUsageTrendSection } from "@/features/operator/ui/operator-usage-trend-section";
import type { OperatorUserDetail, OperatorUserPatch, OperatorUserRow } from "@/server/operator/types";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/ui/sheet";
import { Switch } from "@/shared/ui/switch";
import { DangerZoneTypedDelete } from "@/shared/ui/typed-confirm-alert-dialog";

export type OperatorCustomerDetailProps = {
  userId: string | null;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  currentOperatorId: string;
  onUpdated?: (row: OperatorUserRow) => void;
  onDeleted?: (userId: string) => void;
};

type LocalState = {
  loading: boolean;
  detail: OperatorUserDetail | null;
  error: string | null;
  patchBusy: boolean;
  banReasonDraft: string;
  deleteConfirm: string;
  deleteBusy: boolean;
};

const INITIAL_STATE: LocalState = {
  loading: false,
  detail: null,
  error: null,
  patchBusy: false,
  banReasonDraft: "",
  deleteConfirm: "",
  deleteBusy: false,
};

function detailToRow(d: OperatorUserDetail): OperatorUserRow {
  return {
    id: d.id,
    email: d.email,
    name: d.name,
    role: d.role,
    emailVerified: d.emailVerified,
    banned: d.banned,
    banReason: d.banReason,
    banExpires: d.banExpires,
    canCreateOrganization: d.canCreateOrganization,
    subscriptionPlan: d.subscriptionPlan,
    subscriptionStatus: d.subscriptionStatus,
    stripeCustomerId: d.stripeCustomerId,
    stripeSubscriptionId: d.stripeSubscriptionId,
    billingManagedByStripe: d.billingManagedByStripe,
    hasStripePro: d.hasStripePro,
    webflowConnected: d.webflowConnected,
    memberships: d.memberships,
    usage: d.usage,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

export function OperatorCustomerDetail(props: OperatorCustomerDetailProps) {
  const { userId, open, onOpenChange, currentOperatorId, onUpdated, onDeleted } = props;
  const [state, setState] = useState<LocalState>(INITIAL_STATE);

  const isSelf = Boolean(state.detail && state.detail.id === currentOperatorId);

  const load = useCallback(async (id: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const d = await operatorApi.getUser(id);
      setState((s) => ({ ...s, loading: false, detail: d, banReasonDraft: d.banReason ?? "" }));
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof OperatorApiError ? err.message : "Could not load customer",
      }));
    }
  }, []);

  useEffect(() => {
    if (!open || !userId) {
      return;
    }
    void load(userId);
  }, [open, userId, load]);

  useEffect(() => {
    if (!open) {
      setState(INITIAL_STATE);
    }
  }, [open]);

  const patch = useCallback(
    async (update: OperatorUserPatch) => {
      if (!state.detail) {
        return;
      }
      setState((s) => ({ ...s, patchBusy: true, error: null }));
      try {
        const next = await operatorApi.patchUser(state.detail.id, update);
        setState((s) => ({ ...s, patchBusy: false, detail: next, banReasonDraft: next.banReason ?? "" }));
        onUpdated?.(detailToRow(next));
        toast.success("Customer updated");
      } catch (err) {
        const msg = err instanceof OperatorApiError ? err.message : "Update failed";
        toast.error(msg);
        setState((s) => ({
          ...s,
          patchBusy: false,
          error: msg,
        }));
      }
    },
    [state.detail, onUpdated]
  );

  const onToggleRole = useCallback(
    (next: string) => {
      const role = next === "product_admin" ? "product_admin" : "user";
      void patch({ role });
    },
    [patch]
  );

  const onToggleEligibility = useCallback(
    (next: boolean) => {
      void patch({ canCreateOrganization: next });
    },
    [patch]
  );

  const onBan = useCallback(() => {
    const reason = state.banReasonDraft.trim() || null;
    void patch({ banned: true, banReason: reason });
  }, [patch, state.banReasonDraft]);

  const onUnban = useCallback(() => {
    void patch({ banned: false, banReason: null, banExpires: null });
  }, [patch]);

  const onDelete = useCallback(async () => {
    if (!state.detail) {
      return;
    }
    setState((s) => ({ ...s, deleteBusy: true, error: null }));
    try {
      await operatorApi.deleteUser(state.detail.id, state.deleteConfirm);
      toast.success("Customer deleted");
      onDeleted?.(state.detail.id);
      onOpenChange(false);
    } catch (err) {
      const msg =
        err instanceof OperatorApiError
          ? err.message === "confirm_mismatch"
            ? "Email does not match."
            : err.message
          : "Delete failed";
      toast.error(msg);
      setState((s) => ({
        ...s,
        deleteBusy: false,
        error: msg,
      }));
    }
  }, [state.detail, state.deleteConfirm, onDeleted, onOpenChange]);

  const showPlaceholder = useDeferredLoadingIndicator(state.loading);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col p-0 sm:max-w-xl">
        <OperatorCustomerDetailSheetBody
          showPlaceholder={showPlaceholder}
          state={state}
          isSelf={isSelf}
          onOpenChange={onOpenChange}
          onToggleRole={onToggleRole}
          onToggleEligibility={onToggleEligibility}
          onBan={onBan}
          onUnban={onUnban}
          onDelete={onDelete}
          onUpdated={onUpdated}
          setState={setState}
        />
      </SheetContent>
    </Sheet>
  );
}

type OperatorCustomerDetailSheetBodyProps = {
  showPlaceholder: boolean;
  state: LocalState;
  isSelf: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleRole: (next: string) => void;
  onToggleEligibility: (next: boolean) => void;
  onBan: () => void;
  onUnban: () => void;
  onDelete: () => void | Promise<void>;
  onUpdated?: (row: OperatorUserRow) => void;
  setState: Dispatch<SetStateAction<LocalState>>;
};

function OperatorCustomerDetailSheetBody(props: OperatorCustomerDetailSheetBodyProps) {
  const {
    showPlaceholder,
    state,
    isSelf,
    onOpenChange,
    onToggleRole,
    onToggleEligibility,
    onBan,
    onUnban,
    onDelete,
    onUpdated,
    setState,
  } = props;

  if (showPlaceholder) {
    return <OperatorDetailSheetSkeleton title="Customer details" />;
  }
  if (!state.detail) {
    if (state.error) {
      return (
        <>
          <SheetHeader>
            <SheetTitle>Customer details</SheetTitle>
          </SheetHeader>
          <SheetBody>
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {state.error}
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
    return <OperatorDetailSheetAccessibleTitle title="Customer details" />;
  }

  const detail = state.detail;

  return (
    <>
      <SheetHeader>
        <div className="flex items-start gap-3">
          <Avatar className="size-10">
            <AvatarFallback>{initialsFor(detail.name || detail.email)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <SheetTitle className="truncate">{detail.name || detail.email}</SheetTitle>
            <SheetDescription className="truncate">{detail.email}</SheetDescription>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge variant={detail.role === "product_admin" ? "secondary" : "outline"}>
                <IconShieldCheck className="size-3" />
                {appRoleLabel(detail.role)}
              </Badge>
              {detail.emailVerified ? (
                <Badge variant="outline">
                  <IconMail className="size-3" />
                  Verified
                </Badge>
              ) : null}
              {detail.canCreateOrganization ? (
                <Badge variant="outline">
                  <IconCheck className="size-3" />
                  Eligible
                </Badge>
              ) : null}
              {detail.banned ? (
                <Badge variant="destructive">
                  <IconBan className="size-3" />
                  Banned
                </Badge>
              ) : null}
              {detail.hasStripePro ? (
                <Badge variant="secondary">
                  <IconCreditCard className="size-3" />
                  Stripe Pro
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
      </SheetHeader>

      <SheetBody className="space-y-6">
        {state.error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {state.error}
          </div>
        ) : null}

        <AccessSection
          detail={detail}
          patchBusy={state.patchBusy}
          isSelf={isSelf}
          onToggleRole={onToggleRole}
          onToggleEligibility={onToggleEligibility}
        />
        <CustomerBillingSection detail={detail} />
        <ModerationSection
          detail={detail}
          banReasonDraft={state.banReasonDraft}
          onBanReasonDraftChange={(v) => setState((s) => ({ ...s, banReasonDraft: v }))}
          patchBusy={state.patchBusy}
          isSelf={isSelf}
          onBan={onBan}
          onUnban={onUnban}
        />
        <OperatorUsageLimitsSection
          scope="user"
          usage={detail.usage}
          busy={state.patchBusy}
          onSave={async (update) => {
            const next = await operatorApi.patchUser(detail.id, update);
            setState((s) => ({ ...s, detail: next }));
            onUpdated?.(detailToRow(next));
            return next.usage;
          }}
          onReset={async () => {
            await operatorApi.resetUserUsage(detail.id);
            const usage = await reloadUserUsageLimits(detail.id);
            const nextDetail = { ...detail, usage };
            setState((s) => (s.detail ? { ...s, detail: nextDetail } : s));
            onUpdated?.(detailToRow(nextDetail));
            return usage;
          }}
        />
        <OperatorUsageTrendSection trend={detail.usageTrend} />
        <WorkspacesSection detail={detail} onCloseSheet={() => onOpenChange(false)} />
        <SessionsSection detail={detail} />
        <MetadataSection detail={detail} />
        <DangerZoneTypedDelete
          panelDescription={
            <>
              Permanently delete this customer, their sessions, OAuth tokens, and Beacon preferences. Workspace
              memberships are removed. Deletion is blocked while they are the only admin of a shared workspace; promote
              another admin or delete the workspace first.
            </>
          }
          triggerLabel="Delete customer"
          triggerDisabled={isSelf}
          title="Delete customer?"
          confirmFieldLabel="Email"
          confirmFieldId="confirm-email"
          expectedValue={detail.email}
          confirmValue={state.deleteConfirm}
          onConfirmValueChange={(v) => setState((s) => ({ ...s, deleteConfirm: v }))}
          busy={state.deleteBusy}
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

function CustomerBillingSection({ detail }: { detail: OperatorUserDetail }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Billing</h3>
      <div className="space-y-3 rounded-lg border border-border bg-card p-3">
        {detail.billingManagedByStripe ? (
          <p className="text-xs text-muted-foreground">
            Individual Pro plan and subscription status sync from Stripe webhooks.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            No active Stripe subscription. Grant Pro entitlements via workspace billing or ops overrides.
          </p>
        )}
        <dl className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <dt className="text-muted-foreground">Plan</dt>
            <dd className="font-mono text-foreground">{detail.subscriptionPlan ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Subscription status</dt>
            <dd className="font-mono text-foreground">{detail.subscriptionStatus ?? "—"}</dd>
          </div>
        </dl>
        <OperatorStripeBillingMeta
          stripeCustomerId={detail.stripeCustomerId}
          stripeSubscriptionId={detail.stripeSubscriptionId}
        />
      </div>
    </section>
  );
}

function AccessSection({
  detail,
  patchBusy,
  isSelf,
  onToggleRole,
  onToggleEligibility,
}: {
  detail: OperatorUserDetail;
  patchBusy: boolean;
  isSelf: boolean;
  onToggleRole: (next: string) => void;
  onToggleEligibility: (next: boolean) => void;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Access</h3>
      <div className="space-y-3 rounded-lg border border-border bg-card p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">App role</Label>
            <p className="text-xs text-muted-foreground">
              Operators can access <code className="font-mono">/console</code> and manage all customers.
            </p>
          </div>
          <Select
            value={detail.role === "product_admin" ? "product_admin" : "user"}
            onValueChange={onToggleRole}
            disabled={patchBusy || isSelf}
          >
            <SelectTrigger size="sm" width="filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="product_admin">Operator</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {isSelf ? <p className="text-xs text-muted-foreground">You cannot change your own role.</p> : null}
        <div className="flex items-start justify-between gap-3 border-t border-border pt-3">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Can create workspace</Label>
            <p className="text-xs text-muted-foreground">
              Required to start a new team workspace. Normally granted after signup intent or payment.
            </p>
          </div>
          <Switch
            checked={detail.canCreateOrganization}
            onCheckedChange={onToggleEligibility}
            disabled={patchBusy}
            aria-label="Toggle workspace creation eligibility"
          />
        </div>
      </div>
    </section>
  );
}

function ModerationSection({
  detail,
  banReasonDraft,
  onBanReasonDraftChange,
  patchBusy,
  isSelf,
  onBan,
  onUnban,
}: {
  detail: OperatorUserDetail;
  banReasonDraft: string;
  onBanReasonDraftChange: (next: string) => void;
  patchBusy: boolean;
  isSelf: boolean;
  onBan: () => void;
  onUnban: () => void;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Moderation</h3>
      <div className="space-y-3 rounded-lg border border-border bg-card p-3">
        {detail.banned ? (
          <BannedBlock detail={detail} patchBusy={patchBusy} onUnban={onUnban} />
        ) : (
          <BanBlock
            banReasonDraft={banReasonDraft}
            onBanReasonDraftChange={onBanReasonDraftChange}
            patchBusy={patchBusy}
            isSelf={isSelf}
            onBan={onBan}
          />
        )}
      </div>
    </section>
  );
}

function BannedBlock({
  detail,
  patchBusy,
  onUnban,
}: {
  detail: OperatorUserDetail;
  patchBusy: boolean;
  onUnban: () => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-destructive">Account is banned.</p>
        {detail.banReason ? <p className="text-xs text-muted-foreground">Reason: {detail.banReason}</p> : null}
        {detail.banExpires ? (
          <p className="text-xs text-muted-foreground">Expires: {formatDateTime(detail.banExpires)}</p>
        ) : null}
      </div>
      <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={patchBusy} onClick={onUnban}>
        <IconShieldOff className="size-4" />
        Lift ban
      </Button>
    </div>
  );
}

function BanBlock({
  banReasonDraft,
  onBanReasonDraftChange,
  patchBusy,
  isSelf,
  onBan,
}: {
  banReasonDraft: string;
  onBanReasonDraftChange: (next: string) => void;
  patchBusy: boolean;
  isSelf: boolean;
  onBan: () => void;
}) {
  return (
    <FormField>
      <Label htmlFor="ban-reason">Ban reason (optional)</Label>
      <Input
        id="ban-reason"
        value={banReasonDraft}
        onChange={(event) => onBanReasonDraftChange(event.target.value)}
        placeholder="Abuse, suspicious activity, etc."
      />
      <Button
        type="button"
        variant="destructive"
        size="sm"
        className="gap-1.5"
        disabled={patchBusy || isSelf}
        onClick={onBan}
      >
        <IconBan className="size-4" />
        Ban account
      </Button>
      {isSelf ? <p className="text-xs text-muted-foreground">You cannot ban yourself.</p> : null}
    </FormField>
  );
}

function WorkspacesSection({ detail, onCloseSheet }: { detail: OperatorUserDetail; onCloseSheet: () => void }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
        Workspaces ({detail.memberOf.length})
      </h3>
      <div className="rounded-lg border border-border">
        {detail.memberOf.length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground">Not a member of any workspace.</p>
        ) : (
          <ul className="divide-y divide-border">
            {detail.memberOf.map((m) => (
              <li key={m.memberId} className="flex items-center gap-3 p-3">
                <span className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <IconBuilding className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.organizationName}</p>
                  <p className="truncate font-mono text-xs text-muted-foreground">{m.organizationSlug}</p>
                </div>
                <Badge variant="outline" className="shrink-0">
                  {m.role}
                </Badge>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/console/workspaces?id=${encodeURIComponent(m.organizationId)}`} onClick={onCloseSheet}>
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

function SessionsSection({ detail }: { detail: OperatorUserDetail }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
        Active sessions ({detail.activeSessions.length})
      </h3>
      <div className="rounded-lg border border-border">
        {detail.activeSessions.length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground">No active sessions.</p>
        ) : (
          <ul className="divide-y divide-border">
            {detail.activeSessions.map((s) => (
              <li key={s.id} className="flex items-center gap-3 p-3">
                <span className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <IconDeviceDesktop className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{userAgentSummary(s.userAgent)}</p>
                  <p className="truncate font-mono text-xs text-muted-foreground">{s.ipAddress ?? "—"}</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>{formatRelative(s.updatedAt ?? s.createdAt)}</p>
                  <p>exp {formatRelative(s.expiresAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function MetadataSection({ detail }: { detail: OperatorUserDetail }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Metadata</h3>
      <dl className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-card p-3 text-xs">
        <div>
          <dt className="text-muted-foreground">User ID</dt>
          <dd className="truncate font-mono text-foreground" title={detail.id}>
            {detail.id}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Created</dt>
          <dd className="text-foreground">{formatDateTime(detail.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Updated</dt>
          <dd className="text-foreground">{formatDateTime(detail.updatedAt)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Webflow</dt>
          <dd className="text-foreground">
            {detail.webflowConnected ? (
              <span className="inline-flex items-center gap-1">
                <IconUserCheck className="size-3.5" />
                Connected
              </span>
            ) : (
              "Not connected"
            )}
          </dd>
        </div>
      </dl>
    </section>
  );
}
