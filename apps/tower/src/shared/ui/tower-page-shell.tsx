import type * as React from "react";

import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";

const towerAppShellContentWidths = {
  full: "",
  default: "max-w-4xl",
  wide: "max-w-6xl",
  narrow: "max-w-2xl",
} as const;

type TowerAppShellContentWidth = keyof typeof towerAppShellContentWidths;

/** Shared horizontal bounds for logged-out header chrome. */
function towerAppShellContentClassName(width: TowerAppShellContentWidth = "default", className?: string) {
  return cn("mx-auto w-full px-4 sm:px-6", towerAppShellContentWidths[width], className);
}

/** Main inset for logged-out pages below `TowerLoggedOutHeader`. */
function towerLoggedOutMainClassName(className?: string) {
  return cn("flex min-h-0 flex-1 flex-col px-4 pt-6 pb-8 lg:px-6 md:pt-8 md:pb-10", className);
}

/** Extra top inset for legal pages rendered inside authenticated app chrome. */
function towerAuthenticatedLegalInsetClassName(className?: string) {
  return cn("pt-4 md:pt-6", className);
}

/** Authenticated legal page shell — keeps site footer separated from document content. */
function towerAuthenticatedLegalPageShellClassName(className?: string) {
  return cn(towerAuthenticatedLegalInsetClassName(), "flex min-h-0 flex-1 flex-col", className);
}

function towerPageMainClassName(width: TowerAppShellContentWidth = "full", className?: string) {
  const maxWidth = towerAppShellContentWidths[width];
  return cn("w-full", maxWidth ? cn("mx-auto", maxWidth) : null, className);
}

type TowerPageMainProps = React.ComponentProps<"div"> & {
  width?: TowerAppShellContentWidth;
};

function TowerPageMain({ className, width = "full", ...props }: TowerPageMainProps) {
  return <div className={towerPageMainClassName(width, className)} {...props} />;
}

type TowerPageHeaderProps = {
  title: string;
  description: React.ReactNode;
  actions?: React.ReactNode;
  /** Prominent context below the title row (for example active workspace). */
  context?: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
};

function TowerPageHeader({ title, description, actions, context, meta, className }: TowerPageHeaderProps) {
  return (
    <header className={cn("mb-8 flex flex-col gap-6 border-b border-border pb-8", className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {context ? <div>{context}</div> : null}
      {meta ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">{meta}</div>
      ) : null}
    </header>
  );
}

function TowerCurrentWorkspaceMeta({ name, className }: { name: string | null | undefined; className?: string }) {
  if (!name) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="text-xs font-medium text-muted-foreground">Current workspace:</span>
      <Badge variant="secondary">{name}</Badge>
    </div>
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
      className={cn("mb-10 grid items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]", className)}
      {...props}
    />
  );
}

function TowerDashboardSignals({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-3", className)} {...props} />;
}

export {
  TowerCurrentWorkspaceMeta,
  TowerDashboardGrid,
  TowerDashboardSignals,
  TowerPageHeader,
  TowerPageMain,
  TowerPageSection,
  towerAppShellContentClassName,
  towerAuthenticatedLegalInsetClassName,
  towerAuthenticatedLegalPageShellClassName,
  towerLoggedOutMainClassName,
  towerPageMainClassName,
};
