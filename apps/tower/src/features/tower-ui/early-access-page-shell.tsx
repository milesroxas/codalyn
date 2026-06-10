import type * as React from "react";
import { AuthPageFrame } from "@/features/tower-ui/auth-page-frame";

export function EarlyAccessPageShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthPageFrame className="bg-background">
      <div className="relative mx-auto flex h-full w-full max-w-lg flex-col justify-center px-4 py-10 sm:py-12">
        <main className="flex flex-col">{children}</main>
      </div>
    </AuthPageFrame>
  );
}
