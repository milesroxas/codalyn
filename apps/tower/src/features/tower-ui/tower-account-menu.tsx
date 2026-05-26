"use client";

import { IconLogout, IconSettings, IconShieldCheck } from "@tabler/icons-react";
import Link from "next/link";
import type * as React from "react";
import { Badge } from "@/shared/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuProfileLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

export type TowerAccountMenuLink = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
};

export function TowerAccountMenu({
  trigger,
  displayName,
  email,
  showOperatorBadge,
  links,
  signingOut,
  onSignOut,
}: {
  trigger: React.ReactNode;
  displayName: string;
  email: string;
  showOperatorBadge: boolean;
  links: TowerAccountMenuLink[];
  signingOut: boolean;
  onSignOut: () => void | Promise<void>;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" size="panel">
        <DropdownMenuProfileLabel
          displayName={displayName}
          email={email}
          badge={
            showOperatorBadge ? (
              <Badge variant="secondary" className="gap-1">
                <IconShieldCheck className="size-3" />
                Operator
              </Badge>
            ) : undefined
          }
        />
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/account">
              <IconSettings className="size-4" />
              Account settings
            </Link>
          </DropdownMenuItem>
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <DropdownMenuItem key={link.href} asChild>
                <Link href={link.href}>
                  <Icon className="size-4" />
                  {link.label}
                </Link>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={signingOut}
          onSelect={(event) => {
            event.preventDefault();
            void onSignOut();
          }}
        >
          <IconLogout className="size-4" />
          {signingOut ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
