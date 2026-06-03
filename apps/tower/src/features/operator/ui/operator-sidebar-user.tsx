"use client";

import { useDeferredLoadingIndicator } from "@codalyn/webflow-kit/react";
import { ArrowLeftIcon, CircleUserRoundIcon, EllipsisVerticalIcon, LogOutIcon } from "lucide-react";
import Link from "next/link";
import { authClient } from "@/features/auth/model/auth-client";
import { useTowerWebSignOut } from "@/features/auth/model/use-tower-web-sign-out";
import { avatarLetterFromUser } from "@/features/operator/model/format";
import { userDisplayName } from "@/shared/lib/user-display-name";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Skeleton } from "@/shared/ui/skeleton";

export function OperatorSidebarUser() {
  const { data: session, isPending } = authClient.useSession();
  const { signOut: onSignOut, signingOut } = useTowerWebSignOut();
  const showSkeleton = useDeferredLoadingIndicator(isPending);

  if (showSkeleton) {
    return <Skeleton className="h-12 w-full rounded-lg" aria-hidden />;
  }
  if (isPending) {
    return null;
  }

  const user = session?.user;
  if (!user) {
    return null;
  }

  const displayName = userDisplayName(user);
  const avatarFallback = avatarLetterFromUser({
    firstName: user.firstName,
    name: user.name,
    email: user.email,
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="h-12 w-full justify-start gap-2 px-2 data-[state=open]:bg-muted"
        >
          <Avatar className="size-8 rounded-lg">
            <AvatarFallback className="rounded-lg text-xs font-medium">{avatarFallback}</AvatarFallback>
          </Avatar>
          <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{displayName}</span>
            <span className="truncate text-xs text-muted-foreground">{user.email}</span>
          </div>
          <EllipsisVerticalIcon className="ml-auto size-4 shrink-0 opacity-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-56 rounded-lg" side="top" align="start" sideOffset={8}>
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <Avatar className="size-8 rounded-lg">
              <AvatarFallback className="rounded-lg text-xs font-medium">{avatarFallback}</AvatarFallback>
            </Avatar>
            <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
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
          <DropdownMenuItem asChild>
            <Link href="/">
              <ArrowLeftIcon />
              Tenant workspace
            </Link>
          </DropdownMenuItem>
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
  );
}
