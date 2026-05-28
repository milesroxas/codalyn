"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { resolveTowerAppCallbackUrl } from "@/features/auth/lib/email-verification";
import { authClient } from "@/features/auth/model/auth-client";
import { buildTeamPageHref } from "@/features/team/lib/team-workspace-tab";
import {
  type AccountDeletionBlocker,
  formatAccountDeletionBlockedMessage,
} from "@/shared/lib/membership/user-account-deletion";
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
import { Button } from "@/shared/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

type DeleteEligibility = {
  blockers: AccountDeletionBlocker[];
};

async function fetchDeleteEligibility(): Promise<DeleteEligibility> {
  const res = await fetch("/api/account/delete-eligibility", { credentials: "include" });
  if (!res.ok) {
    return { blockers: [] };
  }
  const body = (await res.json()) as { blockers?: AccountDeletionBlocker[] };
  return { blockers: body.blockers ?? [] };
}

export function AccountDeleteSection(props: { sessionReady: boolean }) {
  const { sessionReady } = props;
  const deletePassId = useId();
  const deleteConfirmPhraseId = useId();

  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteBlockers, setDeleteBlockers] = useState<AccountDeletionBlocker[]>([]);
  const [deleteEligibilityPending, setDeleteEligibilityPending] = useState(true);

  const refreshDeleteEligibility = useCallback(async () => {
    setDeleteEligibilityPending(true);
    try {
      const eligibility = await fetchDeleteEligibility();
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

  async function onDeleteAccount(e: FormEvent) {
    e.preventDefault();
    setDeleteErr(null);
    if (deleteConfirm.trim().toUpperCase() !== "DELETE") {
      setDeleteErr("Type DELETE to confirm.");
      return;
    }
    setDeleteBusy(true);
    const { error } = await authClient.deleteUser({
      password: deletePassword,
      callbackURL: resolveTowerAppCallbackUrl("/"),
      fetchOptions: { credentials: "include" },
    });
    setDeleteBusy(false);
    if (error) {
      const msg = error.message ?? "Could not delete account";
      setDeleteErr(msg);
      toast.error(msg);
      return;
    }
    toast.success("Account deleted");
    setDeleteDialogOpen(false);
    window.location.assign("/");
  }

  function onDeleteDialogOpenChange(open: boolean) {
    setDeleteDialogOpen(open);
    if (open) {
      void refreshDeleteEligibility();
    }
    if (!open) {
      setDeletePassword("");
      setDeleteConfirm("");
      setDeleteErr(null);
    }
  }

  const deleteBlocked = deleteBlockers.length > 0;
  const deleteBlockedMessage = deleteBlocked ? formatAccountDeletionBlockedMessage(deleteBlockers) : null;

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
          <AlertDialog open={deleteDialogOpen} onOpenChange={onDeleteDialogOpenChange}>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="destructive"
                width="fit"
                disabled={deleteEligibilityPending || deleteBlocked}
              >
                Delete my account…
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <form onSubmit={onDeleteAccount} className="flex flex-col gap-4">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently deletes your user and cannot be undone. Enter your password and type DELETE to
                    confirm. Workspaces you own are not deleted automatically.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {deleteBlockedMessage ? (
                  <p className="text-sm text-destructive" role="alert">
                    {deleteBlockedMessage}
                  </p>
                ) : null}
                <FormField>
                  <Label htmlFor={deletePassId}>Password</Label>
                  <Input
                    id={deletePassId}
                    type="password"
                    autoComplete="current-password"
                    value={deletePassword}
                    onChange={(ev) => setDeletePassword(ev.target.value)}
                    required
                    autoFocus
                  />
                </FormField>
                <FormField>
                  <Label htmlFor={deleteConfirmPhraseId}>Type DELETE to confirm</Label>
                  <Input
                    id={deleteConfirmPhraseId}
                    type="text"
                    autoComplete="off"
                    value={deleteConfirm}
                    onChange={(ev) => setDeleteConfirm(ev.target.value)}
                    required
                  />
                </FormField>
                {deleteErr ? (
                  <p className="text-sm text-destructive" role="alert">
                    {deleteErr}
                  </p>
                ) : null}
                <AlertDialogFooter>
                  <AlertDialogCancel type="button" disabled={deleteBusy}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction type="submit" variant="destructive" disabled={deleteBusy || deleteBlocked}>
                    {deleteBusy ? "Deleting…" : "Delete account"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </form>
            </AlertDialogContent>
          </AlertDialog>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        {deleteEligibilityPending ? (
          <p className="text-sm text-muted-foreground">Checking workspace ownership and billing responsibilities…</p>
        ) : null}
        {!deleteEligibilityPending && deleteBlockedMessage ? (
          <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-sm text-destructive">{deleteBlockedMessage}</p>
            <Button asChild variant="outline" size="sm">
              <Link href={buildTeamPageHref({ tab: "settings" })}>Open Team settings</Link>
            </Button>
          </div>
        ) : null}
      </CardContent>
      <CardFooter className="border-t border-border/60 text-xs text-muted-foreground">
        This cannot be undone. If you use Beacon or integrations, you will need a new account to sign in again.
      </CardFooter>
    </Card>
  );
}
