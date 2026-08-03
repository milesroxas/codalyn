"use client";

import type * as React from "react";

import type { TowerPublicNavItem } from "@/shared/lib/navigation/tower-public-nav";
import { TowerMarketingPublicPageBody } from "@/shared/ui/tower-marketing-public-page-body";
import {
  TowerPublicHeader,
  type TowerPublicHeaderProduct,
  TowerPublicHeaderSpacer,
} from "@/shared/ui/tower-public-header";
import { TowerPublicPageScroll } from "@/shared/ui/tower-public-page-scroll";

type TowerPublicMarketingPageShellProps = {
  activeProduct?: TowerPublicHeaderProduct;
  homeHref?: string;
  beaconHref?: string;
  flintHref?: string;
  signInHref: string;
  primaryCtaHref: string;
  primaryCtaLabel: string;
  towerHref?: string;
  navItems?: TowerPublicNavItem[] | null;
  contentClassName?: string;
  children: React.ReactNode;
};

function TowerPublicMarketingPageShell({
  activeProduct,
  homeHref = "/",
  beaconHref,
  flintHref,
  signInHref,
  primaryCtaHref,
  primaryCtaLabel,
  towerHref,
  navItems,
  contentClassName,
  children,
}: TowerPublicMarketingPageShellProps) {
  return (
    <div className="dark min-h-dvh bg-background text-foreground antialiased">
      <TowerPublicHeader
        homeHref={homeHref}
        activeProduct={activeProduct}
        beaconHref={beaconHref}
        flintHref={flintHref}
        signInHref={signInHref}
        primaryCtaHref={primaryCtaHref}
        primaryCtaLabel={primaryCtaLabel}
        towerHref={towerHref}
        navItems={navItems}
      />
      <TowerPublicHeaderSpacer />
      <TowerPublicPageScroll>
        <TowerMarketingPublicPageBody contentAs="main" contentClassName={contentClassName}>
          {children}
        </TowerMarketingPublicPageBody>
      </TowerPublicPageScroll>
    </div>
  );
}

export { TowerPublicMarketingPageShell };
