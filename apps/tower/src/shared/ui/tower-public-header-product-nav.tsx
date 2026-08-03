import { IconChevronDown } from "@tabler/icons-react";
import Link from "next/link";
import type * as React from "react";

import type { TowerPublicNavItem } from "@/shared/lib/navigation/tower-public-nav";
import { cn } from "@/shared/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import type { TowerPublicHeaderProduct } from "@/shared/ui/tower-public-header";

type TowerPublicHeaderProductNavProps = {
  activeProduct?: TowerPublicHeaderProduct;
  beaconHref: string;
  towerHref: string;
  flintHref: string;
  /** CMS-managed nav items; falls back to the built-in product nav when absent. */
  navItems?: TowerPublicNavItem[] | null;
};

function isExternalHref(href: string): boolean {
  return href.startsWith("http");
}

/**
 * Built-in product nav, used until the CMS header global provides nav items.
 */
function buildFallbackNavItems({
  beaconHref,
  towerHref,
  flintHref,
}: Pick<TowerPublicHeaderProductNavProps, "beaconHref" | "towerHref" | "flintHref">): TowerPublicNavItem[] {
  return [
    { type: "link", label: "Beacon", href: beaconHref, newTab: false },
    { type: "link", label: "Tower", href: towerHref, newTab: false },
    { type: "link", label: "Flint", href: flintHref, newTab: false },
  ];
}

/** Href of the active product, used to highlight the matching nav item. */
function resolveActiveHref({
  activeProduct,
  beaconHref,
  towerHref,
  flintHref,
}: Pick<TowerPublicHeaderProductNavProps, "activeProduct" | "beaconHref" | "towerHref" | "flintHref">):
  | string
  | undefined {
  if (activeProduct === "beacon") return beaconHref;
  if (activeProduct === "tower") return towerHref;
  if (activeProduct === "flint") return flintHref;
  return undefined;
}

function TowerPublicHeaderLink({
  href,
  active,
  newTab,
  className,
  children,
}: {
  href: string;
  active?: boolean;
  newTab?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const target = newTab ? "_blank" : undefined;
  const rel = newTab ? "noopener noreferrer" : undefined;

  if (isExternalHref(href)) {
    return (
      <a href={href} target={target} rel={rel} className={className} aria-current={active ? "page" : undefined}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} target={target} rel={rel} className={className} aria-current={active ? "page" : undefined}>
      {children}
    </Link>
  );
}

const towerPublicHeaderNavLinkClassName =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-sm px-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/60";

function TowerPublicHeaderNavLink({
  href,
  active,
  newTab,
  children,
}: {
  href: string;
  active?: boolean;
  newTab?: boolean;
  children: React.ReactNode;
}) {
  return (
    <TowerPublicHeaderLink
      href={href}
      active={active}
      newTab={newTab}
      className={cn(towerPublicHeaderNavLinkClassName, active && "bg-muted")}
    >
      {children}
    </TowerPublicHeaderLink>
  );
}

function TowerPublicHeaderNavDropdown({ item }: { item: Extract<TowerPublicNavItem, { type: "dropdown" }> }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn(towerPublicHeaderNavLinkClassName, "data-[state=open]:bg-muted")}>
        {item.label}
        <IconChevronDown aria-hidden className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-52">
        {item.items.map((link) => (
          <DropdownMenuItem key={`${link.href}:${link.label}`} asChild>
            <TowerPublicHeaderLink href={link.href} newTab={link.newTab} className="flex-col items-start gap-0.5">
              <span>{link.label}</span>
              {link.description ? <span className="text-xs text-muted-foreground">{link.description}</span> : null}
            </TowerPublicHeaderLink>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TowerPublicHeaderProductNav({
  activeProduct,
  beaconHref,
  towerHref,
  flintHref,
  navItems,
}: TowerPublicHeaderProductNavProps) {
  const items = navItems?.length ? navItems : buildFallbackNavItems({ beaconHref, towerHref, flintHref });
  const activeHref = resolveActiveHref({ activeProduct, beaconHref, towerHref, flintHref });

  return (
    <nav aria-label="Codalyn products" className="hidden items-center gap-2 md:flex">
      {items.map((item) =>
        item.type === "dropdown" ? (
          <TowerPublicHeaderNavDropdown key={item.label} item={item} />
        ) : (
          <TowerPublicHeaderNavLink
            key={`${item.href}:${item.label}`}
            href={item.href}
            newTab={item.newTab}
            active={item.href === activeHref}
          >
            {item.label}
          </TowerPublicHeaderNavLink>
        )
      )}
    </nav>
  );
}

export { buildFallbackNavItems, resolveActiveHref, TowerPublicHeaderLink, TowerPublicHeaderProductNav };
