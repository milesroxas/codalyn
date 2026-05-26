"use client";

import {
  IconBuildingCommunity,
  IconCheck,
  IconChevronDown,
  IconPlus,
  IconStar,
  IconStarFilled,
} from "@tabler/icons-react";
import { type FormEvent, useState } from "react";
import { CreateWorkspaceDialog } from "@/features/team/ui/create-workspace-dialog";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Skeleton } from "@/shared/ui/skeleton";

export type WorkspaceOrgRow = { id: string; name: string; slug: string };

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
  orgName: string;
  onOrgNameChange: (v: string) => void;
  onCreateOrg: (e: FormEvent) => Promise<boolean>;
  onSetActive: (organizationId: string) => void;
  /** Persisted default when the user belongs to multiple workspaces. */
  preferredOrgId: string | undefined;
  onTogglePreferredWorkspace: (organizationId: string) => void;
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
            size={props.compact ? "sm" : "lg"}
            className={
              props.compact
                ? "h-8 min-w-32 max-w-[11rem] justify-between gap-1.5 px-2 text-xs font-normal sm:min-w-36 sm:max-w-[14rem]"
                : "min-w-48 max-w-[min(18rem,100%)] justify-between gap-2 px-3 font-normal"
            }
            aria-label="Workspace menu"
          >
            <span className="flex min-w-0 flex-1 items-center gap-2 text-left">
              <IconBuildingCommunity className="size-4 shrink-0 opacity-60" aria-hidden />
              {props.orgsPending ? (
                <Skeleton className="h-3 w-24" aria-hidden />
              ) : (
                <span className="truncate">{props.triggerLabel}</span>
              )}
            </span>
            <IconChevronDown className="size-4 shrink-0 opacity-50" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          {list.length > 0 ? (
            <div className="flex flex-col">
              {list.map((o) => {
                const isActive = props.activeOrgId === o.id;
                const isPreferred = props.preferredOrgId === o.id;
                return (
                  <DropdownMenuItem
                    key={o.id}
                    className="flex cursor-pointer items-center gap-2 pr-1.5"
                    onSelect={() => {
                      props.onSetActive(o.id);
                    }}
                  >
                    <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground">
                      {isActive ? <IconCheck className="size-4 text-foreground" aria-hidden /> : null}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{o.name}</span>
                    <button
                      type="button"
                      className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
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
                        <IconStarFilled className="size-4 text-amber-600 dark:text-amber-400" aria-hidden />
                      ) : (
                        <IconStar className="size-4 opacity-70" aria-hidden />
                      )}
                    </button>
                  </DropdownMenuItem>
                );
              })}
            </div>
          ) : (
            <p className="px-2 py-2 text-xs text-muted-foreground">
              {props.canCreateTeam
                ? "No workspaces yet. Create one to connect Webflow and manage Beacon presets."
                : "No team workspaces yet. Accept an invite or upgrade to Team to create one."}
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
