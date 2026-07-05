import { useDeferredLoadingIndicator } from "@codalyn/webflow-kit/react";
import {
  type Icon,
  IconAlertTriangle,
  IconArrowsMoveVertical,
  IconCarouselHorizontal,
  IconClick,
  IconPhotoUp,
  IconTransitionRight,
} from "@tabler/icons-react";
import { Loader2 } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BeaconRouteLoadingStatus } from "@/app/ui/beacon-route-loading-status";
import { useBeaconGuestWelcomeVisible } from "@/features/auth/lib/use-beacon-guest-welcome-visible";
import { isTowerConfigured } from "@/features/auth/model/tower-auth-client";
import { useBeaconTowerAccessPolicy } from "@/features/auth/model/use-beacon-tower-access-policy";
import { BeaconOnboarding } from "@/features/auth/ui/beacon-onboarding";
import {
  peekCmsSlotsPageInstallCache,
  prefetchCmsSlotsPageInstall,
} from "@/features/cms-slots/model/cms-slots-page-install-cache";
import { promptOpenCmsCollectionTemplateInDesigner } from "@/features/cms-slots/model/prompt-open-cms-collection-template";
import { useCmsSlotsAccess } from "@/features/cms-slots/model/use-cms-slots-access";
import { CmsSlotsPageInstallPrefetch } from "@/features/cms-slots/ui/cms-slots-page-install-prefetch";
import { IMAGE_UPLOAD_FEATURE_NAME } from "@/shared/lib/beacon-feature-route-copy";
import {
  BEACON_HOME_COMING_SOON_SECTION_LABEL,
  BEACON_HOME_EARLY_ACCESS_SECTION_LABEL,
  BEACON_HOME_SESSION_BOOTSTRAP_DESCRIPTION,
  BEACON_HOME_SESSION_BOOTSTRAP_TITLE,
  CAROUSEL_FEATURE_NAME,
  PAGE_TRANSITIONS_FEATURE_NAME,
  SMOOTH_SCROLL_FEATURE_NAME,
} from "@/shared/lib/beacon-home-copy";
import {
  CMS_SLOTS_COLLECTION_TEMPLATE_PROMPT_LABEL,
  CMS_SLOTS_FEATURE_NAME,
  CMS_SLOTS_REQUIRES_COLLECTION_TEMPLATE_ARIA_LABEL,
} from "@/shared/lib/cms-slots-feature-copy";
import { isCmsSlotsSurfaceEnabled } from "@/shared/lib/cms-slots-surface-enabled";
import { useCmsCollectionTemplatePage } from "@/shared/lib/use-cms-collection-template-page";
import { cn } from "@/shared/lib/utils";
import { RouteLoadingSurface } from "@/shared/ui/route-loading";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/tooltip";

const beaconHomeSectionLabelClass = "px-1 text-xs font-semibold tracking-wide text-muted-foreground";

// aria-disabled (not native disabled) keeps the tile focusable and hoverable so its tooltip still fires.
const beaconHomeTileClass =
  "group flex w-full items-center gap-3 rounded-md border border-border/60 bg-card/60 px-3 py-2.5 text-left outline-none transition-colors hover:border-primary/40 hover:bg-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-disabled:cursor-default aria-disabled:opacity-50 aria-disabled:hover:border-border/60 aria-disabled:hover:bg-card/60";

function BeaconHomeSection(props: { label: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className={beaconHomeSectionLabelClass}>{props.label}</h2>
      <div className="flex flex-col gap-2">{props.children}</div>
    </section>
  );
}

function BeaconHomeTile(props: {
  label: string;
  icon: Icon;
  onClick?: () => void;
  disabled?: boolean;
  /** Shows a spinner in the trailing lane and blocks re-entry while the tile's action is in flight. */
  busy?: boolean;
  /** Fixed-width trailing slot (e.g. a status indicator) kept on its own vertical lane. */
  trailing?: ReactNode;
  ariaLabel?: string;
}) {
  const { label, icon: TileIcon, onClick, disabled = false, busy = false, trailing, ariaLabel } = props;
  const interactionDisabled = disabled || busy;
  return (
    <button
      type="button"
      aria-disabled={interactionDisabled}
      aria-busy={busy}
      aria-label={ariaLabel}
      onClick={interactionDisabled ? undefined : onClick}
      className={beaconHomeTileClass}
    >
      <TileIcon
        aria-hidden
        className={cn(
          "size-5 shrink-0 text-muted-foreground transition-colors",
          !disabled && "group-hover:text-foreground"
        )}
      />
      <span className="min-w-0 flex-1 truncate text-base font-semibold text-foreground">{label}</span>
      {busy ? (
        <span className="flex shrink-0 items-center">
          <Loader2 aria-hidden className="size-5 animate-spin text-muted-foreground" />
        </span>
      ) : trailing ? (
        <span className="flex shrink-0 items-center">{trailing}</span>
      ) : null}
    </button>
  );
}

// Roadmap tiles — disabled for now; rendered to signal what's coming next.
const BEACON_HOME_COMING_SOON_TILES: { label: string; icon: Icon }[] = [
  { label: CAROUSEL_FEATURE_NAME, icon: IconCarouselHorizontal },
  { label: SMOOTH_SCROLL_FEATURE_NAME, icon: IconArrowsMoveVertical },
  { label: PAGE_TRANSITIONS_FEATURE_NAME, icon: IconTransitionRight },
];

