import { type LucideIcon, Sparkles } from "lucide-react";
import { BeaconTowerSignInForm } from "@/features/auth/ui/beacon-tower-sign-in-form";

export type BeaconTowerSignInPromptProps = {
  title: string;
  description: string;
  icon?: LucideIcon;
};

/**
 * Tower sign-in surface: an inline email + password form (no popup). The Webflow Designer session is
 * attempted silently on load — it is never a button the user clicks — so signing in to Tower is the
 * single, deterministic action here. Connecting Webflow happens after sign-in, as a separate step.
 */
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
      <BeaconTowerSignInForm />
    </div>
  );
}
