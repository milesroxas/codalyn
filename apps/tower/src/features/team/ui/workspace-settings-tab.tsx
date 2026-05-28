"use client";

import type { FormEvent } from "react";
import { WorkspaceDeleteDangerZone } from "@/features/team/ui/workspace-delete-danger-zone";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { TabsContent } from "@/shared/ui/tabs";
import { WorkspaceSlugField } from "@/shared/ui/workspace-slug-field";

export function WorkspaceSettingsTab(props: {
  activeOrg: { id: string; name: string; slug: string; ownerUserId?: string | null };
  currentUserId: string;
  busy: boolean;
  deleteBusy: boolean;
  deleteConfirm: string;
  deletePassword: string;
  memberCount: number;
  pendingInviteCount: number;
  activeTeamNameEdit: string;
  activeTeamSlugEdit: string;
  onActiveTeamNameEditChange: (v: string) => void;
  onActiveTeamSlugEditChange: (v: string) => void;
  onUpdateActiveTeamName: (e: FormEvent) => void;
  onUpdateActiveTeamSlug: () => void | Promise<void>;
  onDeleteConfirmChange: (value: string) => void;
  onDeletePasswordChange: (value: string) => void;
  onDeleteWorkspace: () => void | Promise<void>;
}) {
  const {
    activeOrg,
    currentUserId,
    busy,
    deleteBusy,
    deleteConfirm,
    deletePassword,
    memberCount,
    pendingInviteCount,
    activeTeamNameEdit,
    activeTeamSlugEdit,
    onActiveTeamNameEditChange,
    onActiveTeamSlugEditChange,
    onUpdateActiveTeamName,
    onUpdateActiveTeamSlug,
    onDeleteConfirmChange,
    onDeletePasswordChange,
    onDeleteWorkspace,
  } = props;

  const isOwner = activeOrg.ownerUserId === currentUserId;

  return (
    <TabsContent value="settings" className="space-y-6">
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">Workspace profile</CardTitle>
          <CardDescription>Shown across Tower for everyone in this workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4 sm:flex-row sm:items-end"
            onSubmit={(ev) => {
              void onUpdateActiveTeamName(ev);
            }}
          >
            <FormField className="min-w-0 flex-1">
              <Label htmlFor="ws-name">Display name</Label>
              <Input
                id="ws-name"
                value={activeTeamNameEdit}
                onChange={(ev) => onActiveTeamNameEditChange(ev.target.value)}
                autoComplete="organization"
                placeholder="Workspace name"
              />
            </FormField>
            <Button
              type="submit"
              disabled={busy || !activeTeamNameEdit.trim() || activeTeamNameEdit.trim() === activeOrg.name}
            >
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">Workspace slug</CardTitle>
          <CardDescription>Used for support and integrations. Does not affect member access.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(ev) => {
              ev.preventDefault();
              void onUpdateActiveTeamSlug();
            }}
          >
            <WorkspaceSlugField
              id="ws-slug"
              value={activeTeamSlugEdit}
              currentSlug={activeOrg.slug}
              busy={busy}
              onChange={onActiveTeamSlugEditChange}
              onSave={() => {
                void onUpdateActiveTeamSlug();
              }}
            />
          </form>
        </CardContent>
      </Card>
      {isOwner ? (
        <WorkspaceDeleteDangerZone
          organizationId={activeOrg.id}
          organizationSlug={activeOrg.slug}
          memberCount={memberCount}
          pendingInviteCount={pendingInviteCount}
          deleteBusy={deleteBusy}
          deleteConfirm={deleteConfirm}
          deletePassword={deletePassword}
          onDeleteConfirmChange={onDeleteConfirmChange}
          onDeletePasswordChange={onDeletePasswordChange}
          onDeleteWorkspace={onDeleteWorkspace}
        />
      ) : null}
    </TabsContent>
  );
}
