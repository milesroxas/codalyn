"use client";

import { CircleUserRoundIcon, CreditCardIcon, EllipsisVerticalIcon, LogOutIcon, ShieldCheckIcon } from "lucide-react";
import Link from "next/link";
import { authClient } from "@/features/auth/model/auth-client";
import { useTowerWebSignOut } from "@/features/auth/model/use-tower-web-sign-out";
import { avatarLetterFromUser } from "@/features/operator/model/format";
import { isProductAdminAppRole } from "@/shared/lib/membership/product-admin-role";
import { userDisplayName } from "@/shared/lib/user-display-name";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/shared/ui/sidebar";
import { Skeleton } from "@/shared/ui/skeleton";

type TowerSidebarUserProps = {
  billingEnabled: boolean;
};

export function TowerSidebarUser({ billingEnabled }: TowerSidebarUserProps) {
  const { isMobile } = useSidebar();
  const { data: session, isPending } = authClient.useSession();
  const { signOut: onSignOut, signingOut } = useTowerWebSignOut();

  if (isPending) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <Skeleton className="h-12 w-full rounded-lg" aria-hidden />
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  const user = session?.user;
  if (!user) {
    return null;
  }

  const displayName = userDisplayName(user);
  const isProductAdmin = isProductAdminAppRole(user.role);
  const avatarFallback = avatarLetterFromUser({
    firstName: user.firstName,
    name: user.name,
    email: user.email,
  });

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="size-8 rounded-lg">
                <AvatarFallback className="rounded-lg text-xs font-medium">{avatarFallback}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{displayName}</span>
                <span className="truncate text-xs text-muted-foreground">{user.email}</span>
              </div>
              <EllipsisVerticalIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="size-8 rounded-lg">
                  <AvatarFallback className="rounded-lg text-xs font-medium">{avatarFallback}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{displayName}</span>
                  <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/account">
                  <CircleUserRoundIcon />
                  Account
                </Link>
              </DropdownMenuItem>
              {billingEnabled ? (
                <DropdownMenuItem asChild>
                  <Link href="/billing">
                    <CreditCardIcon />
                    Billing
                  </Link>
                </DropdownMenuItem>
              ) : null}
              {isProductAdmin ? (
                <DropdownMenuItem asChild>
                  <Link href="/console">
                    <ShieldCheckIcon />
                    Switch to operator
                  </Link>
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={signingOut}
              onSelect={(event) => {
                event.preventDefault();
                void onSignOut();
              }}
            >
              <LogOutIcon />
              {signingOut ? "Signing out…" : "Log out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
