import type * as React from "react";

import { cn } from "@/shared/lib/utils";
import { TowerPublicFooter } from "@/shared/ui/tower-public-footer";
import { TowerPublicHeader, TowerPublicHeaderSpacer } from "@/shared/ui/tower-public-header";

type MarketingProductHeroProps = {
  title: string;
  description: string;
  className?: string;
};

function MarketingProductHero({ title, description, className }: MarketingProductHeroProps) {
  return (
    <header data-slot="marketing-product-hero" className={cn("flex flex-col gap-4 pb-8", className)}>
      <h1 className="text-5xl font-semibold tracking-tight text-neutral-50">{title}</h1>
      <p className="max-w-4xl text-[32px] font-light leading-10 text-neutral-400">{description}</p>
    </header>
  );
}

type MarketingPageShellProps = {
  activeProduct?: "beacon" | "tower" | "flint";
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
  beaconHref,
  flintHref,
  signInHref,
  primaryCtaHref,
  primaryCtaLabel,
  towerHref,
  children,
}: MarketingPageShellProps) {
  return (
    <div className="min-h-dvh bg-black text-foreground antialiased">
      <TowerPublicHeader
        activeProduct={activeProduct}
        beaconHref={beaconHref}
        flintHref={flintHref}
        signInHref={signInHref}
        primaryCtaHref={primaryCtaHref}
        primaryCtaLabel={primaryCtaLabel}
        towerHref={towerHref}
      />
      <TowerPublicHeaderSpacer />
      <main className="mx-auto flex w-full max-w-[90rem] flex-col gap-20 px-6 py-16 sm:px-12 lg:gap-28 lg:px-20 lg:py-24">
        {children}
      </main>
      <TowerPublicFooter variant="marketing" />
    </div>
  );
}

function MarketingFeatureList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div data-slot="marketing-feature-list" className={cn("flex flex-col gap-16 lg:gap-20", className)}>
      {children}
    </div>
  );
}

export { MarketingFeatureList, MarketingPageShell, MarketingProductHero };
