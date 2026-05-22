import { IconPlug, IconRadar2, IconUsers } from "@tabler/icons-react";
import type * as React from "react";
import { AuthPageBackdrop } from "@/features/tower-ui/auth-page-backdrop";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <AuthPageBackdrop />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-6xl flex-col items-start justify-center gap-10 px-4 py-10 sm:gap-12 sm:py-12 md:items-center lg:flex-row lg:items-center lg:justify-between lg:gap-10 lg:px-8 lg:py-14">
        <div className="mx-auto w-full max-w-sm shrink-0 text-left md:max-w-3xl md:text-center lg:mx-0 lg:max-w-sm lg:text-left">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground md:text-center lg:text-left">
            Tower
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-balance sm:text-3xl md:text-center lg:text-left">
            Built for Webflow teams
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty md:text-center lg:text-left">
            Secure sign-in for your Codalyn workspace. Same account for Beacon, integrations, and team settings.
          </p>
          <ul className="mt-8 grid w-full grid-cols-1 gap-4 text-left md:mt-10 md:grid-cols-3 md:gap-x-4 md:gap-y-8 md:text-center lg:mt-8 lg:flex lg:flex-col lg:gap-4 lg:text-left">
            <li className="flex items-start gap-3 md:flex-col md:items-center md:gap-2 md:text-center lg:flex-row lg:items-center lg:gap-3 lg:text-left">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-background/70 shadow-sm backdrop-blur-sm dark:bg-background/40 lg:shrink-0">
                <IconUsers aria-hidden className="size-4.5 text-primary" stroke={1.5} />
              </span>
              <p className="text-sm font-medium leading-snug text-foreground">Team workspaces, one place.</p>
            </li>
            <li className="flex items-start gap-3 md:flex-col md:items-center md:gap-2 md:text-center lg:flex-row lg:items-center lg:gap-3 lg:text-left">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-background/70 shadow-sm backdrop-blur-sm dark:bg-background/40 lg:shrink-0">
                <IconPlug aria-hidden className="size-4.5 text-primary" stroke={1.5} />
              </span>
              <p className="text-sm font-medium leading-snug text-foreground">OAuth and Data API, unified.</p>
            </li>
            <li className="flex items-start gap-3 md:flex-col md:items-center md:gap-2 md:text-center lg:flex-row lg:items-center lg:gap-3 lg:text-left">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-background/70 shadow-sm backdrop-blur-sm dark:bg-background/40 lg:shrink-0">
                <IconRadar2 aria-hidden className="size-4.5 text-primary" stroke={1.5} />
              </span>
              <p className="text-sm font-medium leading-snug text-foreground">Beacon syncs with Tower.</p>
            </li>
          </ul>
        </div>
        <div className="mx-auto w-full max-w-md shrink-0 lg:mx-0">{children}</div>
      </div>
    </div>
  );
}
