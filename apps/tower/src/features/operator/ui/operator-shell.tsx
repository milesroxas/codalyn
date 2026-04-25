"use client";

import {
  IconArrowLeft,
  IconBuilding,
  IconChevronDown,
  IconDashboard,
  IconLogout,
  IconMenu2,
  IconMoon,
  IconPlug,
  IconSearch,
  IconSettings,
  IconShieldCheck,
  IconSun,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { authClient } from "@/features/auth/model/auth-client";
import { persistBeaconThemePreference, toggledLightDarkTheme } from "@/features/beacon/lib/beacon-theme-preference";
import { initialsFor } from "@/features/operator/model/format";
import { OperatorCommandPalette } from "@/features/operator/ui/operator-command-palette";
import { cn } from "@/shared/lib/utils";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

const nav = [
  { href: "/console", label: "Overview", icon: IconDashboard },
  { href: "/console/customers", label: "Customers", icon: IconUsers },
  { href: "/console/workspaces", label: "Workspaces", icon: IconBuilding },
  { href: "/console/platform", label: "Platform", icon: IconPlug },
] as const;

function isActiveNav(pathname: string, href: string): boolean {
  if (href === "/console") {
    return pathname === href || pathname === `${href}/`;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export type OperatorShellProps = {
  userEmail: string;
  userName: string;
  children: ReactNode;
};

export function OperatorShell({ userEmail, userName, children }: OperatorShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { setTheme, resolvedTheme } = useTheme();
  const effectiveResolved: "light" | "dark" = resolvedTheme === "dark" ? "dark" : "light";
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const isCmdK = (event.key === "k" || event.key === "K") && (event.metaKey || event.ctrlKey);
      if (isCmdK) {
        event.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onSignOut = useCallback(async () => {
    setSigningOut(true);
    await authClient.signOut({ fetchOptions: { credentials: "include" } });
    router.push("/");
    router.refresh();
    setSigningOut(false);
  }, [router]);

  const cycleTheme = useCallback(() => {
    setTheme((current) => {
      const next = toggledLightDarkTheme(current, effectiveResolved);
      if (session?.user) {
        persistBeaconThemePreference(next);
      }
      return next;
    });
  }, [setTheme, session?.user, effectiveResolved]);

  const brand = (
    <Link
      href="/console"
      className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-muted/50"
      aria-label="Operator console home"
    >
      <span className="flex size-7 items-center justify-center rounded-md bg-foreground text-background">
        <IconShieldCheck className="size-4" aria-hidden />
      </span>
      <div className="flex flex-col leading-tight">
        <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Tower</span>
        <span className="text-sm font-semibold text-foreground">Operator</span>
      </div>
    </Link>
  );

  const NavItems = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex flex-col gap-0.5 px-2">
      {nav.map(({ href, label, icon: Icon }) => {
        const active = isActiveNav(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors",
              active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <Icon className={cn("size-4 shrink-0", active ? "text-foreground" : "opacity-70")} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  const SidebarFooter = (
    <div className="mt-auto flex flex-col gap-2 border-t border-border px-3 py-3">
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
        asChild
      >
        <Link href="/">
          <IconArrowLeft className="size-4" aria-hidden />
          Tenant workspace
        </Link>
      </Button>
    </div>
  );

  return (
    <div className="relative flex min-h-dvh flex-col bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-3 backdrop-blur supports-backdrop-filter:bg-background/75 sm:px-4">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="md:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <IconMenu2 className="size-4" />
        </Button>

        <div className="hidden md:flex md:w-56">{brand}</div>
        <div className="flex md:hidden">{brand}</div>

        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPaletteOpen(true)}
            className="hidden gap-2 text-muted-foreground sm:inline-flex"
          >
            <IconSearch className="size-4" aria-hidden />
            <span>Search…</span>
            <kbd className="ml-2 hidden items-center gap-0.5 rounded bg-muted px-1 py-0.5 font-mono text-[10px] text-muted-foreground md:inline-flex">
              ⌘K
            </kbd>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setPaletteOpen(true)}
            aria-label="Search"
            className="sm:hidden"
          >
            <IconSearch className="size-4" />
          </Button>

          {mounted ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="icon-sm" onClick={cycleTheme} aria-label="Cycle theme">
                  {resolvedTheme === "dark" ? (
                    <IconSun aria-hidden className="size-4" />
                  ) : (
                    <IconMoon aria-hidden className="size-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Cycle theme</TooltipContent>
            </Tooltip>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="gap-2 pl-1.5 pr-1.5" aria-label="Account menu">
                <Avatar className="size-6">
                  <AvatarFallback>{initialsFor(userName || userEmail)}</AvatarFallback>
                </Avatar>
                <span className="hidden max-w-40 truncate text-sm md:inline">{userEmail}</span>
                <IconChevronDown className="size-3.5 opacity-60" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="normal-case">
                <div className="flex flex-col gap-0.5">
                  <span className="truncate text-sm font-medium text-foreground">{userName || userEmail}</span>
                  <span className="truncate text-xs text-muted-foreground">{userEmail}</span>
                  <span className="mt-1">
                    <Badge variant="secondary" className="gap-1">
                      <IconShieldCheck className="size-3" />
                      Operator
                    </Badge>
                  </span>
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
                <DropdownMenuItem asChild>
                  <Link href="/" className="gap-2">
                    <IconArrowLeft className="size-4" />
                    Switch to tenant
                  </Link>
                </DropdownMenuItem>
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
        </div>
      </header>

      <div className="flex min-w-0 flex-1">
        {/* Desktop sidebar */}
        <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-56 shrink-0 flex-col border-r border-border bg-background md:flex">
          <div className="px-3 py-4">
            <p className="px-2 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Navigate</p>
          </div>
          <NavItems />
          {SidebarFooter}
        </aside>

        {/* Mobile drawer */}
        {mobileOpen ? (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              type="button"
              aria-label="Close menu"
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute left-0 top-0 flex h-full w-72 max-w-[85%] flex-col border-r border-border bg-background shadow-lg">
              <div className="flex h-14 items-center justify-between border-b border-border px-3">
                {brand}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close"
                >
                  <IconX className="size-5" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto py-4">
                <NavItems onNavigate={() => setMobileOpen(false)} />
              </div>
              {SidebarFooter}
            </div>
          </div>
        ) : null}

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</div>
        </main>
      </div>

      <OperatorCommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
