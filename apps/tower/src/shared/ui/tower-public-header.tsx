import Link from "next/link";
import type * as React from "react";

import { TOWER_PRODUCT_MARKETING_PATH } from "@/shared/lib/navigation/tower-marketing-paths";
import { cn } from "@/shared/lib/utils";
import { CodalynLogo } from "@/shared/ui/codalyn-logo";
import { TowerPublicHeaderAuthActions } from "@/shared/ui/tower-public-header-auth-actions";
import { TowerPublicHeaderMobileMenu } from "@/shared/ui/tower-public-header-mobile-menu";
import { TowerPublicHeaderProductNav } from "@/shared/ui/tower-public-header-product-nav";

export const TOWER_PUBLIC_HEADER_HEIGHT_PX = 72;

export type TowerPublicHeaderProduct = "beacon" | "tower" | "flint";

type TowerPublicHeaderProps = {
  homeHref?: string;
  beaconHref?: string;
  flintHref?: string;
  towerHref?: string;
  activeProduct?: TowerPublicHeaderProduct;
  signInHref: string;
  primaryCtaHref: string;
  primaryCtaLabel: string;
  actions?: React.ReactNode;
};

function TowerPublicHeader({
  homeHref = "/",
  beaconHref = "/beacon",
  flintHref = "/flint",
  towerHref,
  activeProduct,
  signInHref,
  primaryCtaHref,
  primaryCtaLabel,
  actions,
}: TowerPublicHeaderProps) {
  const resolvedTowerHref = towerHref ?? TOWER_PRODUCT_MARKETING_PATH;

  const authActions =
    actions === undefined ? (
      <TowerPublicHeaderAuthActions
        signInHref={signInHref}
        primaryCtaHref={primaryCtaHref}
        primaryCtaLabel={primaryCtaLabel}
      />
    ) : (
      actions
    );

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 pt-6 antialiased">
      <div className="relative mx-auto w-full max-w-[100vw]">
        <div className="pointer-events-auto relative flex h-12 w-full items-center justify-between gap-3 rounded-sm bg-[#FFFFFF40] px-2 py-2 backdrop-blur-sm md:hidden">
          <TowerPublicHeaderMobileMenu
            activeProduct={activeProduct}
            beaconHref={beaconHref}
            towerHref={resolvedTowerHref}
            flintHref={flintHref}
            signInHref={signInHref}
          />

          <Link
            href={homeHref}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white transition-opacity hover:opacity-80"
          >
            <CodalynLogo />
          </Link>

          {authActions}
        </div>

        <div className="relative mx-auto hidden h-12 w-full md:block">
          <div className="pointer-events-auto absolute top-0 left-1/2 flex -translate-x-1/2 items-center gap-14 rounded-sm bg-[#FFFFFF40] px-4 py-2 backdrop-blur-sm">
            <Link href={homeHref} className="text-white transition-opacity hover:opacity-80">
              <CodalynLogo />
            </Link>
            <TowerPublicHeaderProductNav
              activeProduct={activeProduct}
              beaconHref={beaconHref}
              towerHref={resolvedTowerHref}
              flintHref={flintHref}
            />
          </div>

          <div className="pointer-events-auto absolute top-0 right-[23px] flex items-center">{authActions}</div>
        </div>
      </div>
    </header>
  );
}

function TowerPublicHeaderSpacer({ className }: { className?: string }) {
  return <div aria-hidden className={cn("shrink-0", className)} style={{ height: TOWER_PUBLIC_HEADER_HEIGHT_PX }} />;
}

export { TowerPublicHeader, TowerPublicHeaderSpacer };
