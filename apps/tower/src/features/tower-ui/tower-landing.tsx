import { IconPlug, IconRadar2, IconUsers } from "@tabler/icons-react";
import Link from "next/link";
import { TowerLandingEntrance } from "@/features/tower-ui/tower-landing-entrance";
import { TowerLandingGraphic } from "@/features/tower-ui/tower-landing-graphic";
import { TOWER_PRODUCT_MARKETING_PATH } from "@/shared/lib/navigation/tower-marketing-paths";
import { Button } from "@/shared/ui/button";
import { TOWER_PUBLIC_FOOTER_HEIGHT_PX, TowerPublicFooter } from "@/shared/ui/tower-public-footer";
import {
  TOWER_PUBLIC_HEADER_HEIGHT_PX,
  TowerPublicHeader,
  TowerPublicHeaderSpacer,
} from "@/shared/ui/tower-public-header";

export type TowerLandingAppLinks = {
  home?: string;
  signIn: string;
  signUp: string;
  requestAccess: string;
  tower?: string;
  beacon?: string;
  flint?: string;
};

export function TowerLanding(props: { earlyAccessRequired?: boolean; appLinks?: TowerLandingAppLinks }) {
  const { earlyAccessRequired = false, appLinks } = props;
  const homeHref = appLinks?.home ?? "/";
  const signInHref = appLinks?.signIn ?? "/sign-in";
  const signUpHref = appLinks?.signUp ?? "/sign-up";
  const requestAccessHref = appLinks?.requestAccess ?? "/request-access";
  const primaryCtaHref = earlyAccessRequired ? requestAccessHref : signUpHref;
  const primaryCtaLabel = earlyAccessRequired ? "Early Access" : "Sign up";
  const towerHref = appLinks?.tower ?? TOWER_PRODUCT_MARKETING_PATH;
  const beaconHref = appLinks?.beacon ?? "/beacon";
  const flintHref = appLinks?.flint ?? "/flint";

  return (
    <TowerLandingEntrance
      main={
        <>
          <TowerPublicHeader
            homeHref={homeHref}
            beaconHref={beaconHref}
            flintHref={flintHref}
            signInHref={signInHref}
            primaryCtaHref={primaryCtaHref}
            primaryCtaLabel={primaryCtaLabel}
            towerHref={towerHref}
          />
          <TowerPublicHeaderSpacer />
          <main
            className="relative z-10 mx-auto flex max-w-6xl flex-col justify-center px-4 py-16 sm:px-6 lg:py-24"
            style={{
              height: `calc(100dvh - ${TOWER_PUBLIC_HEADER_HEIGHT_PX}px - ${TOWER_PUBLIC_FOOTER_HEIGHT_PX}px)`,
            }}
          >
            <div>
              <p className="tl-landing-enter mb-4 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground [--tl-enter-delay:1680ms]">
                Codalyn
              </p>
              <h1 className="tl-landing-enter max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl sm:leading-[1.08] [--tl-enter-delay:1740ms]">
                Your Webflow workspace, unified.
              </h1>
              <p className="tl-landing-enter mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty [--tl-enter-delay:1800ms]">
                A connected layer for the tools, workflows, and infrastructure your workspace depends on.
              </p>

              <div className="tl-landing-enter-interactive relative z-10 mt-10 flex flex-wrap items-center gap-3 [--tl-enter-delay:1860ms]">
                {earlyAccessRequired ? (
                  <>
                    <Button asChild size="lg" className="rounded-full px-8">
                      <Link href={requestAccessHref}>Request early access</Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      size="lg"
                      className="rounded-full border-border/80 bg-background/60 backdrop-blur"
                    >
                      <Link href={signInHref}>Sign in</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button asChild size="lg" className="rounded-full px-8">
                      <Link href={signUpHref}>Create free account</Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      size="lg"
                      className="rounded-full border-border/80 bg-background/60 backdrop-blur"
                    >
                      <Link href={signInHref}>Sign in</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="mt-16">
              <div
                aria-hidden
                className="tl-landing-rule h-px w-full bg-border/60 [--tl-rule-delay:2910ms] [--tl-rule-duration:0.88s]"
              />
              <ul className="grid gap-6 pt-10 sm:grid-cols-3">
                <li className="tl-landing-enter flex gap-4 [--tl-enter-delay:3910ms] [--tl-enter-duration:0.75s]">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-sm border border-border/80 bg-background/70 shadow-sm backdrop-blur-sm dark:bg-background/40">
                    <IconUsers aria-hidden className="size-5 text-primary" stroke={1.5} />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">Team-ready</p>
                    <p className="mt-1 text-sm text-muted-foreground">Workspaces and roles built for collaboration.</p>
                  </div>
                </li>
                <li className="tl-landing-enter flex gap-4 [--tl-enter-delay:4030ms] [--tl-enter-duration:0.75s]">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-sm border border-border/80 bg-background/70 shadow-sm backdrop-blur-sm dark:bg-background/40">
                    <IconPlug aria-hidden className="size-5 text-primary" stroke={1.5} />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">Webflow-native</p>
                    <p className="mt-1 text-sm text-muted-foreground">OAuth and Data API access in one place.</p>
                  </div>
                </li>
                <li className="tl-landing-enter flex gap-4 [--tl-enter-delay:4150ms] [--tl-enter-duration:0.75s]">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-sm border border-border/80 bg-background/70 shadow-sm backdrop-blur-sm dark:bg-background/40">
                    <IconRadar2 aria-hidden className="size-5 text-primary" stroke={1.5} />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">Beacon-connected</p>
                    <p className="mt-1 text-sm text-muted-foreground">Editor workflows that stay in sync with Tower.</p>
                  </div>
                </li>
              </ul>
            </div>
          </main>
          <TowerPublicFooter placement="fixed" />
        </>
      }
    >
      <div
        aria-hidden
        className="tl-landing-enter pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,oklch(0.94_0.035_264),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,oklch(0.28_0.04_264),transparent)] [--tl-enter-delay:750ms]"
      />
      <div
        aria-hidden
        className="tl-landing-enter pointer-events-none absolute -right-24 top-1/4 -z-10 size-112 rounded-full bg-primary/11 blur-3xl dark:bg-primary/12 [--tl-enter-delay:780ms]"
      />
      <div
        aria-hidden
        className="tl-landing-enter pointer-events-none absolute -left-32 bottom-0 -z-10 size-88 rounded-full bg-foreground/5.5 blur-3xl dark:bg-foreground/6 [--tl-enter-delay:810ms]"
      />

      <div aria-hidden className="pointer-events-none fixed inset-y-0 right-0 z-0 h-dvh w-[60vw] max-w-[120rem]">
        <TowerLandingGraphic />
      </div>
    </TowerLandingEntrance>
  );
}
