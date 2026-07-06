"use client";

import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import {
  formatTeamWorkspaceDeleteError,
  purgeTeamWorkspaceNow,
  TeamWorkspaceApiError,
} from "@/features/team/api/delete-workspace";
import {
  buildWorkspaceDeletePanelDescription,
  buildWorkspacePurgeNowPanelDescription,
  type WorkspaceDeletionPreview,
} from "@/features/team/ui/workspace-delete-copy";
import { WORKSPACE_SOFT_DELETE_RECOVERY_DAYS } from "@/shared/lib/membership/workspace-ownership";
import { DangerZoneTypedDelete } from "@/shared/ui/typed-confirm-alert-dialog";

export function WorkspaceDeleteDangerZone(props: {
  organizationId: string;
  organizationSlug: string;
  memberCount: number;
  pendingInviteCount: number;
  deleteBusy: boolean;
  deleteConfirm: string;
  deletePassword: string;
  onDeleteConfirmChange: (value: string) => void;
  onDeletePasswordChange: (value: string) => void;
  onDeleteWorkspace: () => void | Promise<void>;
}) {
  const deletePasswordId = useId();
  const purgePasswordId = useId();
  const [deletePreview, setDeletePreview] = useState<WorkspaceDeletionPreview | null>(null);
  const [purgeConfirm, setPurgeConfirm] = useState("");
  const [purgePassword, setPurgePassword] = useState("");
  const [purgeBusy, setPurgeBusy] = useState(false);

  useEffect(() => {
    void fetch(`/api/team/workspace/delete-preview?organizationId=${encodeURIComponent(props.organizationId)}`, {
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => setDeletePreview((body as WorkspaceDeletionPreview | null) ?? null))
      .catch(() => setDeletePreview(null));
  }, [props.organizationId]);

  const organizationName = deletePreview?.organizationName ?? "Workspace";
  const recoveryDays = deletePreview?.recoveryDays ?? WORKSPACE_SOFT_DELETE_RECOVERY_DAYS;

  async function onPurgeNow() {
    setPurgeBusy(true);
    try {
      await purgeTeamWorkspaceNow(props.organizationId, purgeConfirm, purgePassword);
      toast.success("Workspace permanently deleted");
      window.location.assign("/");
    } catch (err) {
      toast.error(err instanceof TeamWorkspaceApiError ? formatTeamWorkspaceDeleteError(err) : "Delete failed");
    } finally {
      setPurgeBusy(false);
    }
  }

  return (
    <>
      <DangerZoneTypedDelete
        panelDescription={buildWorkspaceDeletePanelDescription({
          activeOrg: { name: organizationName, slug: props.organizationSlug },
          deletePreview,
          memberCount: props.memberCount,
          pendingInviteCount: props.pendingInviteCount,
        })}
        triggerLabel="Delete workspace"
        title="Delete workspace?"
        description={
          <>
            Enter your password and type the slug <strong>{props.organizationSlug}</strong> to schedule deletion.
            Members are notified after deletion is scheduled.
          </>
        }
        confirmFieldLabel="Slug"
        confirmFieldId="team-delete-workspace-slug"
        expectedValue={props.organizationSlug}
        confirmValue={props.deleteConfirm}
        onConfirmValueChange={props.onDeleteConfirmChange}
        passwordFieldId={deletePasswordId}
        passwordValue={props.deletePassword}
        onPasswordValueChange={props.onDeletePasswordChange}
        actionLabel="Schedule deletion"
        busyLabel="Scheduling…"
        busy={props.deleteBusy}
        onConfirm={() => void props.onDeleteWorkspace()}
      />
      <DangerZoneTypedDelete
        panelTitle="Delete immediately"
        panelDescription={buildWorkspacePurgeNowPanelDescription({ organizationName, recoveryDays })}
        triggerLabel="Delete now"
        title="Permanently delete this workspace?"
        description={
          <>
            <strong>{organizationName}</strong> and all of its data are deleted immediately — there is no {recoveryDays}
            -day recovery window and this cannot be undone. Enter your password and type the slug{" "}
            <strong>{props.organizationSlug}</strong> to confirm.
          </>
        }
        confirmFieldLabel="Slug"
        confirmFieldId="team-purge-workspace-slug"
        expectedValue={props.organizationSlug}
        confirmValue={purgeConfirm}
        onConfirmValueChange={setPurgeConfirm}
        passwordFieldId={purgePasswordId}
        passwordValue={purgePassword}
        onPasswordValueChange={setPurgePassword}
        actionLabel="Permanently delete"
        busyLabel="Deleting…"
        busy={purgeBusy}
        onConfirm={() => void onPurgeNow()}
        onOpenChange={(open) => {
          if (!open) {
            setPurgeConfirm("");
            setPurgePassword("");
          }
        }}
      />
    </>
  );
}
