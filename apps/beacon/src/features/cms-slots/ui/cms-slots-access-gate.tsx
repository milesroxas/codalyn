import { ExternalLink, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { getTowerAuthBaseUrl } from "@/features/auth/model/tower-auth-client";
import { useBeaconTowerSession } from "@/features/auth/model/use-beacon-tower-session";
import { BeaconTowerNotConfiguredNotice } from "@/features/auth/ui/beacon-tower-not-configured-notice";
import { BeaconTowerSignInPrompt } from "@/features/auth/ui/beacon-tower-sign-in-prompt";
import { useBeaconAppSettings } from "@/features/settings/model/beacon-app-settings-provider";
import { beaconAppRouteSurfaceClass } from "@/shared/lib/beacon-app-route-surface";
import { CMS_SLOTS_FEATURE_NAME } from "@/shared/lib/cms-slots-feature-copy";
import { Button } from "@/shared/ui/button";
import { ScrollArea } from "@/shared/ui/scroll-area";

function AccessGateLoadingStatus(props: { message: string }) {
  return (
    <div
      className={`${beaconAppRouteSurfaceClass} items-center justify-center gap-3 p-6`}
      role="status"
      aria-live="polite"
    >
      <Loader2 aria-hidden className="size-6 shrink-0 animate-spin text-muted-foreground" />
      <p className="text-muted-foreground text-sm">{props.message}</p>
    </div>
  );
}

export function CmsSlotsAccessGate(props: { children: ReactNode }) {
  const { children } = props;
  const { user, isPending: sessionPending } = useBeaconTowerSession();
  const { editorExperience, syncState, refreshBeaconSettings } = useBeaconAppSettings();
  const base = getTowerAuthBaseUrl();

  if (sessionPending) {
    return <AccessGateLoadingStatus message="Checking access…" />;
  }

  if (!base.trim()) {
    return (
      <div className={`${beaconAppRouteSurfaceClass} p-4`}>
        <BeaconTowerNotConfiguredNotice />
      </div>
    );
  }

  if (!user) {
    return (
      <ScrollArea className="min-h-0 min-w-0 flex-1">
        <div className="flex min-h-full min-w-0 flex-col items-center justify-center px-4 py-8">
          <div className="mx-auto w-full max-w-sm">
            <BeaconTowerSignInPrompt
              title={CMS_SLOTS_FEATURE_NAME}
              description={`Sign in or create a Tower account to use ${CMS_SLOTS_FEATURE_NAME}. Tower connects your Webflow workspace so layout and CMS data stay in sync.`}
            />
          </div>
        </div>
      </ScrollArea>
    );
  }

  if (syncState === "loading" || syncState === "idle") {
    return <AccessGateLoadingStatus message="Checking workspace access…" />;
  }

  if (syncState === "error") {
    return (
      <div className={`${beaconAppRouteSurfaceClass} items-center justify-center p-6`}>
        <div className="mx-auto w-full max-w-sm space-y-3 text-center">
          <p className="text-muted-foreground text-sm">
            Could not verify workspace permissions. Try again in a moment.
          </p>
          <Button type="button" variant="outline" className="w-full" onClick={() => void refreshBeaconSettings()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (editorExperience) {
    return (
      <ScrollArea className="min-h-0 min-w-0 flex-1">
        <div className="flex min-h-full min-w-0 flex-col items-center justify-center px-4 py-8">
          <div className="mx-auto w-full max-w-sm space-y-4">
            <div className="space-y-1">
              <h2 className="text-sm font-medium leading-tight">{CMS_SLOTS_FEATURE_NAME}</h2>
              <p className="text-muted-foreground text-xs leading-snug">
                Your workspace role does not include this feature. Ask a workspace admin to update your role, or open
                Tower to switch workspaces if you belong to one with designer access.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button type="button" className="w-full" asChild>
                <a href={base} target="_blank" rel="noreferrer">
                  <span className="inline-flex items-center justify-center gap-2">
                    Open Tower
                    <ExternalLink aria-hidden className="size-4" />
                  </span>
                </a>
              </Button>
              <Button type="button" variant="outline" className="w-full" asChild>
                <Link to="/home">Back to home</Link>
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>
    );
  }

  return <>{children}</>;
}
