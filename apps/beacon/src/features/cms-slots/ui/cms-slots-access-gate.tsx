import { useDeferredLoadingIndicator } from "@codalyn/webflow-kit/react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { BeaconFeatureRouteHeader } from "@/app/ui/beacon-feature-route-chrome";
import { BeaconRouteLoadingStatus } from "@/app/ui/beacon-route-loading-status";
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
import { RouteLoadingSurface } from "@/shared/ui/route-loading";
import { ScrollArea } from "@/shared/ui/scroll-area";

function AccessGateLoadingStatus(props: { busy: boolean; message: string }) {
  const show = useDeferredLoadingIndicator(props.busy);
  if (!show) {
    return null;
  }
  return (
    <RouteLoadingSurface layout="route" role="status" aria-live="polite" data-slot="beacon_access_gate_loading">
      <BeaconRouteLoadingStatus ariaLabel={props.message} message={props.message} />
    </RouteLoadingSurface>
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
    return <AccessGateLoadingStatus busy message="Checking Designer page…" />;
  }

  if (!isCmsCollectionTemplatePage) {
    return <CmsSlotsCollectionTemplateBlocked />;
  }

  if (sessionPending) {
    return <AccessGateLoadingStatus busy message="Checking access…" />;
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
    return <AccessGateLoadingStatus busy message="Checking workspace access…" />;
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
