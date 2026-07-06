"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { AccountWorkspacePurgeRow } from "@/features/account/ui/account-workspace-purge-row";
import { resolveTowerAppCallbackUrl } from "@/features/auth/lib/email-verification";
import { authClient } from "@/features/auth/model/auth-client";
import {
  completeTowerWebSignOutNavigation,
  setTowerSignOutTransition,
} from "@/features/auth/model/tower-sign-out-transition";
import { buildTeamPageHref } from "@/features/team/lib/team-workspace-tab";
import {
  type AccountDeletionBlocker,
  canPurgeBlockedWorkspaceNow,
  formatAccountDeletionBlockedMessage,
} from "@/shared/lib/membership/user-account-deletion";
import { Button } from "@/shared/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";
import { TypedConfirmAlertDialog } from "@/shared/ui/typed-confirm-alert-dialog";

type DeleteEligibilityResult = { ok: true; blockers: AccountDeletionBlocker[] } | { ok: false; error: string };

async function fetchDeleteEligibility(): Promise<DeleteEligibilityResult> {
  const res = await fetch("/api/account/delete-eligibility", { credentials: "include" });
  if (!res.ok) {
    if (res.status === 401) {
      return { ok: false, error: "Your session expired. Sign in again, then retry." };
    }
    return { ok: false, error: "Could not verify whether this account can be deleted. Try again." };
  }
  const body = (await res.json()) as { blockers?: AccountDeletionBlocker[] };
  return { ok: true, blockers: body.blockers ?? [] };
}

export function AccountDeleteSection(props: { sessionReady: boolean }) {
  const { sessionReady } = props;
  const deletePassId = useId();
  const deleteConfirmPhraseId = useId();

  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const [deleteBlockers, setDeleteBlockers] = useState<AccountDeletionBlocker[]>([]);
  const [deleteEligibilityError, setDeleteEligibilityError] = useState<string | null>(null);
  const [deleteEligibilityPending, setDeleteEligibilityPending] = useState(true);

  const refreshDeleteEligibility = useCallback(async () => {
    setDeleteEligibilityPending(true);
    setDeleteEligibilityError(null);
    try {
      const eligibility = await fetchDeleteEligibility();
      if (!eligibility.ok) {
        setDeleteBlockers([]);
        setDeleteEligibilityError(eligibility.error);
        return;
      }
      setDeleteBlockers(eligibility.blockers);
    } finally {
      setDeleteEligibilityPending(false);
    }
  }, []);

  useEffect(() => {
    if (!sessionReady) {
      return;
    }
    void refreshDeleteEligibility();
  }, [sessionReady, refreshDeleteEligibility]);

  async function onDeleteAccount() {
    setDeleteErr(null);
    if (deleteConfirm.trim().toUpperCase() !== "DELETE") {
      const msg = "Type DELETE to confirm.";
      setDeleteErr(msg);
      toast.error(msg);
      return;
    }
    setDeleteBusy(true);
    try {
      const { error } = await authClient.deleteUser({
        password: deletePassword,
        callbackURL: resolveTowerAppCallbackUrl("/"),
        fetchOptions: { credentials: "include" },
      });
      if (error) {
        const msg = error.message ?? "Could not delete account";
        setDeleteErr(msg);
        toast.error(msg);
        return;
      }
      toast.success("Account deleted");
      setTowerSignOutTransition(true);
      await authClient.signOut({ fetchOptions: { credentials: "include" } });
      await completeTowerWebSignOutNavigation();
    } finally {
      setDeleteBusy(false);
    }
  }

  const deleteBlocked = deleteBlockers.length > 0 || deleteEligibilityError !== null;
  const deleteBlockedMessage = deleteEligibilityError
    ? deleteEligibilityError
    : deleteBlockers.length > 0
      ? formatAccountDeletionBlockedMessage(deleteBlockers)
      : null;
  const purgeableBlockers = deleteBlockers.filter(canPurgeBlockedWorkspaceNow);
  const hasActionableTeamBlockers = deleteBlockers.some((blocker) => blocker.reason !== "workspace_pending_deletion");

  return (
    <Card tone="destructive">
      <CardHeader>
        <CardTitle size="lg" tone="destructive">
          Delete account
        </CardTitle>
        <CardDescription>
          Permanently removes your account and personal data. Transfer workspace ownership, resolve billing, or delete
          owned workspaces first.
        </CardDescription>
        <CardAction align="center">
          <TypedConfirmAlertDialog
            triggerLabel="Delete my account…"
            triggerDisabled={deleteEligibilityPending || deleteBlocked}
            title="Delete this account?"
            description="This permanently deletes your user and cannot be undone. Enter your password and type DELETE to confirm. Workspaces you own are not deleted automatically."
            confirmFieldLabel="Confirmation"
            confirmFieldId={deleteConfirmPhraseId}
            expectedValue="DELETE"
            confirmValue={deleteConfirm}
            onConfirmValueChange={setDeleteConfirm}
            passwordFieldId={deletePassId}
            passwordValue={deletePassword}
            onPasswordValueChange={setDeletePassword}
            actionLabel="Delete account"
            busyLabel="Deleting…"
            busy={deleteBusy}
            onConfirm={() => void onDeleteAccount()}
            onOpenChange={(open) => {
              if (open) {
                void refreshDeleteEligibility();
              } else {
                setDeletePassword("");
                setDeleteConfirm("");
                setDeleteErr(null);
              }
            }}
          />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        {deleteEligibilityPending ? (
          <p className="text-sm text-muted-foreground">Checking workspace ownership and billing responsibilities…</p>
        ) : null}
        {!deleteEligibilityPending && deleteBlockedMessage ? (
          <div className="space-y-3 rounded-sm border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-sm text-destructive">{deleteBlockedMessage}</p>
            {purgeableBlockers.map((blocker) => (
              <AccountWorkspacePurgeRow
                key={blocker.organizationId}
                blocker={blocker}
                onPurged={refreshDeleteEligibility}
              />
            ))}
            {hasActionableTeamBlockers ? (
              <Button asChild variant="outline" size="sm">
                <Link href={buildTeamPageHref({ tab: "settings" })}>Open Team settings</Link>
              </Button>
            ) : null}
          </div>
        ) : null}
        {deleteErr ? (
          <p className="text-sm text-destructive" role="alert">
            {deleteErr}
          </p>
        ) : null}
      </CardContent>
      <CardFooter className="border-t border-border/60 text-xs text-muted-foreground">
        This cannot be undone. Signing in through Beacon after deletion may create a new Tower account linked to your
        Webflow identity.
      </CardFooter>
    </Card>
  );
}
