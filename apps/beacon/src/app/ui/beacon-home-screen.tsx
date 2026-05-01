import { Image as ImageIcon, Radio } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  readBeaconGuestWelcomeComplete,
  writeBeaconGuestWelcomeComplete,
} from "@/features/auth/lib/beacon-guest-welcome-preference";
import { getTowerAuthBaseUrl, isTowerConfigured } from "@/features/auth/model/tower-auth-client";
import { useBeaconTowerSession } from "@/features/auth/model/use-beacon-tower-session";
import { ImageEditorOnboarding } from "@/features/image-editor/ui/image-editor-onboarding";
import { isBeaconsSurfaceEnabled } from "@/shared/lib/beacons-surface-enabled";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { ScrollArea } from "@/shared/ui/scroll-area";

const TOWER_EMAIL_AUTH_POPUP_FEATURES = "popup=yes,width=540,height=780,scrollbars=yes,resizable=yes";

export function BeaconHomeScreen() {
  const navigate = useNavigate();
  const { user: towerUser, isPending: towerSessionPending } = useBeaconTowerSession();
  const towerConfigured = isTowerConfigured();
  const base = getTowerAuthBaseUrl();

  const [guestWelcomeDone, setGuestWelcomeDone] = useState(readBeaconGuestWelcomeComplete);
  const showWelcomeGate = !towerSessionPending && !towerUser && !guestWelcomeDone;

  const openTowerEmailSignInPopup = () => {
    const origin = encodeURIComponent(window.location.origin);
    window.open(`${base}/sign-in?beaconOrigin=${origin}`, "beacon-tower-auth", TOWER_EMAIL_AUTH_POPUP_FEATURES);
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
      <div className="flex min-w-0 flex-col px-4 py-6">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-2">
          <h2 className="text-lg font-semibold text-foreground">Tools</h2>
        </div>
        <ul
          className={cn(
            "mx-auto mt-6 grid w-full max-w-lg gap-3",
            isBeaconsSurfaceEnabled() ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
          )}
        >
          <li>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "h-auto w-full flex-col items-stretch gap-2 rounded-xl border-border/80 py-5 text-left shadow-sm",
                "hover:border-primary/40 hover:bg-muted/40"
              )}
              onClick={() => navigate("/images")}
            >
              <span className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ImageIcon aria-hidden className="size-5" />
              </span>
              <span className="text-base font-semibold text-foreground">Images</span>
            </Button>
          </li>
          {isBeaconsSurfaceEnabled() ? (
            <li>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "h-auto w-full flex-col items-stretch gap-2 rounded-xl border-border/80 py-5 text-left shadow-sm",
                  "hover:border-primary/40 hover:bg-muted/40"
                )}
                onClick={() => navigate("/beacons/engine")}
              >
                <span className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Radio aria-hidden className="size-5" />
                </span>
                <span className="text-base font-semibold text-foreground">Beacons</span>
              </Button>
            </li>
          ) : null}
        </ul>
      </div>
    </ScrollArea>
  );
}
