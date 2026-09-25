import { useState } from "react";
import { BeaconEarlyAccessRequestForm } from "@/features/auth/ui/beacon-early-access-request-form";
import { BeaconTowerSignInForm } from "@/features/auth/ui/beacon-tower-sign-in-form";
import { BeaconWebflowSignInButton } from "@/features/auth/ui/beacon-webflow-sign-in-button";
import { Button } from "@/shared/ui/button";

type BeaconOnboardingProps = {
  towerConfigured: boolean;
  /** True: invite-only gate on ("Request access"); false: gate off (public "Sign up"); null: unknown, gate assumed on. */
  earlyAccessRequired: boolean | null;
  onContinueAsGuest: () => void;
};

/**
 * App-level welcome/auth screen: Tower sign-in (recommended) vs continue as guest.
 * Rendered by the home screen and the image editor before a session or guest choice exists.
 *
 * Sign-in offers the documented hybrid-app path first — "Continue with Webflow" runs the Designer
 * ID-token exchange on the click — with email + password beneath it for accounts whose Tower and
 * Webflow e-mails differ.
 */
export function BeaconOnboarding(props: BeaconOnboardingProps) {
  const { towerConfigured, earlyAccessRequired, onContinueAsGuest } = props;
  const publicSignUpOpen = earlyAccessRequired === false;
  const [requestingAccess, setRequestingAccess] = useState(false);

  return (
    <section
      className="mx-auto flex w-full min-w-0 max-w-sm flex-col gap-5 px-1"
      aria-labelledby="beacon-onboarding-title"
    >
      <header className="flex flex-col items-center gap-1.5 text-center">
        <h2 id="beacon-onboarding-title" className="text-2xl font-semibold text-foreground">
          Welcome
        </h2>
      </header>

      <article className="rounded-sm border border-primary/30 bg-card p-4 ring-1 ring-primary/15">
        <h3 className="mt-1.5 text-base font-semibold text-foreground">
          {requestingAccess ? "Request access" : "Sign in to Tower"}
        </h3>
        {requestingAccess ? null : (
          <p className="mt-1 text-xs leading-snug text-muted-foreground">
            {towerConfigured ? "Access all advanced features" : "Tower isn’t available in this environment."}
          </p>
        )}

        {towerConfigured ? (
          <div className="mt-4 flex flex-col gap-2">
            {requestingAccess ? (
              <BeaconEarlyAccessRequestForm onBackToSignIn={() => setRequestingAccess(false)} />
            ) : (
              <>
                <BeaconWebflowSignInButton />
                <p className="text-center text-[11px] uppercase tracking-wide text-muted-foreground">or with email</p>
                <BeaconTowerSignInForm />
                {!publicSignUpOpen ? (
                  <Button type="button" variant="outline" className="w-full" onClick={() => setRequestingAccess(true)}>
                    Request access
                  </Button>
                ) : null}
              </>
            )}
          </div>
        ) : (
          <p className="mt-4 rounded-sm bg-muted/50 px-3 py-2 text-xs leading-snug text-muted-foreground">
            Tower isn’t available here. Continue as a guest below.
          </p>
        )}
      </article>

      <article className="rounded-sm border border-border bg-card/40 p-4">
        <h3 className="text-base font-semibold text-foreground">Continue as guest</h3>
        <p className="mt-1 text-xs leading-snug text-muted-foreground">Core tools with no data sync or CMS features</p>

        <Button type="button" variant="outline" className="mt-4 w-full" onClick={onContinueAsGuest}>
          Continue as guest
        </Button>
      </article>

      <p className="text-center text-xs text-accent-foreground">You can sign in anytime from the header.</p>
    </section>
  );
}
