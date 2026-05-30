import { Sparkles } from "lucide-react";
import { getTowerAuthBaseUrl, openTowerAuthPopup } from "@/features/auth/model/tower-auth-client";
import { useBeaconTowerInlineSignIn } from "@/features/auth/model/use-beacon-tower-inline-sign-in";
import { Button } from "@/shared/ui/button";
import { Separator } from "@/shared/ui/separator";

export function GuestSettingsUpsell() {
  const base = getTowerAuthBaseUrl();
  const { signIn, pending } = useBeaconTowerInlineSignIn();
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
            Sign in with an early-access Tower account to restore sync on this device. Guest mode keeps settings in this
            browser only.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
          <Button type="button" size="sm" className="sm:flex-1" disabled={pending} onClick={signIn}>
            {pending ? "Signing in…" : "Sign in"}
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
