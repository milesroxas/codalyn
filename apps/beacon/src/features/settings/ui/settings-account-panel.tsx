import type { TowerUsagePlanContext } from "@codalyn/webflow-kit";
import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { getTowerAuthBaseUrl, openTowerAppPath } from "@/features/auth/model/tower-auth-client";
import type { BridgedTowerUser } from "@/features/auth/model/use-beacon-tower-session";
import { useBeaconTowerSession } from "@/features/auth/model/use-beacon-tower-session";
import { BeaconTowerActionList } from "@/features/auth/ui/beacon-tower-action-list";
import { BeaconTowerNotConfiguredNotice } from "@/features/auth/ui/beacon-tower-not-configured-notice";
import { BeaconTowerSignInPrompt } from "@/features/auth/ui/beacon-tower-sign-in-prompt";
import { useTowerUsageStatus } from "@/features/billing/model/use-tower-usage-status";
import type {
  BeaconSettingsSyncState,
  BeaconTowerWorkspace,
} from "@/features/settings/model/beacon-app-settings-provider";
import { useBeaconAppSettings } from "@/features/settings/model/beacon-app-settings-provider";
import { BeaconWorkspaceSelectField } from "@/features/settings/ui/beacon-workspace-control";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
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

function planStatusMeta(
  plan: TowerUsagePlanContext | null,
  loading: boolean
): { label: string | null; description: string } {
  if (plan) {
    if (plan.billingScope === "workspace") {
      return { label: plan.name, description: "Billed to the workspace, per seat." };
    }
    if (plan.key === "free") {
      return { label: plan.name, description: "Upgrade in Tower to raise monthly limits." };
    }
    return { label: plan.name, description: "Billed to your Tower account." };
  }
  if (loading) {
    return { label: null, description: "Loading plan from Tower." };
  }
  return { label: null, description: "Could not load plan details from Tower." };
}

/** Plan name, workspace role, and the billing hand-off to Tower. Mirrors the Sync section's header + badge layout. */
function AccountPlanSection({ roleAux }: { roleAux: ReturnType<typeof roleAuxLabel> }) {
  const { status, loading } = useTowerUsageStatus(true);
  const meta = planStatusMeta(status?.plan ?? null, loading);

  return (
    <section className="flex flex-col gap-2 py-6">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <h2 className="text-sm font-medium leading-tight">Plan</h2>
        {meta.label ? (
          <Badge variant="outline" className="shrink-0 font-normal">
            {meta.label}
          </Badge>
        ) : null}
      </div>
      <p className="text-muted-foreground text-xs leading-snug">{meta.description}</p>
      {roleAux ? (
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
          <span className="text-muted-foreground text-xs leading-tight">Role</span>
          <span
            className={cn(
              "text-xs leading-tight",
              roleAux.tone === "destructive" ? "text-destructive" : "text-foreground"
            )}
          >
            {roleAux.text}
          </span>
        </div>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="xs"
        className="mt-1 self-start"
        onClick={() => openTowerAppPath("/billing")}
      >
        Manage billing
        <ExternalLink aria-hidden />
      </Button>
    </section>
  );
}

function AccessModeChip({ label, tooltip }: { label: string; tooltip: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        tabIndex={0}
        aria-describedby={undefined}
        className="inline-flex h-5 cursor-help items-center rounded-sm bg-muted/60 px-2 text-xs font-normal text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
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
              className="size-10 shrink-0 rounded-sm object-cover ring-1 ring-inset ring-border"
            />
          ) : (
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-muted text-xs font-semibold text-muted-foreground ring-1 ring-inset ring-border"
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
            <p className="text-muted-foreground truncate text-xs leading-tight">{user.email}</p>
          </div>
          <BeaconWorkspaceSelectField
            syncState={syncState}
            workspaces={beaconWorkspaces}
            activeOrganizationId={activeOrganizationId}
            onSelectWorkspace={setActiveBeaconWorkspace}
          />
        </div>
      </section>

      <Separator />

      <AccountPlanSection roleAux={roleAux} />

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
              <span aria-hidden className={cn("size-1.5 rounded-sm", syncStatusMeta(syncState).dotClass)} />
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
        <BeaconTowerActionList onSignOut={onSignOut} />
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
      return <BeaconTowerNotConfiguredNotice />;
    }

    return (
      <BeaconTowerSignInPrompt
        title="Tower account"
        description="Sign in or create an account to sync presets and preferences across devices. Until then, settings stay in this browser only."
      />
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
