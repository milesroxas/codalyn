import type * as React from "react";

import { cn } from "@/shared/lib/utils";

type TowerPageMainProps = React.ComponentProps<"main"> & {
  width?: "default" | "narrow";
};

function TowerPageMain({ className, width = "default", ...props }: TowerPageMainProps) {
  return (
    <main
      className={cn("mx-auto px-4 py-8 sm:px-6 sm:py-10", width === "narrow" ? "max-w-2xl" : "max-w-4xl", className)}
      {...props}
    />
  );
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

export { TowerPageHeader, TowerPageMain, TowerPageSection };
