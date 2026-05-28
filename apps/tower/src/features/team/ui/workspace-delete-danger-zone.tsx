"use client";

import { useEffect, useId, useState } from "react";
import {
  buildWorkspaceDeletePanelDescription,
  type WorkspaceDeletionPreview,
} from "@/features/team/ui/workspace-delete-copy";
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
  const [deletePreview, setDeletePreview] = useState<WorkspaceDeletionPreview | null>(null);

  useEffect(() => {
    void fetch(`/api/team/workspace/delete-preview?organizationId=${encodeURIComponent(props.organizationId)}`, {
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => setDeletePreview((body as WorkspaceDeletionPreview | null) ?? null))
      .catch(() => setDeletePreview(null));
  }, [props.organizationId]);

  return (
    <DangerZoneTypedDelete
      panelDescription={buildWorkspaceDeletePanelDescription({
        activeOrg: { name: deletePreview?.organizationName ?? "Workspace", slug: props.organizationSlug },
        deletePreview,
        memberCount: props.memberCount,
        pendingInviteCount: props.pendingInviteCount,
      })}
      triggerLabel="Delete workspace"
      title="Delete workspace?"
      description={
        <>
          Enter your password and type the slug <strong>{props.organizationSlug}</strong> to schedule deletion. Members
          are notified after deletion is scheduled.
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
  );
}
