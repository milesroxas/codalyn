import { ExternalLink, LogOut, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { getTowerAuthBaseUrl, openTowerAuthPopup } from "@/features/auth/model/tower-auth-client";
import type { BridgedTowerUser } from "@/features/auth/model/use-beacon-tower-session";
import { useBeaconTowerSession } from "@/features/auth/model/use-beacon-tower-session";
import type {
  BeaconSettingsSyncState,
  BeaconTowerWorkspace,
} from "@/features/settings/model/beacon-app-settings-provider";
import { useBeaconAppSettings } from "@/features/settings/model/beacon-app-settings-provider";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Separator } from "@/shared/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

function userInitials(user: BridgedTowerUser): string {
  const n = user.name?.trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const a = parts[0]?.[0];
      const b = parts[parts.length - 1]?.[0];
      if (a && b) {
        return (a + b).toUpperCase();
      }
    }
    return n.slice(0, 2).toUpperCase();
  }
  const e = user.email.trim();
  return e ? e.slice(0, 1).toUpperCase() : "?";
}

function openTowerAppPath(path: string): void {
  const base = getTowerAuthBaseUrl();
  if (!base) {
    return;
  }
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

function isProductAdminAppRole(role: string | null): boolean {
  if (!role) {
    return false;
  }
  return role
    .split(",")
    .map((r) => r.trim())
    .includes("product_admin");
}

function formatMemberRoleForBadge(workspaceMemberRole: string | null, hasActiveWorkspace: boolean): string {
  if (!hasActiveWorkspace) {
    return "—";
  }
  if (!workspaceMemberRole) {
    return "Member";
  }
  const r = workspaceMemberRole.toLowerCase();
  if (r === "admin") {
    return "Team admin";
  }
  if (r === "owner") {
    return "Owner";
  }
  if (r === "designer") {
    return "Designer";
  }
  if (r === "editor") {
    return "Editor";
  }
  if (r === "member") {
    return "Member";
  }
  return workspaceMemberRole.replace(/_/g, " ");
}

const WORKSPACE_SELECT_NONE = "__beacon_workspace_none__";

function roleAuxLabel(
  syncState: BeaconSettingsSyncState,
  workspaceMemberRole: string | null,
  hasActiveWorkspace: boolean
): { text: string; tone: "muted" | "destructive" } | null {
  if (syncState === "error") {
    return { text: "Role unavailable", tone: "destructive" };
  }
  if (syncState !== "synced") {
    return null;
  }
  if (!hasActiveWorkspace) {
    return null;
  }
  return {
    text: formatMemberRoleForBadge(workspaceMemberRole, hasActiveWorkspace),
    tone: "muted",
  };
}

function WorkspaceField({
  syncState,
  workspaces,
  activeOrganizationId,
  setActiveBeaconWorkspace,
}: {
  syncState: BeaconSettingsSyncState;
  workspaces: BeaconTowerWorkspace[];
  activeOrganizationId: string | null;
  setActiveBeaconWorkspace: (organizationId: string) => void;
}) {
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
      value={activeOrganizationId ?? WORKSPACE_SELECT_NONE}
      onValueChange={(v) => {
        if (v !== WORKSPACE_SELECT_NONE) {
          setActiveBeaconWorkspace(v);
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
        <SelectItem value={WORKSPACE_SELECT_NONE} disabled className="text-muted-foreground">
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

function syncStatusMeta(syncState: BeaconSettingsSyncState): {
  label: string;
  description: string;
  dotClass: string;
} {
  if (syncState === "error") {
    return {
      label: "Sync issue",
      description: "Could not reach Tower. Check the network, then retry.",
      dotClass: "bg-destructive",
    };
  }
  if (syncState === "synced") {
    return {
      label: "Synced",
      description: "Preferences match your Tower account.",
      dotClass: "bg-emerald-500",
    };
  }
  return {
    label: "Syncing",
    description: "Loading preferences from Tower.",
    dotClass: "bg-amber-500 animate-pulse",
  };
}

function AccessModeChip({ label, tooltip }: { label: string; tooltip: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        tabIndex={0}
        aria-describedby={undefined}
        className="inline-flex h-5 cursor-help items-center rounded-full bg-muted/60 px-2 text-xs font-normal text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        {label}
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px] text-left leading-snug">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

function WorkspaceAccessPills({
  editorExperience,
  canManageTeamBeaconSettings,
  restrictToEditorExperience,
}: {
  editorExperience: boolean;
  canManageTeamBeaconSettings: boolean;
  restrictToEditorExperience: boolean;
}) {
  if (!editorExperience && !canManageTeamBeaconSettings && !restrictToEditorExperience) {
    return null;
  }
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
      <span className="text-muted-foreground text-xs leading-tight">Access</span>
      {canManageTeamBeaconSettings ? (
        <AccessModeChip label="Team presets" tooltip="Edit shared export presets for your workspace in Tower." />
      ) : null}
      {editorExperience ? (
        <AccessModeChip
          label="Simplified UI"
          tooltip="Fewer controls in Beacon; workspace presets still apply in the Designer."
        />
      ) : null}
      {restrictToEditorExperience ? (
        <AccessModeChip label="Editor-style" tooltip="Streamlined editor experience for this account." />
      ) : null}
    </div>
  );
}

function SignedInAccountSections({
  user,
  syncState,
  refreshBeaconSettings,
  editorExperience,
  canManageTeamBeaconSettings,
  restrictToEditorExperience,
  workspaceMemberRole,
  appUserRole,
  hasActiveWorkspace,
  beaconWorkspaces,
  activeOrganizationId,
  setActiveBeaconWorkspace,
  onSignOut,
}: {
  user: BridgedTowerUser;
  syncState: BeaconSettingsSyncState;
  refreshBeaconSettings: () => void;
  editorExperience: boolean;
  canManageTeamBeaconSettings: boolean;
  restrictToEditorExperience: boolean;
  workspaceMemberRole: string | null;
  appUserRole: string | null;
  hasActiveWorkspace: boolean;
  beaconWorkspaces: BeaconTowerWorkspace[];
  activeOrganizationId: string | null;
  setActiveBeaconWorkspace: (organizationId: string) => void;
  onSignOut: () => void;
}) {
  const base = getTowerAuthBaseUrl();
  const productAdmin = isProductAdminAppRole(appUserRole);
  const roleAux = roleAuxLabel(syncState, workspaceMemberRole, hasActiveWorkspace);

  return (
    <div className="flex min-w-0 flex-col">
      <section className="flex min-w-0 flex-col gap-4 pb-6">
        <div className="flex min-w-0 items-center gap-3">
          {user.image ? (
            <img
              src={user.image}
              alt=""
              className="size-10 shrink-0 rounded-full object-cover ring-1 ring-inset ring-border"
            />
          ) : (
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground ring-1 ring-inset ring-border"
              aria-hidden
            >
              {userInitials(user)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <p className="truncate text-sm font-medium leading-tight">{user.name?.trim() || "Tower account"}</p>
              {productAdmin && syncState === "synced" ? (
                <Badge variant="secondary" className="shrink-0 font-normal">
                  Product admin
                </Badge>
              ) : null}
            </div>
            <p className="text-muted-foreground truncate text-xs leading-tight">
              <span>{user.email}</span>
              {roleAux ? (
                <>
                  <span aria-hidden> · </span>
                  <span className={cn(roleAux.tone === "destructive" ? "text-destructive" : undefined)}>
                    {roleAux.text}
                  </span>
                </>
              ) : null}
            </p>
          </div>
          <WorkspaceField
            syncState={syncState}
            workspaces={beaconWorkspaces}
            activeOrganizationId={activeOrganizationId}
            setActiveBeaconWorkspace={setActiveBeaconWorkspace}
          />
        </div>
      </section>

      <Separator />

      <section className="flex flex-col gap-2 py-6">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <h2 className="text-sm font-medium leading-tight">Sync</h2>
          <div className="flex shrink-0 items-center gap-2">
            {syncState === "error" ? (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="h-auto px-0 text-xs font-medium text-primary hover:bg-transparent hover:underline"
                onClick={refreshBeaconSettings}
              >
                Retry
              </Button>
            ) : null}
            <Badge variant="outline" className="gap-1.5 font-normal">
              <span aria-hidden className={cn("size-1.5 rounded-full", syncStatusMeta(syncState).dotClass)} />
              {syncStatusMeta(syncState).label}
            </Badge>
          </div>
        </div>
        <p className="text-muted-foreground text-xs leading-snug">{syncStatusMeta(syncState).description}</p>
        <WorkspaceAccessPills
          editorExperience={editorExperience}
          canManageTeamBeaconSettings={canManageTeamBeaconSettings}
          restrictToEditorExperience={restrictToEditorExperience}
        />
      </section>

      <Separator />

      <section className="flex flex-col gap-3 pt-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-medium leading-tight">Tower</h2>
          <p className="text-muted-foreground text-xs leading-snug">
            Manage presets, workspace, and security in the browser.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-between gap-2"
            disabled={!base}
            onClick={() => openTowerAppPath("/beacon")}
          >
            Beacon &amp; presets
            <ExternalLink aria-hidden className="size-3.5 opacity-60" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-between gap-2"
            disabled={!base}
            onClick={() => openTowerAppPath("/account")}
          >
            Account &amp; security
            <ExternalLink aria-hidden className="size-3.5 opacity-60" />
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={() => void onSignOut()}
          >
            <LogOut aria-hidden className="size-3.5" />
            Sign out
          </Button>
        </div>
      </section>
    </div>
  );
}

export function SettingsAccountPanel() {
  const { user, isPending, clearStoredSession } = useBeaconTowerSession();
  const {
    syncState,
    refreshBeaconSettings,
    editorExperience,
    canManageTeamBeaconSettings,
    restrictToEditorExperience,
    workspaceMemberRole,
    appUserRole,
    hasActiveWorkspace,
    beaconWorkspaces,
    activeOrganizationId,
    setActiveBeaconWorkspace,
  } = useBeaconAppSettings();
  const base = getTowerAuthBaseUrl();

  if (isPending) {
    return <p className="text-muted-foreground text-sm">Checking account…</p>;
  }

  if (!user) {
    if (!base) {
      return (
        <p className="text-muted-foreground text-sm">
          Tower is not configured. Add <span className="font-mono">VITE_TOWER_ORIGIN</span> to connect an account.
        </p>
      );
    }

    return (
      <div className="flex flex-col gap-3">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-sm font-medium leading-tight">
            <Sparkles aria-hidden className="size-4 text-primary" />
            Tower account
          </h2>
          <p className="text-muted-foreground text-xs leading-snug">
            Sign in or create an account to sync presets and preferences across devices. Until then, settings stay in
            this browser only.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button type="button" className="w-full" onClick={() => openTowerAuthPopup("/sign-in")}>
            Sign in to Tower
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={() => openTowerAuthPopup("/sign-up")}>
            Create Tower account
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SignedInAccountSections
      user={user}
      syncState={syncState}
      refreshBeaconSettings={refreshBeaconSettings}
      editorExperience={editorExperience}
      canManageTeamBeaconSettings={canManageTeamBeaconSettings}
      restrictToEditorExperience={restrictToEditorExperience}
      workspaceMemberRole={workspaceMemberRole}
      appUserRole={appUserRole}
      hasActiveWorkspace={hasActiveWorkspace}
      beaconWorkspaces={beaconWorkspaces}
      activeOrganizationId={activeOrganizationId}
      setActiveBeaconWorkspace={setActiveBeaconWorkspace}
      onSignOut={clearStoredSession}
    />
  );
}
