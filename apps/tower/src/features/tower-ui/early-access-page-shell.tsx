import Link from "next/link";
import type * as React from "react";
import { AuthPageBackdrop } from "@/features/tower-ui/auth-page-backdrop";

export function EarlyAccessPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-background">
      <AuthPageBackdrop />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4">
        <header className="py-6">
          <Link href="/" className="text-sm font-semibold tracking-tight text-foreground">
            Tower
          </Link>
        </header>
        <main className="flex flex-1 flex-col justify-center pb-16 pt-2">{children}</main>
      </div>
    </div>
  );
}
