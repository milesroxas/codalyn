"use client";

import { IconHome, IconLogout, IconMoon, IconSun, IconUserPlus, IconUsers } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";
import { authClient } from "@/features/auth/model/auth-client";
import { Button } from "@/shared/ui/button";

const publicLoggedOutSurfaces = new Set(["/", "/sign-in", "/sign-up"]);

export function TowerHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const { setTheme, resolvedTheme } = useTheme();
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

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const hideAppChrome = !session?.user && publicLoggedOutSurfaces.has(pathname);
  if (hideAppChrome) {
    return null;
  }

  return (
    <header className="supports-backdrop-filter:bg-background/75 sticky top-0 z-50 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
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
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {mounted ? (
            <Button type="button" variant="ghost" size="icon-sm" onClick={toggleTheme} aria-label="Toggle theme">
              {resolvedTheme === "dark" ? (
                <IconSun aria-hidden className="size-4" stroke={1.5} />
              ) : (
                <IconMoon aria-hidden className="size-4" stroke={1.5} />
              )}
            </Button>
          ) : null}
          {isPending ? (
            <span className="text-xs text-muted-foreground">…</span>
          ) : session?.user ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={signingOut}
              onClick={() => void onSignOut()}
              className="inline-flex items-center gap-1.5"
            >
              <IconLogout aria-hidden className="size-4 shrink-0" stroke={1.5} />
              Sign out
            </Button>
          ) : (
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
          )}
        </div>
      </div>
    </header>
  );
}
