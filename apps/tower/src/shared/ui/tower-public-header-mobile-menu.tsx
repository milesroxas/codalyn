"use client";

import { IconMenu2 } from "@tabler/icons-react";

import type { TowerPublicNavItem } from "@/shared/lib/navigation/tower-public-nav";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import type { TowerPublicHeaderProduct } from "@/shared/ui/tower-public-header";
import {
  buildFallbackNavItems,
  resolveActiveHref,
  TowerPublicHeaderLink,
} from "@/shared/ui/tower-public-header-product-nav";

type TowerPublicHeaderMobileMenuProps = {
  activeProduct?: TowerPublicHeaderProduct;
  beaconHref: string;
  towerHref: string;
  flintHref: string;
  signInHref: string;
  /** CMS-managed nav items; falls back to the built-in product nav when absent. */
  navItems?: TowerPublicNavItem[] | null;
};

function TowerPublicHeaderMobileMenu({
  activeProduct,
  beaconHref,
  towerHref,
  flintHref,
  signInHref,
  navItems,
}: TowerPublicHeaderMobileMenuProps) {
  const items = navItems?.length ? navItems : buildFallbackNavItems({ beaconHref, towerHref, flintHref });
  const activeHref = resolveActiveHref({ activeProduct, beaconHref, towerHref, flintHref });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon-sm" className="md:hidden" aria-label="Open menu">
          <IconMenu2 aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-44">
        {items.map((item) =>
          item.type === "dropdown" ? (
            <div key={item.label}>
              <DropdownMenuLabel className="text-xs text-muted-foreground">{item.label}</DropdownMenuLabel>
              {item.items.map((link) => (
                <DropdownMenuItem key={`${link.href}:${link.label}`} asChild>
                  <TowerPublicHeaderLink href={link.href} newTab={link.newTab}>
                    {link.label}
                  </TowerPublicHeaderLink>
                </DropdownMenuItem>
              ))}
            </div>
          ) : (
            <DropdownMenuItem
              key={`${item.href}:${item.label}`}
              asChild
              data-active={item.href === activeHref ? true : undefined}
            >
              <TowerPublicHeaderLink href={item.href} newTab={item.newTab} active={item.href === activeHref}>
                {item.label}
              </TowerPublicHeaderLink>
            </DropdownMenuItem>
          )
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <TowerPublicHeaderLink href={signInHref}>Sign in</TowerPublicHeaderLink>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { TowerPublicHeaderMobileMenu };
