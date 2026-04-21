"use client";

import {
  IconActivity,
  IconArrowLeft,
  IconLayoutDashboard,
  IconLogout,
  IconMenu2,
  IconMoon,
  IconSun,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { authClient } from "@/features/auth/model/auth-client";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";

const nav = [
  { href: "/console", label: "Overview", icon: IconLayoutDashboard },
  { href: "/console/accounts", label: "Accounts", icon: IconUsers },
  { href: "/console/platform", label: "Platform", icon: IconActivity },
] as const;

export function OperatorShell(props: { userEmail: string; children: ReactNode }) {
  const { userEmail, children } = props;
  const pathname = usePathname();
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
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

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex flex-col gap-0.5 p-3">
      {nav.map(({ href, label, icon: Icon }) => {
        const isExactOverview = href === "/console";
        const isActive = isExactOverview
          ? pathname === href || pathname === `${href}/`
          : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive ? "bg-zinc-800 text-zinc-50" : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100"
            )}
          >
            <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 text-zinc-100 md:flex">
        <div className="border-b border-zinc-800 px-4 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-500/90">Operator</p>
          <p className="mt-1 text-sm font-semibold text-zinc-50">Tower</p>
          <p className="mt-2 truncate text-xs text-zinc-500" title={userEmail}>
            {userEmail}
          </p>
        </div>
        <NavLinks />
        <div className="mt-auto border-t border-zinc-800 p-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            asChild
          >
            <Link href="/">
              <IconArrowLeft className="size-4" aria-hidden />
              Tenant workspace
            </Link>
          </Button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 flex h-full w-[min(18rem,100%)] flex-col border-r border-zinc-800 bg-zinc-950 text-zinc-100 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
              <span className="text-sm font-semibold text-zinc-50">Operator</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-zinc-400"
                onClick={() => setMobileOpen(false)}
                aria-label="Close"
              >
                <IconX className="size-5" />
              </Button>
            </div>
            <NavLinks onNavigate={() => setMobileOpen(false)} />
            <div className="mt-auto border-t border-zinc-800 p-3">
              <Button variant="ghost" size="sm" className="w-full justify-start text-zinc-400" asChild>
                <Link href="/" onClick={() => setMobileOpen(false)}>
                  Tenant workspace
                </Link>
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-zinc-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
          <div className="flex items-center gap-2 md:hidden">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="border-zinc-300 dark:border-zinc-700"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <IconMenu2 className="size-4" />
            </Button>
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Tower operator</span>
          </div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-2">
            {mounted ? (
              <Button type="button" variant="ghost" size="icon-sm" onClick={toggleTheme} aria-label="Toggle theme">
                {resolvedTheme === "dark" ? (
                  <IconSun aria-hidden className="size-4 text-zinc-600 dark:text-zinc-400" />
                ) : (
                  <IconMoon aria-hidden className="size-4 text-zinc-600" />
                )}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={signingOut}
              className="gap-1.5 border-zinc-300 dark:border-zinc-700"
              onClick={() => void onSignOut()}
            >
              <IconLogout className="size-4" aria-hidden />
              Sign out
            </Button>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
