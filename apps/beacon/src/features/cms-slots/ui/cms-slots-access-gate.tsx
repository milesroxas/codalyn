import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { BeaconFeatureRouteHeader } from "@/app/ui/beacon-feature-route-chrome";
import { getTowerAuthBaseUrl } from "@/features/auth/model/tower-auth-client";
import { useBeaconTowerSession } from "@/features/auth/model/use-beacon-tower-session";
import { BeaconTowerNotConfiguredNotice } from "@/features/auth/ui/beacon-tower-not-configured-notice";
import { BeaconTowerSignInPrompt } from "@/features/auth/ui/beacon-tower-sign-in-prompt";
import { CmsSlotsCollectionTemplateGatePrompt } from "@/features/cms-slots/ui/cms-slots-collection-template-prompt";
import { useBeaconAppSettings } from "@/features/settings/model/beacon-app-settings-provider";
import { beaconAppRouteSurfaceClass } from "@/shared/lib/beacon-app-route-surface";
import { CMS_SLOTS_FEATURE_NAME } from "@/shared/lib/cms-slots-feature-copy";
import { useCmsCollectionTemplatePage } from "@/shared/lib/use-cms-collection-template-page";
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

function CmsSlotsCollectionTemplateBlocked() {
  const navigate = useNavigate();

  return (
    <div className={beaconAppRouteSurfaceClass}>
      <BeaconFeatureRouteHeader title={CMS_SLOTS_FEATURE_NAME} onBack={() => navigate("/home")} />
      <ScrollArea className="min-h-0 min-w-0 flex-1">
        <div className="flex min-h-full min-w-0 flex-col items-center justify-center px-4 py-8">
          <CmsSlotsCollectionTemplateGatePrompt />
        </div>
      </ScrollArea>
    </div>
  );
}

export function CmsSlotsAccessGate(props: { children: ReactNode }) {
  const { children } = props;
  const { user, isPending: sessionPending } = useBeaconTowerSession();
  const { syncState, refreshBeaconSettings, settingsPullPending } = useBeaconAppSettings();
  const { ready: pageKindReady, isCmsCollectionTemplatePage } = useCmsCollectionTemplatePage();
  const base = getTowerAuthBaseUrl();

  if (!pageKindReady) {
    return <AccessGateLoadingStatus message="Checking Designer page…" />;
  }

  if (!isCmsCollectionTemplatePage) {
    return <CmsSlotsCollectionTemplateBlocked />;
  }

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

  if (settingsPullPending) {
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

  return <div className={beaconAppRouteSurfaceClass}>{children}</div>;
}
