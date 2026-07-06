"use client";

import type { ReactNode } from "react";

export type WorkspaceDeletionPreview = {
  organizationName: string;
  organizationSlug: string;
  memberCount: number;
  pendingInviteCount: number;
  hasTeamSubscription: boolean;
  hasWebflowConnection: boolean;
  hasTeamPresets: boolean;
  recoveryDays: number;
  isRecoverable: boolean;
};

export function buildWorkspaceDeletePanelDescription(input: {
  activeOrg: { name: string; slug: string };
  deletePreview: WorkspaceDeletionPreview | null;
  memberCount: number;
  pendingInviteCount: number;
}): ReactNode {
  const memberLabel = input.memberCount === 1 ? "member" : "members";
  const inviteLabel = input.pendingInviteCount === 1 ? "pending invitation" : "pending invitations";
  const previewMemberCount = input.deletePreview?.memberCount ?? input.memberCount;
  const previewInviteCount = input.deletePreview?.pendingInviteCount ?? input.pendingInviteCount;
  const organizationName = input.deletePreview?.organizationName ?? input.activeOrg.name;
  const organizationSlug = input.deletePreview?.organizationSlug ?? input.activeOrg.slug;

  return (
    <>
      Schedules <strong>{organizationName}</strong> ({organizationSlug}) for deletion. {previewMemberCount}{" "}
      {memberLabel} lose access immediately.
      {previewInviteCount > 0 ? ` ${previewInviteCount} ${inviteLabel} are revoked.` : null}{" "}
      {input.deletePreview?.hasTeamSubscription ? "Active Team billing is canceled." : "No Team billing is active."}{" "}
      {input.deletePreview?.hasWebflowConnection ? "Webflow OAuth connections are removed." : null}{" "}
      {input.deletePreview?.hasTeamPresets ? "Team Beacon presets are removed." : null}{" "}
      {input.deletePreview?.isRecoverable
        ? `Recovery is available for ${input.deletePreview.recoveryDays} days before permanent purge.`
        : "Deletion is permanent."}
    </>
  );
}

export function buildWorkspacePurgeNowPanelDescription(input: {
  organizationName: string;
  recoveryDays: number;
}): ReactNode {
  return (
    <>
      Permanently deletes <strong>{input.organizationName}</strong> and all of its data right away, skipping the{" "}
      {input.recoveryDays}-day recovery window. This cannot be undone.
    </>
  );
}
