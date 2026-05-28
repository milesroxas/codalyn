import Link from "next/link";
import type * as React from "react";
import { AuthPageFrame } from "@/features/tower-ui/auth-page-frame";

export function EarlyAccessPageShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthPageFrame className="bg-background">
      <div className="relative mx-auto flex h-full w-full max-w-lg flex-col px-4">
        <header className="py-6">
          <Link href="/" className="text-sm font-semibold tracking-tight text-foreground">
            Tower
          </Link>
        </header>
        <main className="flex flex-1 flex-col justify-center pb-16 pt-2">{children}</main>
      </div>
    </AuthPageFrame>
  );
}