export function BeaconHomeScreen() {
  const navigate = useNavigate();
  const { defaultSegment } = useCmsSlotsAccess();
  const towerConfigured = isTowerConfigured();
  const cmsSlotsSurfaceEnabled = isCmsSlotsSurfaceEnabled();
  const { ready: cmsPageKindReady, isCmsCollectionTemplatePage } = useCmsCollectionTemplatePage();
  const cmsSlotsOnCollectionTemplate = cmsPageKindReady && isCmsCollectionTemplatePage;
  const cmsSlotsNeedsCollectionTemplate = cmsSlotsSurfaceEnabled && cmsPageKindReady && !cmsSlotsOnCollectionTemplate;
  const { visible: showWelcomeGate, chooseGuest, towerSessionPending } = useBeaconGuestWelcomeVisible();
  const { earlyAccessRequired } = useBeaconTowerAccessPolicy();
  const showSessionBootstrap = useDeferredLoadingIndicator(towerSessionPending);

  // Opening CMS Slots warms the page-install scan first, so the route mounts already-known (no boot overlay).
  // The wait shows as a spinner on this tile — never an instant nav into a full-screen loader. Deferred so a
  // warm cache (the common case, prefetched on mount) navigates immediately with no spinner flash.
  const [cmsSlotsOpening, setCmsSlotsOpening] = useState(false);
  const showCmsSlotsOpening = useDeferredLoadingIndicator(cmsSlotsOpening);
  const openCmsSlots = () => {
    if (peekCmsSlotsPageInstallCache() != null) {
      navigate(`/cms-slots/${defaultSegment}`);
      return;
    }
    setCmsSlotsOpening(true);
    void prefetchCmsSlotsPageInstall().finally(() => {
      navigate(`/cms-slots/${defaultSegment}`);
    });
  };

  // While the Tower session is unresolved, hold on the loading surface — never fall through to home.
  // The spinner itself is deferred (showSessionBootstrap) so fast resolves show a blank surface, not a
  // flash of the home tiles followed by a spinner.
  if (towerSessionPending) {
    return (
      <RouteLoadingSurface layout="route" role="status" aria-live="polite" data-slot="beacon_home_session_bootstrap">
        {showSessionBootstrap ? (
          <BeaconRouteLoadingStatus
            ariaLabel={BEACON_HOME_SESSION_BOOTSTRAP_TITLE}
            message={BEACON_HOME_SESSION_BOOTSTRAP_TITLE}
            description={BEACON_HOME_SESSION_BOOTSTRAP_DESCRIPTION}
          />
        ) : null}
      </RouteLoadingSurface>
    );
  }

  if (showWelcomeGate) {
    return (
      <ScrollArea className="min-h-0 min-w-0 flex-1">
        <div className="flex min-h-full min-w-0 flex-col items-center justify-center px-3 py-6">
          <BeaconOnboarding
            towerConfigured={towerConfigured}
            earlyAccessRequired={earlyAccessRequired}
            onContinueAsGuest={chooseGuest}
          />
        </div>
      </ScrollArea>
    );
  }

  return (
    <>
      <CmsSlotsPageInstallPrefetch />
      <ScrollArea className="min-h-0 min-w-0 flex-1">
        <div className="flex min-h-full min-w-0 flex-col px-3 py-3">
          <TooltipProvider delayDuration={200}>
            <div className="mx-auto flex w-full max-w-md flex-col gap-6">
              <BeaconHomeSection label={BEACON_HOME_EARLY_ACCESS_SECTION_LABEL}>
                <BeaconHomeTile
                  label={IMAGE_UPLOAD_FEATURE_NAME}
                  icon={IconPhotoUp}
                  onClick={() => navigate("/images")}
                />
                <BeaconHomeTile
                  label={CMS_SLOTS_FEATURE_NAME}
                  icon={IconClick}
                  disabled={!cmsSlotsSurfaceEnabled || !cmsPageKindReady}
                  busy={showCmsSlotsOpening}
                  ariaLabel={
                    cmsSlotsNeedsCollectionTemplate ? CMS_SLOTS_REQUIRES_COLLECTION_TEMPLATE_ARIA_LABEL : undefined
                  }
                  onClick={cmsSlotsNeedsCollectionTemplate ? promptOpenCmsCollectionTemplateInDesigner : openCmsSlots}
                  trailing={
                    cmsSlotsNeedsCollectionTemplate ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex items-center">
                            <IconAlertTriangle
                              aria-hidden
                              className="size-5 text-muted-foreground transition-colors group-hover:text-foreground"
                            />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent width="narrow">{CMS_SLOTS_COLLECTION_TEMPLATE_PROMPT_LABEL}</TooltipContent>
                      </Tooltip>
                    ) : undefined
                  }
                />
              </BeaconHomeSection>

              <BeaconHomeSection label={BEACON_HOME_COMING_SOON_SECTION_LABEL}>
                {BEACON_HOME_COMING_SOON_TILES.map((tile) => (
                  <BeaconHomeTile key={tile.label} label={tile.label} icon={tile.icon} disabled />
                ))}
              </BeaconHomeSection>
            </div>
          </TooltipProvider>
        </div>
      </ScrollArea>
    </>
  );
}
