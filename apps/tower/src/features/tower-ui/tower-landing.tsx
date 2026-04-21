import { IconPlug, IconRadar2, IconUsers } from "@tabler/icons-react";
import Link from "next/link";
import { TowerLandingGraphic } from "@/features/tower-ui/tower-landing-graphic";
import { Button } from "@/shared/ui/button";

export function TowerLanding() {
  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,oklch(0.94_0.035_264),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,oklch(0.28_0.04_264),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-1/4 -z-10 size-112 rounded-full bg-primary/11 blur-3xl dark:bg-primary/12"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 bottom-0 -z-10 size-88 rounded-full bg-foreground/5.5 blur-3xl dark:bg-foreground/6"
      />

      <div aria-hidden className="pointer-events-none fixed inset-y-0 right-0 z-0 h-dvh w-[60vw] max-w-[120rem]">
        <TowerLandingGraphic />
      </div>

      <main className="relative z-10 mx-auto flex min-h-dvh max-w-6xl flex-col justify-center px-4 py-16 sm:px-6 lg:py-24">
        <div>
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Codalyn</p>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl sm:leading-[1.08]">
            Your Webflow workspace, unified.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty">
            A connected layer for the tools, workflows, and infrastructure your workspace depends on.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="rounded-full px-8">
              <Link href="/sign-up">Create free account</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-full border-border/80 bg-background/60 backdrop-blur"
            >
              <Link href="/sign-in">Sign in</Link>
            </Button>
          </div>
        </div>

        <ul className="mt-16 grid gap-6 border-t border-border/60 pt-10 sm:grid-cols-3">
          <li className="flex gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-background/70 shadow-sm backdrop-blur-sm dark:bg-background/40">
              <IconUsers aria-hidden className="size-5 text-primary" stroke={1.5} />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">Team-ready</p>
              <p className="mt-1 text-sm text-muted-foreground">Workspaces and roles built for collaboration.</p>
            </div>
          </li>
          <li className="flex gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-background/70 shadow-sm backdrop-blur-sm dark:bg-background/40">
              <IconPlug aria-hidden className="size-5 text-primary" stroke={1.5} />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">Webflow-native</p>
              <p className="mt-1 text-sm text-muted-foreground">OAuth and Data API access in one place.</p>
            </div>
          </li>
          <li className="flex gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-background/70 shadow-sm backdrop-blur-sm dark:bg-background/40">
              <IconRadar2 aria-hidden className="size-5 text-primary" stroke={1.5} />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">Beacon-connected</p>
              <p className="mt-1 text-sm text-muted-foreground">Editor workflows that stay in sync with Tower.</p>
            </div>
          </li>
        </ul>
      </main>
    </div>
  );
}
