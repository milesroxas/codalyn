"use client";

import type * as React from "react";

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
  contentClassName,
  children,
}: TowerPublicMarketingPageShellProps) {
  return (
    <div className="min-h-dvh bg-black text-foreground antialiased">
      <TowerPublicHeader
        homeHref={homeHref}
        activeProduct={activeProduct}
        beaconHref={beaconHref}
        flintHref={flintHref}
        signInHref={signInHref}
        primaryCtaHref={primaryCtaHref}
        primaryCtaLabel={primaryCtaLabel}
        towerHref={towerHref}
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
