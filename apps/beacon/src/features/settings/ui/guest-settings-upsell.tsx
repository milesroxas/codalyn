import { Sparkles } from "lucide-react";
import { getTowerAuthBaseUrl, openTowerAuthPopup } from "@/features/auth/model/tower-auth-client";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

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
          Sync with Tower
        </CardTitle>
        <CardDescription>
          Sign in to restore your account on this device, or create one to sync presets and preferences everywhere.
          Guest mode keeps settings in this browser only.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 pt-0 sm:flex-row sm:gap-2">
        <Button type="button" size="sm" className="sm:flex-1" onClick={() => openTowerAuthPopup("/sign-in")}>
          Sign in
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="sm:flex-1"
          onClick={() => openTowerAuthPopup("/sign-up")}
        >
          Create account
        </Button>
      </CardContent>
    </Card>
  );
}
