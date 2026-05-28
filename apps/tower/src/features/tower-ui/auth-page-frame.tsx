import type * as React from "react";
import { AuthPageBackdrop } from "@/features/tower-ui/auth-page-backdrop";
import { cn } from "@/shared/lib/utils";

export function AuthPageFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("relative h-dvh overflow-hidden", className)}>
      <AuthPageBackdrop />
      {children}
    </div>
  );
}
