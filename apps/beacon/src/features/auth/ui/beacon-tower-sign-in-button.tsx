import { Loader2, LogIn } from "lucide-react";
import { useBeaconTowerInlineSignIn } from "@/features/auth/model/use-beacon-tower-inline-sign-in";
import { Button } from "@/shared/ui/button";

export type BeaconTowerSignInButtonProps = {
  label?: string;
};

/**
 * Canonical primary sign-in CTA for Tower: full-width button with a pending spinner and
 * "Signing in…" label. Centralizes the inline Webflow ID-token exchange affordance so every
 * surface (onboarding, prompt, settings upsell) shares one feedback pattern.
 */
export function BeaconTowerSignInButton(props: BeaconTowerSignInButtonProps) {
  const { label = "Sign in to Tower" } = props;
  const { signIn, pending } = useBeaconTowerInlineSignIn();

  return (
    <Button type="button" className="w-full" disabled={pending} aria-busy={pending} onClick={signIn}>
      {pending ? (
        <Loader2 aria-hidden data-icon="inline-start" className="animate-spin" />
      ) : (
        <LogIn aria-hidden data-icon="inline-start" />
      )}
      {pending ? "Signing in…" : label}
    </Button>
  );
}
