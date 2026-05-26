"use client";

import {
  IconCreditCard,
  IconHome,
  IconMoon,
  IconPlug,
  IconRadar2,
  IconShieldCheck,
  IconSun,
  IconUserPlus,
  IconUsers,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";
import { authClient } from "@/features/auth/model/auth-client";
import { useTowerWebSignOut } from "@/features/auth/model/use-tower-web-sign-out";
import { persistBeaconThemePreference, toggledLightDarkTheme } from "@/features/beacon/lib/beacon-theme-preference";
import { avatarLetterFromUser } from "@/features/operator/model/format";
import { TowerAccountMenu } from "@/features/tower-ui/tower-account-menu";
import { TowerHeaderWorkspaceSwitcher } from "@/features/tower-ui/tower-header-workspace-switcher";
import { isProductAdminAppRole } from "@/shared/lib/membership/product-admin-role";
import { TOWER_CONNECTION_PATH } from "@/shared/lib/navigation/tower-app-paths";
import { userDisplayName } from "@/shared/lib/user-display-name";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { towerAppShellContentClassName } from "@/shared/ui/tower-page-shell";

const publicLoggedOutSurfaces = new Set(["/", "/sign-in", "/sign-up", "/request-access"]);

export function TowerHeader({ billingEnabled = false }: { billingEnabled?: boolean }) {
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const effectiveResolved: "light" | "dark" = resolvedTheme === "dark" ? "dark" : "light";
  const [mounted, setMounted] = useState(false);
  const { signOut: onSignOut, signingOut } = useTowerWebSignOut();

  useEffect(() => {
    setMounted(true);
  }, []);

  const cycleTheme = useCallback(() => {
    const next = toggledLightDarkTheme(theme, effectiveResolved);
    setTheme(next);
    if (session?.user) {
      persistBeaconThemePreference(next);
    }
  }, [theme, setTheme, session?.user, effectiveResolved]);

  const hideAppChrome = !session?.user && publicLoggedOutSurfaces.has(pathname);
  if (hideAppChrome) {
    return null;
  }

  const user = session?.user;
  const isProductAdmin = isProductAdminAppRole(user?.role);

  return (
    <header className="supports-backdrop-filter:bg-background/75 sticky top-0 z-50 border-b border-border bg-background/90 py-3 backdrop-blur">
      <div className={towerAppShellContentClassName("default", "flex flex-wrap items-center justify-between gap-3")}>
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <Link href="/" className="shrink-0 font-semibold tracking-tight text-foreground">
            Tower
          </Link>
          <nav className="flex min-w-0 flex-wrap items-center gap-1">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/" className="inline-flex items-center gap-1.5">
                <IconHome aria-hidden className="size-4 shrink-0" stroke={1.5} />
                Dashboard
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
            <Button variant="ghost" size="sm" asChild>
              <Link href={TOWER_CONNECTION_PATH} className="inline-flex items-center gap-1.5">
                <IconPlug aria-hidden className="size-4 shrink-0" stroke={1.5} />
                Connection
              </Link>
            </Button>
            {billingEnabled ? (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/billing" className="inline-flex items-center gap-1.5">
                  <IconCreditCard aria-hidden className="size-4 shrink-0" stroke={1.5} />
                  Billing
                </Link>
              </Button>
            ) : null}
          </nav>
          <div className="min-w-0">
            <TowerHeaderWorkspaceSwitcher />
          </div>
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
            billingEnabled={billingEnabled}
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

type AuthUser = {
  email: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

function AuthSection({
  billingEnabled,
  isPending,
  user,
  isProductAdmin,
  signingOut,
  onSignOut,
}: {
  billingEnabled: boolean;
  isPending: boolean;
  user: AuthUser | null | undefined;
  isProductAdmin: boolean;
  signingOut: boolean;
  onSignOut: () => void | Promise<void>;
}) {
  if (isPending) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-16 rounded-md" aria-hidden />
        <Skeleton className="h-8 w-20 rounded-md" aria-hidden />
      </div>
    );
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
  const accountLinks = [
    ...(billingEnabled ? [{ href: "/billing", label: "Billing", icon: IconCreditCard }] : []),
    ...(isProductAdmin ? [{ href: "/console", label: "Switch to operator", icon: IconShieldCheck }] : []),
  ];

  return (
    <TowerAccountMenu
      displayName={userDisplayName(user)}
      email={user.email}
      showOperatorBadge={isProductAdmin}
      links={accountLinks}
      signingOut={signingOut}
      onSignOut={onSignOut}
      trigger={
        <Button type="button" variant="ghost" size="icon-avatar" aria-label="Account menu">
          <Avatar className="size-8">
            <AvatarFallback className="text-xs font-medium">
              {avatarLetterFromUser({
                firstName: user.firstName,
                name: user.name,
                email: user.email,
              })}
            </AvatarFallback>
          </Avatar>
        </Button>
      }
    />
  );
}
