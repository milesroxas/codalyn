"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type * as React from "react";
import { buildTowerMainNav, isTowerNavActive } from "@/features/tower-ui/lib/tower-app-nav";
import { TowerBrandMark } from "@/features/tower-ui/tower-brand-mark";
import { TowerHeaderWorkspaceSwitcher } from "@/features/tower-ui/tower-header-workspace-switcher";
import { TowerSidebarUser } from "@/features/tower-ui/tower-sidebar-user";
import { NavMain } from "@/shared/ui/nav-main";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/shared/ui/sidebar";

type TowerAppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  billingEnabled: boolean;
  canCreateWorkspace: boolean;
};

export function TowerAppSidebar({ billingEnabled, canCreateWorkspace, ...props }: TowerAppSidebarProps) {
  const pathname = usePathname();
  const navItems = buildTowerMainNav(billingEnabled).map(({ title, href, icon: Icon }) => ({
    title,
    url: href,
    isActive: isTowerNavActive(pathname, href),
    icon: <Icon />,
  }));

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu className="gap-2">
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:p-1.5!">
              <Link href="/">
                <TowerBrandMark size="header" />
                <span className="text-base font-semibold">Tower</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <TowerHeaderWorkspaceSwitcher billingEnabled={billingEnabled} canCreateWorkspace={canCreateWorkspace} />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <TowerSidebarUser billingEnabled={billingEnabled} />
      </SidebarFooter>
    </Sidebar>
  );
}
