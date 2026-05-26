import type * as React from "react";

import { cn } from "@/shared/lib/utils";

const towerAppShellContentWidths = {
  default: "max-w-4xl",
  wide: "max-w-6xl",
  narrow: "max-w-2xl",
} as const;

type TowerAppShellContentWidth = keyof typeof towerAppShellContentWidths;

/** Shared horizontal bounds for Tower header chrome and page main content. */
function towerAppShellContentClassName(width: TowerAppShellContentWidth = "default", className?: string) {
  return cn("mx-auto w-full px-4 sm:px-6", towerAppShellContentWidths[width], className);
}

type TowerPageMainProps = React.ComponentProps<"main"> & {
  width?: TowerAppShellContentWidth;
};

function TowerPageMain({ className, width = "default", ...props }: TowerPageMainProps) {
  return <main className={towerAppShellContentClassName(width, cn("py-8 sm:py-10", className))} {...props} />;
}

type TowerPageHeaderProps = {
  title: string;
  description: React.ReactNode;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
};

function TowerPageHeader({ title, description, actions, meta, className }: TowerPageHeaderProps) {
  return (
    <header className={cn("mb-8 flex flex-col gap-6 border-b border-border pb-8", className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {meta ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">{meta}</div>
      ) : null}
    </header>
  );
}

type TowerPageSectionProps = {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

function TowerPageSection({ title, description, actions, children, className }: TowerPageSectionProps) {
  return (
    <section className={cn("mb-10 space-y-3", className)}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="space-y-0.5">
          <h2 className="text-sm font-medium text-foreground">{title}</h2>
          {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

function TowerDashboardGrid({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mb-10 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]", className)}
      {...props}
    />
  );
}

function TowerDashboardSignals({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-3", className)} {...props} />;
}

export {
  TowerDashboardGrid,
  TowerDashboardSignals,
  TowerPageHeader,
  TowerPageMain,
  TowerPageSection,
  towerAppShellContentClassName,
};
