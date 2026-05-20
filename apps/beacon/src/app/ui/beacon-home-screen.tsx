import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useBeaconGuestWelcomeVisible } from "@/features/auth/lib/use-beacon-guest-welcome-visible";
import { isTowerConfigured, openTowerAuthPopup } from "@/features/auth/model/tower-auth-client";
import { useCmsSlotsAccess } from "@/features/cms-slots/model/use-cms-slots-access";
import { CmsSlotsCollectionTemplatePrompt } from "@/features/cms-slots/ui/cms-slots-collection-template-prompt";
import { ImageEditorOnboarding } from "@/features/image-editor/ui/image-editor-onboarding";
import { BEACON_HOME_TILE_CSS_VARS } from "@/shared/lib/beacon-app-backgrounds";
import {
  IMAGE_UPLOAD_FEATURE_NAME,
  IMAGE_UPLOAD_HOME_TILE_DESCRIPTION,
} from "@/shared/lib/beacon-feature-route-copy";
import {
  CMS_SLOTS_FEATURE_NAME,
  CMS_SLOTS_HOME_TILE_DESCRIPTION,
} from "@/shared/lib/cms-slots-feature-copy";
import { isCmsSlotsSurfaceEnabled } from "@/shared/lib/cms-slots-surface-enabled";
import { useCmsCollectionTemplatePage } from "@/shared/lib/use-cms-collection-template-page";
import { cn } from "@/shared/lib/utils";
import { ScrollArea } from "@/shared/ui/scroll-area";

type BeaconHomeTileCssVar = (typeof BEACON_HOME_TILE_CSS_VARS)[keyof typeof BEACON_HOME_TILE_CSS_VARS];

const beaconHomeLaunchTileSurfaceClass =
  "group relative flex min-h-[13.5rem] w-full shrink-0 flex-col overflow-hidden rounded-sm border border-border/50 text-left shadow-lg shadow-foreground/10 ring-1 ring-border/40 backdrop-blur-[1px] sm:h-full sm:min-h-0";

function BeaconHomeLaunchTile(props: {
  title: string;
  description?: string;
  decorationVar: BeaconHomeTileCssVar;
  prompt?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const { title, description, decorationVar, prompt, onClick, disabled } = props;
  const isLaunchTile = prompt == null && onClick != null;

  const artwork = (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `var(${decorationVar})`,
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-linear-to-t from-background/90 via-background/20 to-transparent"
      />
    </>
  );

  const promptRegion = prompt ? (
    <span className="relative z-1 flex min-h-0 w-full flex-1 items-center justify-center px-4">{prompt}</span>
  ) : (
    <span aria-hidden className="relative z-1 min-h-0 w-full flex-1" />
  );

  const footer = (
    <span
      className={cn(
        "relative z-1 flex shrink-0 flex-col gap-1 border-t border-border/50 bg-card/50 px-4 py-4 text-card-foreground backdrop-blur-md supports-[backdrop-filter]:bg-card/40",
        prompt ? null : "mt-auto"
      )}
    >
      <span className="font-semibold tracking-tight">{title}</span>
      {description ? (
        <span className="text-[0.8125rem] leading-snug font-normal text-muted-foreground">{description}</span>
      ) : null}
    </span>
  );

  if (isLaunchTile) {
    return (
      <button
        type="button"
        disabled={disabled}
        aria-disabled={disabled}
        aria-label={description ? `${title}: ${description}` : title}
        onClick={disabled ? undefined : onClick}
        className={cn(
          beaconHomeLaunchTileSurfaceClass,
          "outline-none transition-[transform,border-color,opacity] hover:border-primary/35 focus-visible:ring-4 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none",
          disabled ? "opacity-60" : "active:translate-y-px"
        )}
      >
        {artwork}
        {promptRegion}
        {footer}
      </button>
    );
  }

  return (
    <div className={cn(beaconHomeLaunchTileSurfaceClass, prompt ? "opacity-90" : null)}>
      {artwork}
      {promptRegion}
      {footer}
    </div>
  );
}

export function BeaconHomeScreen() {
  const navigate = useNavigate();
  const { defaultSegment } = useCmsSlotsAccess();
  const towerConfigured = isTowerConfigured();
  const cmsSlotsSurfaceEnabled = isCmsSlotsSurfaceEnabled();
  const { ready: cmsPageKindReady, isCmsCollectionTemplatePage } = useCmsCollectionTemplatePage();
  const cmsSlotsOnCollectionTemplate = cmsPageKindReady && isCmsCollectionTemplatePage;
  const cmsSlotsNeedsCollectionTemplate = cmsSlotsSurfaceEnabled && cmsPageKindReady && !cmsSlotsOnCollectionTemplate;
  const { visible: showWelcomeGate, markGuestWelcomeComplete } = useBeaconGuestWelcomeVisible();

  const openTowerEmailSignInPopup = () => {
    openTowerAuthPopup("/sign-in");
  };

  if (showWelcomeGate) {
    return (
      <ScrollArea className="min-h-0 min-w-0 flex-1">
        <div className="flex min-h-full min-w-0 flex-col items-center justify-center px-3 py-6">
          <ImageEditorOnboarding
            towerConfigured={towerConfigured}
            onSignInToTower={openTowerEmailSignInPopup}
            onContinueAsGuest={markGuestWelcomeComplete}
          />
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="min-h-0 min-w-0 flex-1">
      <div className="flex min-h-full min-w-0 flex-col justify-center px-4 py-8">
        <div className="mx-auto grid w-full max-w-160 grid-cols-1 gap-4 sm:auto-rows-fr sm:grid-cols-2 sm:gap-5 sm:min-h-[17rem]">
          {cmsSlotsNeedsCollectionTemplate ? (
            <BeaconHomeLaunchTile
              title={CMS_SLOTS_FEATURE_NAME}
              description={CMS_SLOTS_HOME_TILE_DESCRIPTION}
              decorationVar={BEACON_HOME_TILE_CSS_VARS.cmsSlot}
              prompt={<CmsSlotsCollectionTemplatePrompt variant="tile" />}
            />
          ) : (
            <BeaconHomeLaunchTile
              title={CMS_SLOTS_FEATURE_NAME}
              description={CMS_SLOTS_HOME_TILE_DESCRIPTION}
              decorationVar={BEACON_HOME_TILE_CSS_VARS.cmsSlot}
              disabled={!cmsSlotsSurfaceEnabled || !cmsPageKindReady}
              onClick={() => navigate(`/cms-slots/${defaultSegment}`)}
            />
          )}
          <BeaconHomeLaunchTile
            title={IMAGE_UPLOAD_FEATURE_NAME}
            description={IMAGE_UPLOAD_HOME_TILE_DESCRIPTION}
            decorationVar={BEACON_HOME_TILE_CSS_VARS.imageUpload}
            onClick={() => navigate("/images")}
          />
        </div>
      </div>
    </ScrollArea>
  );
}
