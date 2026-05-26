"use client";

import { CirclePlusIcon, MailIcon } from "lucide-react";
import Link from "next/link";
import type * as React from "react";
import { Button } from "@/shared/ui/button";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/shared/ui/sidebar";

export type NavMainItem = {
  title: string;
  url: string;
  icon?: React.ReactNode;
  isActive?: boolean;
};

function NavMainQuickActions() {
  return (
    <SidebarMenu>
      <SidebarMenuItem className="flex items-center gap-2">
        <SidebarMenuButton
          tooltip="Quick Create"
          className="min-w-8 bg-primary text-primary-foreground duration-200 ease-linear hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
        >
          <CirclePlusIcon />
          <span>Quick Create</span>
        </SidebarMenuButton>
        <Button size="icon" className="size-8 group-data-[collapsible=icon]:opacity-0" variant="outline">
          <MailIcon />
          <span className="sr-only">Inbox</span>
        </Button>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function NavMain({ items, showQuickActions = false }: { items: NavMainItem[]; showQuickActions?: boolean }) {
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        {showQuickActions ? <NavMainQuickActions /> : null}
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild isActive={item.isActive} tooltip={item.title}>
                {item.url.startsWith("#") ? (
                  <a href={item.url}>
                    {item.icon}
                    <span>{item.title}</span>
                  </a>
                ) : (
                  <Link href={item.url}>
                    {item.icon}
                    <span>{item.title}</span>
                  </Link>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
