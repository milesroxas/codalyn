import { CreditCardIcon, LayoutDashboardIcon, type LucideIcon, PlugIcon, RadarIcon, UsersIcon } from "lucide-react";
import { TOWER_CONNECTION_PATH } from "@/shared/lib/navigation/tower-app-paths";

export const TOWER_PUBLIC_LOGGED_OUT_SURFACES = new Set(["/", "/sign-in", "/sign-up", "/request-access"]);

export type TowerNavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export function isTowerNavActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/" || pathname === "";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function towerPageTitleFromPathname(pathname: string): string {
  if (pathname === "/" || pathname === "") {
    return "Dashboard";
  }
  if (pathname.startsWith("/team")) {
    return "Team";
  }
  if (pathname.startsWith("/beacon")) {
    return "Beacon";
  }
  if (pathname.startsWith("/connection") || pathname.startsWith("/webflow")) {
    return "Connection";
  }
  if (pathname.startsWith("/billing")) {
    return "Billing";
  }
  if (pathname.startsWith("/account")) {
    return "Account";
  }
  return "Tower";
}

export function buildTowerMainNav(billingEnabled: boolean): TowerNavItem[] {
  const items: TowerNavItem[] = [
    { title: "Dashboard", href: "/", icon: LayoutDashboardIcon },
    { title: "Team", href: "/team", icon: UsersIcon },
    { title: "Beacon", href: "/beacon", icon: RadarIcon },
    { title: "Connection", href: TOWER_CONNECTION_PATH, icon: PlugIcon },
  ];

  if (billingEnabled) {
    items.push({ title: "Billing", href: "/billing", icon: CreditCardIcon });
  }

  return items;
}
