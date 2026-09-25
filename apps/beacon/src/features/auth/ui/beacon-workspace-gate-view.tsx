import { ExternalLink, Loader2, LogOut, RefreshCw } from "lucide-react";
import type { TowerAppLinkProps } from "@/features/auth/model/use-tower-app-link";
import type { BeaconTowerWorkspace } from "@/features/settings/model/beacon-app-settings-provider";
import { SINGLE_WORKSPACE_CONFIRM_LABEL } from "@/features/settings/ui/beacon-workspace-control";
import { Button } from "@/shared/ui/button";
import { ScrollArea } from "@/shared/ui/scroll-area";

export type BeaconWorkspaceGateViewProps = {
  siteLabel: string;
  /** Tower workspaces the user belongs to (none is active on this session). */
  workspaces: BeaconTowerWorkspace[];
  /** Workspace whose confirmation is being persisted; disables the controls meanwhile. */
  selectingId: string | null;
  /** True after a confirmation Tower refused or that failed to reach it. */
  selectFailed: boolean;
  /** New-tab link into Tower for users with no workspace; `null` when no Tower origin is configured. */
  towerLinkProps: TowerAppLinkProps | null;
  onSelectWorkspace: (organizationId: string) => void;
  onCheckAgain: () => void;
  onSignOut: () => void;
};

function SignOutButton(props: { onSignOut: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 w-full justify-center text-[11px] text-muted-foreground"
      onClick={props.onSignOut}
    >
      <LogOut aria-hidden data-icon="inline-start" />
      Sign out
    </Button>
  );
}

/**
 * Presentational body of the workspace step of the site gate: a signed-in Designer session that
 * holds no active Tower workspace yet. Nothing is persisted until the user clicks — a single
 * workspace is shown as the default with an explicit confirmation, several are listed to pick from
 * (Marketplace review round 8, "Workspace state persisted without explicit user interaction"). With
 * no workspace at all, the only way forward is Tower, opened as an ordinary new-tab link.
 */
export function BeaconWorkspaceGateView(props: BeaconWorkspaceGateViewProps) {
  const {
    siteLabel,
    workspaces,
    selectingId,
    selectFailed,
    towerLinkProps,
    onSelectWorkspace,
    onCheckAgain,
    onSignOut,
  } = props;
  const busy = selectingId !== null;
  const only = workspaces.length === 1 ? workspaces[0] : null;

  return (
    <ScrollArea className="min-h-0 min-w-0 flex-1">
      <div className="flex min-h-full min-w-0 flex-col items-center justify-center px-4 py-8">
        <div className="mx-auto w-full max-w-sm space-y-4 text-center">
          {workspaces.length === 0 ? (
            <>
              <h2 className="text-base font-semibold text-foreground">No Tower workspace yet</h2>
              <p className="text-sm text-muted-foreground">
                Your Tower account isn't part of a workspace. Open Tower to create or join one, then check again to
                continue on <span className="font-medium text-foreground">{siteLabel}</span>.
              </p>
              {towerLinkProps ? (
                <Button asChild className="w-full">
                  <a {...towerLinkProps}>
                    <ExternalLink aria-hidden data-icon="inline-start" />
                    Open Tower
                  </a>
                </Button>
              ) : null}
              <Button type="button" variant="outline" className="w-full" onClick={onCheckAgain}>
                <RefreshCw aria-hidden data-icon="inline-start" />
                Check again
              </Button>
            </>
          ) : only ? (
            <>
              <h2 className="text-base font-semibold text-foreground">Confirm your workspace</h2>
              <p className="text-sm text-muted-foreground">
                Beacon syncs team presets and Webflow access through your Tower workspace. Confirm it to continue on{" "}
                <span className="font-medium text-foreground">{siteLabel}</span>.
              </p>
              <p className="rounded-sm border border-border bg-card px-3 py-2 text-sm font-medium text-foreground">
                {only.name}
              </p>
              <Button
                type="button"
                className="w-full"
                disabled={busy}
                aria-busy={busy}
                onClick={() => onSelectWorkspace(only.id)}
              >
                {busy ? <Loader2 aria-hidden data-icon="inline-start" className="animate-spin" /> : null}
                {SINGLE_WORKSPACE_CONFIRM_LABEL}
              </Button>
            </>
          ) : (
            <>
              <h2 className="text-base font-semibold text-foreground">Choose a workspace</h2>
              <p className="text-sm text-muted-foreground">
                Pick the Tower workspace to use with <span className="font-medium text-foreground">{siteLabel}</span>.
                You can switch later from the menu.
              </p>
              <ul className="flex flex-col gap-2" aria-label="Tower workspaces">
                {workspaces.map((workspace) => {
                  const selecting = selectingId === workspace.id;
                  return (
                    <li key={workspace.id}>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start"
                        disabled={busy}
                        aria-busy={selecting}
                        onClick={() => onSelectWorkspace(workspace.id)}
                      >
                        {selecting ? <Loader2 aria-hidden data-icon="inline-start" className="animate-spin" /> : null}
                        <span className="truncate">{workspace.name}</span>
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
          {selectFailed ? (
            <p className="text-xs leading-snug text-destructive" role="alert">
              Couldn't set the workspace. Try again.
            </p>
          ) : null}
          <SignOutButton onSignOut={onSignOut} />
        </div>
      </div>
    </ScrollArea>
  );
}
