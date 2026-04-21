"use client";

import {
  IconChevronDown,
  IconHome,
  IconLogout,
  IconMoon,
  IconRadar2,
  IconSettings,
  IconShieldCheck,
  IconSun,
  IconUserPlus,
  IconUsers,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";
import { authClient } from "@/features/auth/model/auth-client";
import { nextCycledBeaconTheme, persistBeaconThemePreference } from "@/features/beacon/lib/beacon-theme-preference";
import { initialsFor } from "@/features/operator/model/format";
import { isProductAdminAppRole } from "@/shared/lib/membership/product-admin-role";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
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

const publicLoggedOutSurfaces = new Set(["/", "/sign-in", "/sign-up"]);

export function TowerHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const onSignOut = useCallback(async () => {
    setSigningOut(true);
    await authClient.signOut({ fetchOptions: { credentials: "include" } });
    router.push("/");
    router.refresh();
    setSigningOut(false);
  }, [router]);

  const cycleTheme = useCallback(() => {
    const next = nextCycledBeaconTheme(theme);
    setTheme(next);
    if (session?.user) {
      persistBeaconThemePreference(next);
    }
  }, [theme, setTheme, session?.user]);

  const hideAppChrome = !session?.user && publicLoggedOutSurfaces.has(pathname);
  if (hideAppChrome) {
    return null;
  }

  const user = session?.user;
  const isProductAdmin = isProductAdminAppRole(user?.role);

  return (
    <header className="supports-backdrop-filter:bg-background/75 sticky top-0 z-50 border-b border-border bg-background/90 px-4 py-3 backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <Link href="/" className="shrink-0 font-semibold tracking-tight text-foreground">
            Tower
          </Link>
          <nav className="flex min-w-0 flex-wrap items-center gap-1">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/" className="inline-flex items-center gap-1.5">
                <IconHome aria-hidden className="size-4 shrink-0" stroke={1.5} />
                Workspace
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/team" className="inline-flex items-center gap-1.5">
                <IconUsers aria-hidden className="size-4 shrink-0" stroke={1.5} />
                Team
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/beacon" className="inline-flex items-center gap-1.5">
                <IconRadar2 aria-hidden className="size-4 shrink-0" stroke={1.5} />
                Beacon
              </Link>
            </Button>
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {mounted ? (
            <Button type="button" variant="ghost" size="icon-sm" onClick={cycleTheme} aria-label="Cycle theme">
              {resolvedTheme === "dark" ? (
                <IconSun aria-hidden className="size-4" stroke={1.5} />
              ) : (
                <IconMoon aria-hidden className="size-4" stroke={1.5} />
              )}
            </Button>
          ) : null}
          <AuthSection
            isPending={isPending}
            user={user}
            isProductAdmin={isProductAdmin}
            signingOut={signingOut}
            onSignOut={onSignOut}
          />
        </div>
      </div>
    </header>
  );
}

type AuthUser = { email: string; name?: string | null };

function AuthSection({
  isPending,
  user,
  isProductAdmin,
  signingOut,
  onSignOut,
}: {
  isPending: boolean;
  user: AuthUser | null | undefined;
  isProductAdmin: boolean;
  signingOut: boolean;
  onSignOut: () => void | Promise<void>;
}) {
  if (isPending) {
    return <span className="text-xs text-muted-foreground">…</span>;
  }
  if (!user) {
    return (
      <>
        <Button variant="outline" size="sm" asChild>
          <Link href="/sign-in" className="inline-flex items-center gap-1.5">
            Sign in
          </Link>
        </Button>
        <Button variant="default" size="sm" asChild>
          <Link href="/sign-up" className="inline-flex items-center gap-1.5">
            <IconUserPlus aria-hidden className="size-4 shrink-0" stroke={1.5} />
            Sign up
          </Link>
        </Button>
      </>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="gap-2 pl-1.5 pr-1.5" aria-label="Account menu">
          <Avatar className="size-6">
            <AvatarFallback>{initialsFor(user.name || user.email)}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-40 truncate text-sm md:inline">{user.email}</span>
          <IconChevronDown className="size-3.5 opacity-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="normal-case">
          <div className="flex flex-col gap-0.5">
            <span className="truncate text-sm font-medium text-foreground">{user.name || user.email}</span>
            <span className="truncate text-xs text-muted-foreground">{user.email}</span>
            {isProductAdmin ? (
              <span className="mt-1">
                <Badge variant="secondary" className="gap-1">
                  <IconShieldCheck className="size-3" />
                  Operator
                </Badge>
              </span>
            ) : null}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/account" className="gap-2">
              <IconSettings className="size-4" />
              Account settings
            </Link>
          </DropdownMenuItem>
          {isProductAdmin ? (
            <DropdownMenuItem asChild>
              <Link href="/console" className="gap-2">
                <IconShieldCheck className="size-4" />
                Switch to operator
              </Link>
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={signingOut}
          onSelect={(event) => {
            event.preventDefault();
            void onSignOut();
          }}
          className="gap-2"
        >
          <IconLogout className="size-4" />
          {signingOut ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
