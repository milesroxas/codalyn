import { Sparkles } from "lucide-react";
import { getTowerAuthBaseUrl } from "@/features/auth/model/tower-auth-client";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

const POPUP = "popup=yes,width=540,height=780,scrollbars=yes,resizable=yes";

export function GuestSettingsUpsell() {
  const base = getTowerAuthBaseUrl();
  if (!base) {
    return null;
  }

  return (
    <Card className="mb-4 border-dashed">
      <CardHeader className="gap-1 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Sparkles aria-hidden className="size-4 text-primary" />
          Unlock cloud settings
        </CardTitle>
        <CardDescription>
          Sign up or sign in to Tower to sync presets and preferences across sessions and devices. Guest mode keeps
          settings in this browser only.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => {
            const origin = encodeURIComponent(window.location.origin);
            window.open(`${base}/sign-up?beaconOrigin=${origin}`, "beacon-tower-auth", POPUP);
          }}
        >
          Sign up for Tower
        </Button>
      </CardContent>
    </Card>
  );
}
