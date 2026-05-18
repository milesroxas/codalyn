import { Sparkles } from "lucide-react";
import { openTowerAuthPopup } from "@/features/auth/model/tower-auth-client";
import { Button } from "@/shared/ui/button";

export type BeaconTowerSignInPromptProps = {
  title: string;
  description: string;
};

/** Sign-in / sign-up CTAs for Tower (popup flow) — matches Settings account upsell layout. */
export function BeaconTowerSignInPrompt(props: BeaconTowerSignInPromptProps) {
  const { title, description } = props;
  return (
    <div className="flex flex-col gap-3">
      <div className="space-y-1">
        <h2 className="flex items-center gap-2 text-sm font-medium leading-tight">
          <Sparkles aria-hidden className="size-4 text-primary" />
          {title}
        </h2>
        <p className="text-muted-foreground text-xs leading-snug">{description}</p>
      </div>
      <div className="flex flex-col gap-2">
        <Button type="button" className="w-full" onClick={() => openTowerAuthPopup("/sign-in")}>
          Sign in to Tower
        </Button>
        <Button type="button" variant="outline" className="w-full" onClick={() => openTowerAuthPopup("/sign-up")}>
          Create Tower account
        </Button>
      </div>
    </div>
  );
}
