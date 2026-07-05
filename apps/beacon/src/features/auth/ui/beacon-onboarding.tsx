import { Check, Sparkles } from "lucide-react";
import { openTowerAppPath } from "@/features/auth/model/tower-auth-client";
import { BeaconTowerSignInForm } from "@/features/auth/ui/beacon-tower-sign-in-form";
import { Button } from "@/shared/ui/button";

type ImageEditorOnboardingProps = {
  towerConfigured: boolean;
  /** True early access gate on (Request early access), false gate off (public Sign up), null unknown (defaults to early access). */
  earlyAccessRequired: boolean | null;
  onContinueAsGuest: () => void;
};

const TOWER_BENEFITS = ["AVIF compression", "CMS-connected assets", "Synced sessions"] as const;

export function ImageEditorOnboarding(props: ImageEditorOnboardingProps) {
  const { towerConfigured, earlyAccessRequired, onContinueAsGuest } = props;
  const publicSignUpOpen = earlyAccessRequired === false;

  return (
    <section
      className="mx-auto flex w-full min-w-0 max-w-sm flex-col gap-5 px-1 py-4"
      aria-labelledby="beacon-onboarding-title"
    >
      <header className="flex flex-col items-center gap-1.5 text-center">
        <h2 id="beacon-onboarding-title" className="text-2xl font-semibold text-foreground">
          Welcome to Beacon
        </h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Connect Tower for the complete workflow, or keep going as a guest.
        </p>
      </header>

      <article className="rounded-sm border border-primary/30 bg-card p-4 ring-1 ring-primary/15">
        <div className="flex items-center gap-1.5">
          <Sparkles aria-hidden className="size-3.5 text-primary" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">Recommended</span>
        </div>
        <h3 className="mt-1.5 text-base font-semibold text-foreground">Sign in to Tower</h3>
        <p className="mt-1 text-xs leading-snug text-muted-foreground">
          {towerConfigured
            ? "Everything you need for publish-ready assets."
            : "Tower isn’t available in this environment."}
        </p>

        <ul className="mt-3 space-y-1.5 text-xs text-foreground">
          {TOWER_BENEFITS.map((benefit) => (
            <li key={benefit} className="flex items-center gap-2">
              <Check aria-hidden className="size-3.5 text-primary" />
              {benefit}
            </li>
          ))}
        </ul>

        {towerConfigured ? (
          <div className="mt-4 flex flex-col gap-2">
            <BeaconTowerSignInForm />
            {!publicSignUpOpen ? (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => openTowerAppPath("/request-access")}
              >
                Request early access
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 rounded-sm bg-muted/50 px-3 py-2 text-xs leading-snug text-muted-foreground">
            Tower isn’t available here. Continue as a guest below.
          </p>
        )}
      </article>

      <article className="rounded-sm border border-border bg-card/40 p-4">
        <h3 className="text-base font-semibold text-foreground">Continue as guest</h3>
        <p className="mt-1 text-xs leading-snug text-muted-foreground">
          Crop and export with the core tools. WebP exports, no CMS or synced settings.
        </p>

        <Button type="button" variant="outline" className="mt-4 w-full" onClick={onContinueAsGuest}>
          Continue as guest
        </Button>
      </article>

      <p className="text-center text-[11px] text-muted-foreground">You can sign in anytime from the header.</p>
    </section>
  );
}
