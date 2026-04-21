import type * as React from "react";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_45%_at_0%_0%,oklch(0.94_0.02_264),transparent_55%),radial-gradient(ellipse_60%_40%_at_100%_100%,oklch(0.96_0.01_200),transparent_50%)] dark:bg-[radial-gradient(ellipse_70%_45%_at_0%_0%,oklch(0.22_0.04_264),transparent_55%),radial-gradient(ellipse_60%_40%_at_100%_100%,oklch(0.2_0.02_200),transparent_50%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/4 -z-10 h-72 w-[120%] -translate-x-1/2 rounded-[100%] bg-gradient-to-r from-primary/[0.07] via-transparent to-foreground/[0.05] blur-2xl dark:from-primary/[0.15]"
      />

      <div className="relative mx-auto flex min-h-dvh max-w-6xl flex-col gap-10 px-4 py-10 lg:flex-row lg:items-center lg:justify-between lg:gap-16 lg:px-8 lg:py-14">
        <div className="mx-auto max-w-md flex-1 text-center lg:mx-0 lg:text-left">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Tower</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            Built for Webflow teams
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty">
            Secure sign-in for your Codalyn workspace. Same account for Beacon, integrations, and team settings.
          </p>
        </div>
        <div className="mx-auto w-full max-w-md flex-1">{children}</div>
      </div>
    </div>
  );
}
