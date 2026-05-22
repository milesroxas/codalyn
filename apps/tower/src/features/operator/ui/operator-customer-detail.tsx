"use client";

import {
  IconAlertTriangle,
  IconBan,
  IconBuilding,
  IconCheck,
  IconDeviceDesktop,
  IconMail,
  IconShieldCheck,
  IconShieldOff,
  IconTrash,
  IconUserCheck,
} from "@tabler/icons-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { OperatorApiError, operatorApi } from "@/features/operator/api/client";
import {
  appRoleLabel,
  formatDateTime,
  formatRelative,
  initialsFor,
  userAgentSummary,
} from "@/features/operator/model/format";
import type { OperatorUserDetail, OperatorUserPatch, OperatorUserRow } from "@/server/operator/types";
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
import { Skeleton } from "@/shared/ui/skeleton";
import { Switch } from "@/shared/ui/switch";

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
    webflowConnected: d.webflowConnected,
    memberships: d.memberships,
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col p-0 sm:max-w-xl">
        {state.loading || !state.detail ? (
          <>
            <SheetHeader>
              <SheetTitle className="sr-only">Customer details</SheetTitle>
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
                <Avatar className="size-10">
                  <AvatarFallback>{initialsFor(state.detail.name || state.detail.email)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <SheetTitle className="truncate">{state.detail.name || state.detail.email}</SheetTitle>
                  <SheetDescription className="truncate">{state.detail.email}</SheetDescription>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge variant={state.detail.role === "product_admin" ? "secondary" : "outline"}>
                      <IconShieldCheck className="size-3" />
                      {appRoleLabel(state.detail.role)}
                    </Badge>
                    {state.detail.emailVerified ? (
                      <Badge variant="outline">
                        <IconMail className="size-3" />
                        Verified
                      </Badge>
                    ) : null}
                    {state.detail.canCreateOrganization ? (
                      <Badge variant="outline">
                        <IconCheck className="size-3" />
                        Eligible
                      </Badge>
                    ) : null}
                    {state.detail.banned ? (
                      <Badge variant="destructive">
                        <IconBan className="size-3" />
                        Banned
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
                detail={state.detail}
                patchBusy={state.patchBusy}
                isSelf={isSelf}
                onToggleRole={onToggleRole}
                onToggleEligibility={onToggleEligibility}
              />
              <ModerationSection
                detail={state.detail}
                banReasonDraft={state.banReasonDraft}
                onBanReasonDraftChange={(v) => setState((s) => ({ ...s, banReasonDraft: v }))}
                patchBusy={state.patchBusy}
                isSelf={isSelf}
                onBan={onBan}
                onUnban={onUnban}
              />
              <WorkspacesSection detail={state.detail} onCloseSheet={() => onOpenChange(false)} />
              <SessionsSection detail={state.detail} />
              <MetadataSection detail={state.detail} />
              <DangerZoneSection
                email={state.detail.email}
                isSelf={isSelf}
                confirm={state.deleteConfirm}
                onConfirmChange={(v) => setState((s) => ({ ...s, deleteConfirm: v }))}
                deleteBusy={state.deleteBusy}
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
            <SelectTrigger size="sm" className="w-36">
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
    <div className="space-y-2">
      <Label htmlFor="ban-reason" className="text-sm">
        Ban reason (optional)
      </Label>
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
    </div>
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

function DangerZoneSection({
  email,
  isSelf,
  confirm,
  onConfirmChange,
  deleteBusy,
  onDelete,
}: {
  email: string;
  isSelf: boolean;
  confirm: string;
  onConfirmChange: (next: string) => void;
  deleteBusy: boolean;
  onDelete: () => void;
}) {
  const matches = confirm.trim().toLowerCase() === email.toLowerCase();
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-destructive">Danger zone</h3>
      <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
        <p className="text-xs text-destructive">
          Permanently delete this customer, their sessions, OAuth tokens, and Beacon preferences. Workspace memberships
          are removed; any workspaces they own remain.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="destructive" size="sm" className="gap-1.5" disabled={isSelf}>
              <IconTrash className="size-4" />
              Delete customer
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="inline-flex items-center gap-1.5">
                <IconAlertTriangle className="size-4 text-destructive" />
                Delete customer?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This cannot be undone. Type the email{" "}
                <code className="rounded bg-muted px-1 font-mono text-xs">{email}</code> to confirm.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2 py-2">
              <Label htmlFor="confirm-email">Email</Label>
              <Input
                id="confirm-email"
                value={confirm}
                onChange={(event) => onConfirmChange(event.target.value)}
                placeholder={email}
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
