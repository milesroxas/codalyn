"use client";

import { IconMenu2 } from "@tabler/icons-react";

import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import type { TowerPublicHeaderProduct } from "@/shared/ui/tower-public-header";
import { TowerPublicHeaderLink } from "@/shared/ui/tower-public-header-product-nav";

type TowerPublicHeaderMobileMenuProps = {
  activeProduct?: TowerPublicHeaderProduct;
  beaconHref: string;
  towerHref: string;
  flintHref: string;
  signInHref: string;
};

type ProductNavItem = {
  id: TowerPublicHeaderProduct;
  href: string;
  label: string;
};

function TowerPublicHeaderMobileMenu({
  activeProduct,
  beaconHref,
  towerHref,
  flintHref,
  signInHref,
}: TowerPublicHeaderMobileMenuProps) {
  const items: ProductNavItem[] = [
    { id: "beacon", href: beaconHref, label: "Beacon" },
    { id: "tower", href: towerHref, label: "Tower" },
    { id: "flint", href: flintHref, label: "Flint" },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon-sm" className="md:hidden" aria-label="Open menu">
          <IconMenu2 aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-44">
        {items.map((item) => (
          <DropdownMenuItem key={item.id} asChild data-active={activeProduct === item.id ? true : undefined}>
            <TowerPublicHeaderLink href={item.href} active={activeProduct === item.id}>
              {item.label}
            </TowerPublicHeaderLink>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <TowerPublicHeaderLink href={signInHref}>Sign in</TowerPublicHeaderLink>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { TowerPublicHeaderMobileMenu };
