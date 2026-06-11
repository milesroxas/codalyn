import type * as React from "react";

import { cn } from "@/shared/lib/utils";
import { TowerPublicFooter, type TowerPublicFooterVariant } from "@/shared/ui/tower-public-footer";
import { TOWER_PUBLIC_HEADER_HEIGHT_PX } from "@/shared/ui/tower-public-header";

/** Fills the viewport below the fixed public header. */
function towerMarketingPublicPageShellClassName(className?: string) {
  return cn("flex min-h-0 flex-1 flex-col", className);
}

function towerMarketingPublicPageMinHeightStyle(): React.CSSProperties {
  return { minHeight: `calc(100dvh - ${TOWER_PUBLIC_HEADER_HEIGHT_PX}px)` };
}

/** Shared content bounds for public marketing pages (product + legal). */
function towerMarketingPublicPageContentClassName(className?: string) {
  return cn("mx-auto flex w-full max-w-[90rem] flex-1 flex-col px-6 py-16 sm:px-12 lg:px-20 lg:py-24", className);
}

/** Keeps the site footer at the bottom on short pages with comfortable separation. */
function towerMarketingPublicPageFooterRegionClassName(className?: string) {
  return cn("mt-auto shrink-0 pt-12 md:pt-16 lg:pt-20", className);
}

type TowerMarketingPublicPageBodyProps = {
  children: React.ReactNode;
  contentAs?: "div" | "main";
  contentClassName?: string;
  footerVariant?: TowerPublicFooterVariant;
  fillViewport?: boolean;
};

function TowerMarketingPublicPageBody({
  children,
  contentAs: ContentTag = "div",
  contentClassName,
  footerVariant = "marketing",
  fillViewport = true,
}: TowerMarketingPublicPageBodyProps) {
  return (
    <div
      className={towerMarketingPublicPageShellClassName()}
      style={fillViewport ? towerMarketingPublicPageMinHeightStyle() : undefined}
    >
      <ContentTag className={towerMarketingPublicPageContentClassName(contentClassName)}>{children}</ContentTag>
      <div className={towerMarketingPublicPageFooterRegionClassName()}>
        <TowerPublicFooter variant={footerVariant} />
      </div>
    </div>
  );
}

export {
  TowerMarketingPublicPageBody,
  towerMarketingPublicPageContentClassName,
  towerMarketingPublicPageFooterRegionClassName,
  towerMarketingPublicPageMinHeightStyle,
  towerMarketingPublicPageShellClassName,
};
