import Link from "next/link";
import { Button } from "@/shared/ui/button";

export function TowerLanding() {
  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,oklch(0.92_0.02_264),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,oklch(0.28_0.04_264),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-1/4 -z-10 size-[28rem] rounded-full bg-primary/[0.06] blur-3xl dark:bg-primary/[0.12]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 bottom-0 -z-10 size-[22rem] rounded-full bg-foreground/[0.04] blur-3xl"
      />

      <main className="mx-auto flex min-h-dvh max-w-5xl flex-col justify-center px-4 py-16 sm:px-6 lg:py-24">
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Codalyn</p>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl sm:leading-[1.08]">
          Your Webflow workspace, unified.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty">
          Tower connects your team, Webflow data, and Beacon—so you can ship without switching context.
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

        <ul className="mt-16 grid gap-6 border-t border-border/60 pt-10 sm:grid-cols-3">
          <li>
            <p className="text-sm font-medium text-foreground">Team-ready</p>
            <p className="mt-1 text-sm text-muted-foreground">Workspaces and roles built for collaboration.</p>
          </li>
          <li>
            <p className="text-sm font-medium text-foreground">Webflow-native</p>
            <p className="mt-1 text-sm text-muted-foreground">OAuth and Data API access in one place.</p>
          </li>
          <li>
            <p className="text-sm font-medium text-foreground">Beacon-connected</p>
            <p className="mt-1 text-sm text-muted-foreground">Editor workflows that stay in sync with Tower.</p>
          </li>
        </ul>
      </main>
    </div>
  );
}
