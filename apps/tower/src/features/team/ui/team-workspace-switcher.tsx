"use client";

import { IconBuildingCommunity, IconChevronDown, IconPlus } from "@tabler/icons-react";
import { type FormEvent, useState } from "react";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

export type WorkspaceOrgRow = { id: string; name: string; slug: string };

export function TeamWorkspaceSwitcher(props: {
  orgs: WorkspaceOrgRow[] | null | undefined;
  orgsPending: boolean;
  activeOrgId: string | undefined;
  /** Trigger label (loading / no workspace / current name / select prompt). */
  triggerLabel: string;
  busy: boolean;
  canCreateTeam: boolean;
  orgName: string;
  onOrgNameChange: (v: string) => void;
  onCreateOrg: (e: FormEvent) => Promise<boolean>;
  onSetActive: (organizationId: string) => void;
}) {
  const [createOpen, setCreateOpen] = useState(false);

  const list = props.orgs ?? [];
  const disabled = props.busy || props.orgsPending;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="h-9 min-w-[12rem] max-w-[min(100%,18rem)] justify-between gap-2 px-3 font-normal"
            aria-label="Workspace menu"
          >
            <span className="flex min-w-0 flex-1 items-center gap-2 text-left">
              <IconBuildingCommunity className="size-4 shrink-0 opacity-60" aria-hidden />
              <span className="truncate">{props.triggerLabel}</span>
            </span>
            <IconChevronDown className="size-4 shrink-0 opacity-50" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          {list.length > 0 ? (
            <DropdownMenuRadioGroup
              value={props.activeOrgId ?? ""}
              onValueChange={(v) => {
                if (v && v !== props.activeOrgId) {
                  void props.onSetActive(v);
                }
              }}
            >
              {list.map((o) => (
                <DropdownMenuRadioItem key={o.id} value={o.id}>
                  <span className="truncate">{o.name}</span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          ) : (
            <p className="px-2 py-2 text-xs text-muted-foreground">
              {props.canCreateTeam
                ? "No workspaces yet. Use “New workspace” to create one."
                : "No team workspaces yet."}
            </p>
          )}
          {props.canCreateTeam ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => {
                  setCreateOpen(true);
                }}
              >
                <IconPlus className="size-4" />
                New workspace
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {props.canCreateTeam ? (
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New workspace</DialogTitle>
              <DialogDescription>Members, roles, and invitations are scoped to each workspace.</DialogDescription>
            </DialogHeader>
            <form
              className="grid gap-4"
              onSubmit={async (e) => {
                e.preventDefault();
                const ok = await props.onCreateOrg(e);
                if (ok) {
                  setCreateOpen(false);
                }
              }}
            >
              <div className="grid gap-2">
                <Label htmlFor="tw-new-workspace-name">Workspace name</Label>
                <Input
                  id="tw-new-workspace-name"
                  value={props.orgName}
                  onChange={(ev) => props.onOrgNameChange(ev.target.value)}
                  placeholder="Acme Studio"
                  autoComplete="organization"
                  autoFocus
                />
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={disabled || !props.orgName.trim()}>
                  Create workspace
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
