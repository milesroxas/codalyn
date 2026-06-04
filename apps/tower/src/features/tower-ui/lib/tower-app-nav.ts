import { CreditCardIcon, LayoutDashboardIcon, type LucideIcon, PlugIcon, RadarIcon, UsersIcon } from "lucide-react";
import { TOWER_CONNECTION_PATH } from "@/shared/lib/navigation/tower-app-paths";

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
