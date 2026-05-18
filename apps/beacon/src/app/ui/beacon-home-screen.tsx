import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  readBeaconGuestWelcomeComplete,
  writeBeaconGuestWelcomeComplete,
} from "@/features/auth/lib/beacon-guest-welcome-preference";
import { isTowerConfigured, openTowerAuthPopup } from "@/features/auth/model/tower-auth-client";
import { useBeaconTowerSession } from "@/features/auth/model/use-beacon-tower-session";
import { useCmsSlotsAccess } from "@/features/cms-slots/model/use-cms-slots-access";
import { ImageEditorOnboarding } from "@/features/image-editor/ui/image-editor-onboarding";
import { BEACON_HOME_TILE_CSS_VARS } from "@/shared/lib/beacon-app-backgrounds";
import { CMS_SLOTS_FEATURE_NAME } from "@/shared/lib/cms-slots-feature-copy";
import { isCmsSlotsSurfaceEnabled } from "@/shared/lib/cms-slots-surface-enabled";
import { cn } from "@/shared/lib/utils";
import { ScrollArea } from "@/shared/ui/scroll-area";

type BeaconHomeTileCssVar = (typeof BEACON_HOME_TILE_CSS_VARS)[keyof typeof BEACON_HOME_TILE_CSS_VARS];

function BeaconHomeLaunchTile(props: {
  title: string;
  description?: string;
  decorationVar: BeaconHomeTileCssVar;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const { title, description, decorationVar, onClick, disabled } = props;

  return (
    <button
      type="button"
      disabled={disabled}
      aria-disabled={disabled}
      aria-label={disabled ? `${title} (unavailable)` : description ? `${title}: ${description}` : title}
      onClick={disabled ? undefined : onClick}
      className={cn(
        "group relative flex min-h-[13.5rem] w-full shrink-0 flex-col overflow-hidden rounded-sm border border-border/50 text-left outline-none shadow-lg shadow-foreground/10 ring-1 ring-border/40 backdrop-blur-[1px] sm:h-full sm:min-h-0",
        "transition-[transform,border-color,opacity] hover:border-primary/35 focus-visible:ring-4 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none",
        disabled ? "opacity-60" : "active:translate-y-px"
      )}
    >
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
      <span className="relative z-1 mt-auto flex flex-col gap-1 border-t border-border/50 bg-card/50 px-4 py-4 text-card-foreground backdrop-blur-md supports-[backdrop-filter]:bg-card/40">
        <span className="font-semibold tracking-tight">{title}</span>
        {description ? (
          <span className="text-[0.8125rem] leading-snug font-normal text-muted-foreground">{description}</span>
        ) : null}
      </span>
    </button>
  );
}

export function BeaconHomeScreen() {
  const navigate = useNavigate();
  const { user: towerUser, isPending: towerSessionPending } = useBeaconTowerSession();
  const { defaultSegment } = useCmsSlotsAccess();
  const towerConfigured = isTowerConfigured();
  const cmsSlotsSurfaceEnabled = isCmsSlotsSurfaceEnabled();

  const [guestWelcomeDone, setGuestWelcomeDone] = useState(readBeaconGuestWelcomeComplete);
  const showWelcomeGate = !towerSessionPending && !towerUser && !guestWelcomeDone;

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
            onContinueAsGuest={() => {
              writeBeaconGuestWelcomeComplete();
              setGuestWelcomeDone(true);
            }}
          />
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="min-h-0 min-w-0 flex-1">
      <div className="flex min-h-full min-w-0 flex-col justify-center px-4 py-8">
        <div className="mx-auto grid w-full max-w-160 grid-cols-1 gap-4 sm:auto-rows-fr sm:grid-cols-2 sm:gap-5 sm:min-h-[17rem]">
          <BeaconHomeLaunchTile
            title={CMS_SLOTS_FEATURE_NAME}
            decorationVar={BEACON_HOME_TILE_CSS_VARS.cmsSlot}
            disabled={!cmsSlotsSurfaceEnabled}
            onClick={() => navigate(`/cms-slots/${defaultSegment}`)}
          />
          <BeaconHomeLaunchTile
            title="Image Upload"
            decorationVar={BEACON_HOME_TILE_CSS_VARS.imageUpload}
            onClick={() => navigate("/images")}
          />
        </div>
      </div>
    </ScrollArea>
  );
}
