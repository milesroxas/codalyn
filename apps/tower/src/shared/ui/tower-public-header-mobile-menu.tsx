"use client";

import { IconMenu2 } from "@tabler/icons-react";
import Link from "next/link";

import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import type { TowerPublicHeaderProduct } from "@/shared/ui/tower-public-header";

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
        <Button type="button" variant="marketing-nav-ghost" size="icon-sm" className="md:hidden" aria-label="Open menu">
          <IconMenu2 aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-44">
        {items.map((item) => (
          <DropdownMenuItem key={item.id} asChild data-active={activeProduct === item.id ? true : undefined}>
            <Link href={item.href} aria-current={activeProduct === item.id ? "page" : undefined}>
              {item.label}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={signInHref}>Sign in</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { TowerPublicHeaderMobileMenu };
