"use client";

import { IconUserPlus } from "@tabler/icons-react";
import Link from "next/link";
import { authClient } from "@/features/auth/model/auth-client";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { towerAppShellContentClassName } from "@/shared/ui/tower-page-shell";

export function TowerLoggedOutHeader() {
  const { isPending } = authClient.useSession();

  return (
    <header className="supports-backdrop-filter:bg-background/75 shrink-0 border-b border-border bg-background/90 py-3 backdrop-blur">
      <div className={towerAppShellContentClassName("default", "flex items-center justify-between gap-3")}>
        <Link href="/" className="font-semibold tracking-tight text-foreground">
          Tower
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          {isPending ? (
            <>
              <Skeleton className="h-8 w-16 rounded-md" aria-hidden />
              <Skeleton className="h-8 w-20 rounded-md" aria-hidden />
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link href="/sign-in">Sign in</Link>
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
