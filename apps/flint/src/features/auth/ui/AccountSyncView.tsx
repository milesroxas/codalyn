import { CloudOff, LogOut, Plug, RefreshCw } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useFlintTower } from "@/features/auth/model/flint-tower-provider";
import { openTowerAppTab, openTowerWebflowConnect } from "@/features/auth/model/tower-auth-client";
import { FlintTowerSignInForm } from "@/features/auth/ui/FlintTowerSignInForm";
import { parseIgnoredClassesInput } from "@/features/linter/lib/class-lint-ignore";
import type { FlintSyncStatus } from "@/features/linter/services/sync/flint-sync.store";
import type { FlintTier } from "@/shared/lib/flint-entitlement";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

const TIER_LABEL: Record<FlintTier, string> = {
  free: "Free",
  pro: "Pro",
  studio: "Studio",
  team: "Team",
};

function syncStatusMeta(status: FlintSyncStatus): { label: string; description: string; dotClass: string } {
  switch (status) {
    case "synced":
      return { label: "Synced", description: "Preferences match your Tower account.", dotClass: "bg-emerald-500" };
    case "hydrating":
      return {
        label: "Syncing",
        description: "Loading preferences from Tower.",
        dotClass: "bg-amber-500 animate-pulse",
      };
    case "offline":
      return {
        label: "Offline",
        description: "Could not reach Tower. Local settings are in use.",
        dotClass: "bg-muted-foreground",
      };
    case "error":
      return {
        label: "Sync issue",
        description: "Could not sync with Tower. Retry when ready.",
        dotClass: "bg-destructive",
      };
    default:
      return { label: "Idle", description: "Not synced yet.", dotClass: "bg-muted-foreground" };
  }
}

function userInitials(email: string): string {
  const name = email.split("@")[0] ?? "";
  return name.slice(0, 2).toUpperCase() || "?";
}

const Section: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="px-4 py-3 border-b border-border last:border-0 space-y-2">{children}</div>
);

/** Team admins edit the workspace-enforced global ignore list, shared with every member. */
const TeamConfigSection: React.FC = () => {
  const { effective, updateSettings } = useFlintTower();
  const teamIgnored = effective?.teamSettings?.globalIgnoredClasses ?? [];
  const [draft, setDraft] = useState(() => teamIgnored.join("\n"));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-seed the draft whenever a fresh team value arrives (e.g. another admin edits it).
  useEffect(() => {
    setDraft(teamIgnored.join("\n"));
  }, [teamIgnored]);

  const handleSave = () => {
    setSaving(true);
    setError(null);
    void updateSettings({ team: { globalIgnoredClasses: parseIgnoredClassesInput(draft) } })
      .then((r) => {
        if (r.ok) {
          void webflow.notify({ type: "Success", message: "Team ignore list saved." });
        } else {
          setError("Could not save. Check your connection and try again.");
        }
      })
      .finally(() => setSaving(false));
  };

  return (
    <Section>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-foreground">Team ignored classes</span>
        <Badge variant="outline" className="font-normal text-muted-foreground">
          Admin
        </Badge>
      </div>
      <p className="text-[11px] text-muted-foreground leading-snug">
        Class names every member skips during linting. One per line or comma-separated. Applies on top of each member's
        personal list.
      </p>
      <textarea
        className="w-full min-h-[72px] rounded-md border border-input bg-background px-2 py-1.5 text-[11px] font-mono leading-snug resize-y"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        spellCheck={false}
      />
      {error && <p className="text-[11px] text-destructive leading-snug">{error}</p>}
      <Button type="button" size="sm" variant="outline" className="h-7 w-full" disabled={saving} onClick={handleSave}>
        {saving ? "Saving…" : "Save team list"}
      </Button>
    </Section>
  );
};

/** Tower not configured: free/offline build. */
const OfflineModeSection: React.FC = () => (
  <Section>
    <div className="flex items-center gap-2">
      <CloudOff className="size-4 text-muted-foreground" />
      <span className="text-xs font-medium text-foreground">Offline mode</span>
    </div>
    <p className="text-[11px] text-muted-foreground leading-snug">
      Cloud sync isn't available in this build. Flint runs fully on this device — all settings and rules stay local.
    </p>
  </Section>
);

/**
 * Configured but signed out: the inline email/password form is the explicit sign-in. The Webflow
 * Designer session is attempted silently on mount/focus (see useFlintTowerSession) — it is never a
 * button. Connecting Webflow is a separate, post-sign-in step.
 */
