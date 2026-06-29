import Link from "next/link";
import type * as React from "react";

import { cn } from "@/shared/lib/utils";
import type { TowerPublicHeaderProduct } from "@/shared/ui/tower-public-header";

type TowerPublicHeaderProductNavProps = {
  activeProduct?: TowerPublicHeaderProduct;
  beaconHref: string;
  towerHref: string;
  flintHref: string;
};

type ProductNavItem = {
  id: TowerPublicHeaderProduct;
  href: string;
  label: string;
};

function isExternalHref(href: string): boolean {
  return href.startsWith("http");
}

function TowerPublicHeaderLink({
  href,
  active,
  className,
  children,
}: {
  href: string;
  active?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  if (isExternalHref(href)) {
    return (
      <a href={href} className={className} aria-current={active ? "page" : undefined}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className} aria-current={active ? "page" : undefined}>
      {children}
    </Link>
  );
}

function TowerPublicHeaderNavLink({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <TowerPublicHeaderLink
      href={href}
      active={active}
      className={cn(
        "inline-flex h-8 items-center justify-center gap-1.5 rounded-sm px-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10",
        active && "bg-white/20"
      )}
    >
      {children}
    </TowerPublicHeaderLink>
  );
}

function TowerPublicHeaderProductNav({
  activeProduct,
  beaconHref,
  towerHref,
  flintHref,
}: TowerPublicHeaderProductNavProps) {
  const items: ProductNavItem[] = [
    { id: "beacon", href: beaconHref, label: "Beacon" },
    { id: "tower", href: towerHref, label: "Tower" },
    { id: "flint", href: flintHref, label: "Flint" },
  ];

  return (
    <nav aria-label="Codalyn products" className="hidden items-center gap-2 md:flex">
      {items.map((item) => (
        <TowerPublicHeaderNavLink key={item.id} href={item.href} active={activeProduct === item.id}>
          {item.label}
        </TowerPublicHeaderNavLink>
      ))}
    </nav>
  );
}

export { TowerPublicHeaderLink, TowerPublicHeaderProductNav };
