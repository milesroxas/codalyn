import type {
  BeaconSettingsSyncState,
  BeaconTowerWorkspace,
} from "@/features/settings/model/beacon-app-settings-provider";
import { cn } from "@/shared/lib/utils";
import {
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/shared/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

const BEACON_WORKSPACE_SELECT_NONE = "__beacon_workspace_none__";

type BeaconWorkspaceControlBaseProps = {
  syncState: BeaconSettingsSyncState;
  workspaces: BeaconTowerWorkspace[];
  activeOrganizationId: string | null;
  onSelectWorkspace: (organizationId: string) => void;
};

function activeWorkspaceName(workspaces: BeaconTowerWorkspace[], activeOrganizationId: string | null): string | null {
  if (!activeOrganizationId) {
    return null;
  }
  return workspaces.find((w) => w.id === activeOrganizationId)?.name ?? null;
}

/** Settings account panel: compact select or static label. */
export function BeaconWorkspaceSelectField({
  syncState,
  workspaces,
  activeOrganizationId,
  onSelectWorkspace,
}: BeaconWorkspaceControlBaseProps) {
  const wrapperClass = "flex min-w-0 shrink-0 flex-col items-end gap-0.5";
  const captionClass = "text-muted-foreground text-[10px] font-normal uppercase tracking-wide leading-none";

  if (syncState === "error") {
    return (
      <div className={wrapperClass}>
        <span className={captionClass}>Workspace</span>
        <span className="text-destructive max-w-40 truncate text-xs leading-tight">Unavailable</span>
      </div>
    );
  }

  if (syncState !== "synced") {
    return (
      <div className={wrapperClass}>
        <span className={captionClass}>Workspace</span>
        <span className="text-muted-foreground text-xs leading-tight">…</span>
      </div>
    );
  }

  if (workspaces.length === 0) {
    return (
      <div className={wrapperClass}>
        <span className={captionClass}>Workspace</span>
        <span className="text-muted-foreground text-xs leading-tight">None</span>
      </div>
    );
  }

  if (workspaces.length === 1) {
    return (
      <div className={wrapperClass}>
        <span className={captionClass}>Workspace</span>
        <span className="max-w-40 truncate text-xs font-medium leading-tight">{workspaces[0].name}</span>
      </div>
    );
  }

  return (
    <Select
      value={activeOrganizationId ?? BEACON_WORKSPACE_SELECT_NONE}
      onValueChange={(v) => {
        if (v !== BEACON_WORKSPACE_SELECT_NONE) {
          onSelectWorkspace(v);
        }
      }}
    >
      <SelectTrigger
        size="sm"
        aria-label="Workspace"
        className="max-w-44 shrink-0 font-normal *:data-[slot=select-value]:truncate"
      >
        <SelectValue placeholder="Select workspace" />
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value={BEACON_WORKSPACE_SELECT_NONE} disabled className="text-muted-foreground">
          Select workspace…
        </SelectItem>
        {workspaces.map((w) => (
          <SelectItem key={w.id} value={w.id}>
            {w.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const beaconMenuSectionLabelClass =
  "px-2 pb-0.5 pt-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground";

/** App menu: show active workspace and switch when the user belongs to multiple. */
export function BeaconWorkspaceMenuGroup({
  syncState,
  workspaces,
  activeOrganizationId,
  onSelectWorkspace,
}: BeaconWorkspaceControlBaseProps) {
  if (syncState === "error") {
    return (
      <DropdownMenuGroup>
        <DropdownMenuLabel className={beaconMenuSectionLabelClass}>Workspace</DropdownMenuLabel>
        <p className="px-2 pb-1 text-destructive text-xs leading-snug">Could not load workspace</p>
      </DropdownMenuGroup>
    );
  }

  if (syncState !== "synced") {
    return (
      <DropdownMenuGroup>
        <DropdownMenuLabel className={beaconMenuSectionLabelClass}>Workspace</DropdownMenuLabel>
        <p className="px-2 pb-1 text-muted-foreground text-xs leading-snug">Syncing…</p>
      </DropdownMenuGroup>
    );
  }

  if (workspaces.length === 0) {
    return (
      <DropdownMenuGroup>
        <DropdownMenuLabel className={beaconMenuSectionLabelClass}>Workspace</DropdownMenuLabel>
        <p className="px-2 pb-1 text-muted-foreground text-xs leading-snug">No Tower workspace yet</p>
      </DropdownMenuGroup>
    );
  }

  if (workspaces.length === 1) {
    return (
      <DropdownMenuGroup>
        <DropdownMenuLabel className={beaconMenuSectionLabelClass}>Workspace</DropdownMenuLabel>
        <p className="px-2 pb-1 text-foreground text-xs font-medium leading-snug">{workspaces[0].name}</p>
      </DropdownMenuGroup>
    );
  }

  const selectedId = activeOrganizationId ?? "";
  const currentName = activeWorkspaceName(workspaces, activeOrganizationId);

  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel className={beaconMenuSectionLabelClass}>Workspace</DropdownMenuLabel>
      {!activeOrganizationId ? (
        <p className={cn("px-2 pb-1 text-muted-foreground text-xs leading-snug")}>
          Select a workspace for team presets
        </p>
      ) : null}
      <DropdownMenuRadioGroup
        value={selectedId}
        onValueChange={(organizationId) => {
          if (organizationId && organizationId !== selectedId) {
            onSelectWorkspace(organizationId);
          }
        }}
      >
        {workspaces.map((w) => (
          <DropdownMenuRadioItem key={w.id} value={w.id}>
            <span className="truncate">{w.name}</span>
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
      {activeOrganizationId && currentName ? (
        <p className="px-2 pt-0.5 text-muted-foreground text-[10px] leading-snug">
          Team presets sync for {currentName}
        </p>
      ) : null}
    </DropdownMenuGroup>
  );
}
