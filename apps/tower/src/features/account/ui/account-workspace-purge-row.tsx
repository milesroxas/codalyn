"use client";

import { useId, useState } from "react";
import { toast } from "sonner";
import {
  accountWorkspacePurgeBillingNotice,
  accountWorkspacePurgeConsequence,
  accountWorkspacePurgeRowHint,
} from "@/features/account/lib/account-workspace-purge-copy";
import {
  formatTeamWorkspaceDeleteError,
  purgeTeamWorkspaceNow,
  TeamWorkspaceApiError,
} from "@/features/team/api/delete-workspace";
import type { AccountDeletionBlocker } from "@/shared/lib/membership/user-account-deletion";
import { TypedConfirmAlertDialog } from "@/shared/ui/typed-confirm-alert-dialog";

/**
 * One account-deletion blocker the user can clear in place by permanently deleting the workspace
 * (personal workspaces and workspaces already scheduled for deletion). The server re-validates
 * ownership, password, and slug — this row never decides authorization.
 */
export function AccountWorkspacePurgeRow(props: {
  blocker: AccountDeletionBlocker;
  onPurged: () => void | Promise<void>;
}) {
  const { blocker, onPurged } = props;
  const fieldsBaseId = useId();
  const [slugConfirm, setSlugConfirm] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const billingNotice = accountWorkspacePurgeBillingNotice(blocker);

  async function onConfirm() {
    setBusy(true);
    try {
      await purgeTeamWorkspaceNow(blocker.organizationId, slugConfirm, password);
      toast.success(`“${blocker.organizationName}” permanently deleted`);
      setSlugConfirm("");
      setPassword("");
      await onPurged();
    } catch (err) {
      toast.error(err instanceof TeamWorkspaceApiError ? formatTeamWorkspaceDeleteError(err) : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{blocker.organizationName}</p>
        <p className="text-xs text-muted-foreground">{accountWorkspacePurgeRowHint(blocker)}</p>
      </div>
      <TypedConfirmAlertDialog
        triggerLabel="Delete now"
        title="Permanently delete this workspace?"
        description={
          <>
            <strong>{blocker.organizationName}</strong> {accountWorkspacePurgeConsequence(blocker)}
            {billingNotice ? ` ${billingNotice}` : null} Enter your password and type the slug{" "}
            <strong>{blocker.organizationSlug}</strong> to confirm.
          </>
        }
        confirmFieldLabel="Slug"
        confirmFieldId={`${fieldsBaseId}-slug`}
        expectedValue={blocker.organizationSlug}
        confirmValue={slugConfirm}
        onConfirmValueChange={setSlugConfirm}
        passwordFieldId={`${fieldsBaseId}-password`}
        passwordValue={password}
        onPasswordValueChange={setPassword}
        actionLabel="Permanently delete"
        busyLabel="Deleting…"
        busy={busy}
        onConfirm={() => void onConfirm()}
        onOpenChange={(open) => {
          if (!open) {
            setSlugConfirm("");
            setPassword("");
          }
        }}
      />
    </div>
  );
}
