import { ArrowRight, Check, Sparkles } from "lucide-react";
import { Button } from "@/shared/ui/button";

type ImageEditorOnboardingProps = {
  towerConfigured: boolean;
  onSignInToTower: () => void;
  onContinueAsGuest: () => void;
};

const TOWER_BENEFITS = ["AVIF compression", "CMS-connected assets", "Synced sessions"] as const;

export function ImageEditorOnboarding(props: ImageEditorOnboardingProps) {
  const { towerConfigured, onSignInToTower, onContinueAsGuest } = props;

  return (
    <section
      className="mx-auto flex w-full max-w-sm flex-col gap-5 px-1 py-4"
      aria-labelledby="beacon-onboarding-title"
    >
      <header className="flex flex-col items-center gap-1.5 text-center">
        <h2 id="beacon-onboarding-title" className="text-2xl font-semibold text-foreground">
          Welcome to Beacon
        </h2>
        <p className="max-w-sm text-sm text-muted-foreground">Sign in for the full workflow, or jump in as a guest.</p>
      </header>

      <article className="rounded-xl border border-primary/30 bg-card p-4 ring-1 ring-primary/15">
        <div className="flex items-center gap-1.5">
          <Sparkles aria-hidden className="size-3.5 text-primary" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">Recommended</span>
        </div>
        <h3 className="mt-1.5 text-base font-semibold text-foreground">Sign in to Tower</h3>
        <p className="mt-1 text-xs leading-snug text-muted-foreground">
          {towerConfigured
            ? "The complete workflow for publishing-ready assets."
            : "Tower sign-in is unavailable in this environment."}
        </p>

        <ul className="mt-3 space-y-1.5 text-xs text-foreground">
          {TOWER_BENEFITS.map((benefit) => (
            <li key={benefit} className="flex items-center gap-2">
              <Check aria-hidden className="size-3.5 text-primary" />
              {benefit}
            </li>
          ))}
        </ul>

        <Button type="button" className="mt-4 w-full" disabled={!towerConfigured} onClick={onSignInToTower}>
          {towerConfigured ? "Sign in to Tower" : "Tower unavailable"}
          {towerConfigured ? <ArrowRight aria-hidden data-icon="inline-end" /> : null}
        </Button>
      </article>

      <article className="rounded-xl border border-border bg-card/40 p-4">
        <h3 className="text-base font-semibold text-foreground">Continue as guest</h3>
        <p className="mt-1 text-xs leading-snug text-muted-foreground">
          Core crop and export tools. WebP only, no CMS access.
        </p>

        <Button type="button" variant="outline" className="mt-4 w-full" onClick={onContinueAsGuest}>
          Start as guest
        </Button>
      </article>

      <p className="text-center text-[11px] text-muted-foreground">You can sign in anytime from the header.</p>
    </section>
  );
}
