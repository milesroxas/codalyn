import { Link2 } from "lucide-react";
import { getTowerAuthBaseUrl } from "@/features/auth/model/tower-auth-client";
import { BeaconTowerSignInPrompt } from "@/features/auth/ui/beacon-tower-sign-in-prompt";
import { Separator } from "@/shared/ui/separator";

export function GuestSettingsUpsell() {
  const base = getTowerAuthBaseUrl();
  if (!base) {
    return null;
  }

  return (
    <>
      <BeaconTowerSignInPrompt icon={Link2} title="Connect with Tower" description="Unlock all features with Tower." />
      <Separator className="my-4" />
    </>
  );
}