const SignedOutSection: React.FC = () => {
  return (
    <Section>
      <span className="text-xs font-medium text-foreground">Sync settings across devices</span>
      <p className="text-[11px] text-muted-foreground leading-snug">
        Sign in to your Tower account to sync rule configuration and, on paid plans, share linting standards with your
        team.
      </p>
      <FlintTowerSignInForm />
      <div className="flex items-center justify-center gap-2 text-[11px]">
        <button
          type="button"
          className="text-muted-foreground underline-offset-2 hover:underline"
          onClick={() => openTowerAppTab("/sign-up")}
        >
          Create account
        </button>
        <span aria-hidden className="text-muted-foreground">
          ·
        </span>
        <button
          type="button"
          className="text-muted-foreground underline-offset-2 hover:underline"
          onClick={() => openTowerAppTab("/forgot-password")}
        >
          Forgot password?
        </button>
      </div>
    </Section>
  );
};

const SyncStatusSection: React.FC<{ syncStatus: FlintSyncStatus; onRetry: () => void }> = ({ syncStatus, onRetry }) => {
  const meta = syncStatusMeta(syncStatus);
  return (
    <Section>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-foreground">Sync</span>
        <div className="flex items-center gap-2">
          {(syncStatus === "error" || syncStatus === "offline") && (
            <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={onRetry}>
              <RefreshCw className="size-3" />
              Retry
            </Button>
          )}
          <Badge variant="outline" className="gap-1.5">
            <span aria-hidden className={`size-1.5 rounded-sm ${meta.dotClass}`} />
            {meta.label}
          </Badge>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground leading-snug">{meta.description}</p>
    </Section>
  );
};

/**
 * Webflow connection status. When not connected, Designer sign-in for other devices can't resolve
 * until someone connects, so we surface a Connect action that opens Tower's web connect flow.
 */
const WebflowConnectionSection: React.FC<{ connected: boolean }> = ({ connected }) => (
  <Section>
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-medium text-foreground">Webflow</span>
      <Badge variant="outline" className="gap-1.5">
        <span aria-hidden className={`size-1.5 rounded-sm ${connected ? "bg-emerald-500" : "bg-muted-foreground"}`} />
        {connected ? "Connected" : "Not connected"}
      </Badge>
    </div>
    {!connected && (
      <>
        <p className="text-[11px] text-muted-foreground leading-snug">
          The site you're in isn't linked yet. Connect its Webflow workspace to enable Tower sign-in across this team.
          Opens Tower in a popup, scoped to this site.
        </p>
        <Button type="button" size="sm" variant="outline" className="h-7 w-full" onClick={openTowerWebflowConnect}>
          <Plug className="size-3.5" />
          Connect this site
        </Button>
      </>
    )}
  </Section>
);

/** Signed-in account: profile, sync status, workspace/access, team config, sign-out. */
const SignedInSections: React.FC = () => {
  const { user, signOut, entitlement, syncStatus, effective, refresh } = useFlintTower();
  const tier = entitlement.tier;
  const teamName = effective?.activeOrganizationName ?? null;
  const canManageTeam = effective?.canManageTeamFlintSettings ?? false;
  const editorExperience = effective?.editorExperience ?? false;
  const webflowConnected = effective?.webflowConnected ?? false;

  return (
    <div className="flex flex-col">
      <Section>
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-muted font-semibold text-[11px] text-muted-foreground">
            {userInitials(user?.email ?? "")}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-xs font-medium text-foreground">{user?.name?.trim() || "Tower account"}</p>
              <Badge variant="secondary" className="shrink-0">
                {TIER_LABEL[tier]}
              </Badge>
            </div>
            <p className="truncate text-[11px] text-muted-foreground">{user?.email}</p>
          </div>
        </div>
      </Section>

      <SyncStatusSection syncStatus={syncStatus} onRetry={refresh} />

      <WebflowConnectionSection connected={webflowConnected} />

      {teamName && (
        <Section>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-foreground">Workspace</span>
            <span className="truncate text-[11px] text-muted-foreground">{teamName}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            {canManageTeam && (
              <Badge variant="outline" className="font-normal text-muted-foreground">
                Manages team rules
              </Badge>
            )}
            {editorExperience && (
              <Badge variant="outline" className="font-normal text-muted-foreground">
                Team-managed
              </Badge>
            )}
          </div>
        </Section>
      )}

      {canManageTeam && <TeamConfigSection />}

      {tier === "free" && (
        <Section>
          <p className="text-[11px] text-muted-foreground leading-snug">
            You're on the Free plan — settings stay on this device. Upgrade in Tower to sync across devices and share
            team standards.
          </p>
        </Section>
      )}

      <Section>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-full justify-start text-destructive"
          onClick={signOut}
        >
          <LogOut className="size-3.5" />
          Sign out
        </Button>
      </Section>
    </div>
  );
};

export const AccountSyncView: React.FC = () => {
  const { isTowerConfigured, user } = useFlintTower();
  if (!isTowerConfigured) {
    return <OfflineModeSection />;
  }
  if (!user) {
    return <SignedOutSection />;
  }
  return <SignedInSections />;
};
