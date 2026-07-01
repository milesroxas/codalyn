import type * as React from "react";

import { cn } from "@/shared/lib/utils";
import { TowerPublicMarketingPageShell } from "@/shared/ui/tower-public-marketing-page-shell";

type MarketingProductHeroProps = {
  title: string;
  description: string;
  /** Text alignment. `start` (default) keeps the left-aligned product heading; `center` stacks and centers it. */
  align?: "start" | "center";
  /** Optional media (e.g. a hero video) rendered beneath the heading. */
  media?: React.ReactNode;
  className?: string;
};

function MarketingProductHero({ title, description, align = "start", media, className }: MarketingProductHeroProps) {
  const centered = align === "center";
  return (
    <header
      data-slot="marketing-product-hero"
      className={cn(
        "tl-marketing-enter flex flex-col [--tl-enter-delay:40ms]",
        centered ? "items-center gap-20 text-center" : "gap-4 pb-8",
        className
      )}
    >
      <div className={cn("flex flex-col gap-4", centered && "items-center")}>
        <h1 className="text-5xl font-semibold tracking-tight text-neutral-50">{title}</h1>
        <p className={cn("text-[32px] font-light leading-10 text-neutral-400", centered ? "max-w-2xl" : "max-w-4xl")}>
          {description}
        </p>
      </div>
      {media ? <div className="w-full">{media}</div> : null}
    </header>
  );
}

type MarketingPageShellProps = {
  activeProduct?: "beacon" | "tower" | "flint";
  homeHref?: string;
  beaconHref?: string;
  flintHref?: string;
  signInHref: string;
  primaryCtaHref: string;
  primaryCtaLabel: string;
  towerHref?: string;
  children: React.ReactNode;
};

function MarketingPageShell({
  activeProduct,
  homeHref = "/",
  beaconHref,
  flintHref,
  signInHref,
  primaryCtaHref,
  primaryCtaLabel,
  towerHref,
  children,
}: MarketingPageShellProps) {
  return (
    <TowerPublicMarketingPageShell
      activeProduct={activeProduct}
      homeHref={homeHref}
      beaconHref={beaconHref}
      flintHref={flintHref}
      signInHref={signInHref}
      primaryCtaHref={primaryCtaHref}
      primaryCtaLabel={primaryCtaLabel}
      towerHref={towerHref}
      contentClassName="gap-20 lg:gap-28"
    >
      {children}
    </TowerPublicMarketingPageShell>
  );
}

function MarketingFeatureList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      data-slot="marketing-feature-list"
      className={cn("tl-marketing-stagger flex flex-col gap-16 lg:gap-20", className)}
    >
      {children}
    </div>
  );
}

export { MarketingFeatureList, MarketingPageShell, MarketingProductHero };
