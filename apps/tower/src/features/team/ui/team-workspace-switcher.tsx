"use client";

import { useDeferredLoadingIndicator } from "@codalyn/webflow-kit/react";

import {
  IconBuildingCommunity,
  IconCheck,
  IconChevronDown,
  IconPlus,
  IconStar,
  IconStarFilled,
} from "@tabler/icons-react";
import Link from "next/link";
import { type FormEvent, useMemo, useState } from "react";
import { sortWorkspacesWithPreferredFirst } from "@/features/team/lib/sort-workspaces-with-preferred-first";
import { CreateWorkspaceDialog } from "@/features/team/ui/create-workspace-dialog";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuEmptyState,
  DropdownMenuItem,
  DropdownMenuItemIconSlot,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { SidebarMenuButton } from "@/shared/ui/sidebar";
import { Skeleton } from "@/shared/ui/skeleton";

export type WorkspaceOrgRow = { id: string; name: string; slug: string };

function workspaceEmptyStateMessage(canCreateTeam: boolean, billingEnabled: boolean | undefined): string {
  if (canCreateTeam) {
    return "Create your first workspace to connect Webflow and manage Beacon presets.";
  }
  if (billingEnabled) {
    return "Subscribe to individual Pro to create a workspace.";
  }
  return "No workspaces yet.";
}

function workspaceCreateAnotherLabel(showUpgradeForAnother: boolean): string {
  return showUpgradeForAnother ? "Subscribe to Pro for another workspace" : "New workspace";
}

function WorkspaceSwitcherCreateActions(props: {
  canCreateTeam: boolean;
  showUpgradeForAnother: boolean;
  billingEnabled: boolean | undefined;
  onOpenCreate: () => void;
}) {
  if (props.canCreateTeam) {
    return (
      <>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={props.onOpenCreate}>
          <IconPlus className="size-4" />
          {workspaceCreateAnotherLabel(props.showUpgradeForAnother)}
        </DropdownMenuItem>
      </>
    );
  }

  if (!props.billingEnabled || !props.showUpgradeForAnother) {
    return null;
  }

  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <Link href="/billing">Subscribe to Pro for another workspace</Link>
      </DropdownMenuItem>
    </>
  );
}

export function TeamWorkspaceSwitcher(props: {
  orgs: WorkspaceOrgRow[] | null | undefined;
  orgsPending: boolean;
  activeOrgId: string | undefined;
  /** Trigger label (loading / no workspace / current name / select prompt). */
  triggerLabel: string;
  busy: boolean;
  /** Narrow trigger for app header. */
  compact?: boolean;
  canCreateTeam: boolean;
  showUpgradeForAnother?: boolean;
  billingEnabled?: boolean;
  orgName: string;
  onOrgNameChange: (v: string) => void;
  onCreateOrg: (e: FormEvent) => Promise<boolean>;
  onSetActive: (organizationId: string) => void;
  /** Persisted default when the user belongs to multiple workspaces. */
  preferredOrgId: string | undefined;
  onTogglePreferredWorkspace: (organizationId: string) => void;
}) {
  const [createOpen, setCreateOpen] = useState(false);

  const list = useMemo(
    () => sortWorkspacesWithPreferredFirst(props.orgs ?? [], props.preferredOrgId),
    [props.orgs, props.preferredOrgId]
  );
  const disabled = props.busy || props.orgsPending;
  const showOrgsPending = useDeferredLoadingIndicator(props.orgsPending);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {props.compact ? (
            <SidebarMenuButton
              variant="outline"
              disabled={disabled}
              className="font-normal"
              aria-label="Workspace menu"
            >
              <IconBuildingCommunity className="opacity-60" aria-hidden />
              {showOrgsPending ? (
                <Skeleton className="h-3 w-24" aria-hidden />
              ) : (
                <span className="min-w-0 flex-1 truncate">{props.triggerLabel}</span>
              )}
              <IconChevronDown className="ml-auto opacity-50" aria-hidden />
            </SidebarMenuButton>
          ) : (
            <Button type="button" variant="outline" disabled={disabled} size="workspace" aria-label="Workspace menu">
              <span className="flex min-w-0 flex-1 items-center gap-2 text-left">
                <IconBuildingCommunity className="size-4 shrink-0 opacity-60" aria-hidden />
                {showOrgsPending ? (
                  <Skeleton className="h-3 w-24" aria-hidden />
                ) : (
                  <span className="truncate">{props.triggerLabel}</span>
                )}
              </span>
              <IconChevronDown className="size-4 shrink-0 opacity-50" aria-hidden />
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" size="panel">
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          {list.length > 0 ? (
            <div className="flex flex-col">
              {list.map((o) => {
                const isActive = props.activeOrgId === o.id;
                const isPreferred = props.preferredOrgId === o.id;
                return (
                  <DropdownMenuItem
                    key={o.id}
                    layout="workspace"
                    onSelect={() => {
                      props.onSetActive(o.id);
                    }}
                  >
                    <DropdownMenuItemIconSlot>
                      {isActive ? <IconCheck className="text-foreground" aria-hidden /> : null}
                    </DropdownMenuItemIconSlot>
                    <span className="min-w-0 flex-1 truncate">{o.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={
                        isPreferred ? "Remove as default workspace for Team" : "Set as default workspace for Team"
                      }
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        props.onTogglePreferredWorkspace(o.id);
                      }}
                    >
                      {isPreferred ? (
                        <IconStarFilled className="text-amber-600 dark:text-amber-400" aria-hidden />
                      ) : (
                        <IconStar className="opacity-70" aria-hidden />
                      )}
                    </Button>
                  </DropdownMenuItem>
                );
              })}
            </div>
          ) : (
            <DropdownMenuEmptyState>
              {workspaceEmptyStateMessage(props.canCreateTeam, props.billingEnabled)}
            </DropdownMenuEmptyState>
          )}
          <WorkspaceSwitcherCreateActions
            canCreateTeam={props.canCreateTeam}
            showUpgradeForAnother={props.showUpgradeForAnother ?? false}
            billingEnabled={props.billingEnabled}
            onOpenCreate={() => setCreateOpen(true)}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      {props.canCreateTeam ? (
        <CreateWorkspaceDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          orgName={props.orgName}
          onOrgNameChange={props.onOrgNameChange}
          busy={disabled}
          onSubmit={props.onCreateOrg}
        />
      ) : null}
    </>
  );
}
