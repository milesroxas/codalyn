import { Sparkles } from "lucide-react";
import { getTowerAuthBaseUrl, openTowerAuthPopup } from "@/features/auth/model/tower-auth-client";
import { Button } from "@/shared/ui/button";
import { Separator } from "@/shared/ui/separator";

export function GuestSettingsUpsell() {
  const base = getTowerAuthBaseUrl();
  if (!base) {
    return null;
  }

  return (
    <>
      <section className="flex flex-col gap-3 pb-2">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-sm font-medium leading-tight">
            <Sparkles aria-hidden className="size-4 text-primary" />
            Sync with Tower
          </h2>
          <p className="text-muted-foreground text-xs leading-snug">
            Sign in to restore your account on this device, or create one to sync presets and preferences everywhere.
            Guest mode keeps settings in this browser only.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
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
        </div>
      </section>
      <Separator className="mb-4" />
    </>
  );
}
