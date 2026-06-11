"use client";

import { usePathname } from "next/navigation";
import type * as React from "react";
import { AuthPageBackButton } from "@/features/tower-ui/auth-page-back-button";
import { AuthPageBackdrop } from "@/features/tower-ui/auth-page-backdrop";
import { AuthSurfaceLegalNotice } from "@/features/tower-ui/auth-surface-legal-notice";
import { cn } from "@/shared/lib/utils";

const authShellContentWidths = {
  md: "max-w-md",
  lg: "max-w-lg",
} as const;

type AuthShellContentWidth = keyof typeof authShellContentWidths;

type AuthShellLegalNoticeVariant = "signIn" | "signUp" | "generic";

function resolveAuthShellLegalNoticeVariant(pathname: string): AuthShellLegalNoticeVariant {
  if (pathname === "/sign-in" || pathname.startsWith("/sign-in/")) {
    return "signIn";
  }
  if (pathname === "/sign-up" || pathname.startsWith("/sign-up/")) {
    return "signUp";
  }
  return "generic";
}

type AuthShellProps = {
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  contentWidth?: AuthShellContentWidth;
  legalNoticeVariant?: AuthShellLegalNoticeVariant;
  className?: string;
};

export function AuthShell({
  children,
  backHref = "/",
  backLabel = "Back",
  contentWidth = "md",
  legalNoticeVariant,
  className,
}: AuthShellProps) {
  const pathname = usePathname();
  const resolvedLegalNoticeVariant = legalNoticeVariant ?? resolveAuthShellLegalNoticeVariant(pathname);

  return (
    <div className={cn("relative min-h-dvh bg-background", className)}>
      <AuthPageBackdrop />
      <div className="absolute left-0 top-0 z-10 px-4 py-4 sm:px-6">
        <AuthPageBackButton href={backHref} label={backLabel} />
      </div>
      <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-16 sm:px-6 sm:py-20">
        <div className={cn("w-full", authShellContentWidths[contentWidth])}>
          {children}
          <AuthSurfaceLegalNotice variant={resolvedLegalNoticeVariant} />
        </div>
      </div>
    </div>
  );
}
