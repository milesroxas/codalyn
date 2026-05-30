import { type LucideIcon, Sparkles } from "lucide-react";
import { openTowerAppPath } from "@/features/auth/model/tower-auth-client";
import { BeaconTowerSignInButton } from "@/features/auth/ui/beacon-tower-sign-in-button";
import { Button } from "@/shared/ui/button";

export type BeaconTowerSignInPromptProps = {
  title: string;
  description: string;
  icon?: LucideIcon;
};

/** Sign-in / early-access CTAs for Tower — signs in inline via the Webflow ID-token exchange (no popup). */
export function BeaconTowerSignInPrompt(props: BeaconTowerSignInPromptProps) {
  const { title, description, icon: Icon = Sparkles } = props;
  return (
    <div className="flex flex-col gap-3">
      <div className="space-y-1">
        <h2 className="flex items-center gap-2 text-sm font-medium leading-tight">
          <Icon aria-hidden className="size-4 text-primary" />
          {title}
        </h2>
        <p className="text-muted-foreground text-xs leading-snug">{description}</p>
      </div>
      <div className="flex flex-col gap-2">
        <BeaconTowerSignInButton />
        <Button type="button" variant="outline" className="w-full" onClick={() => openTowerAppPath("/request-access")}>
          Request early access
        </Button>
      </div>
    </div>
  );
}
