import Link from "next/link";
import type * as React from "react";

import { TOWER_PRIVACY_PATH, TOWER_TERMS_PATH } from "@/shared/lib/navigation/tower-marketing-paths";
import { cn } from "@/shared/lib/utils";

type TowerPublicFooterVariant = "default" | "marketing";
type TowerPublicFooterPlacement = "fixed" | "static";

/** Matches `py-3` plus single-line content — keep in sync with footer padding. */
export const TOWER_PUBLIC_FOOTER_HEIGHT_PX = 40;

type TowerPublicFooterProps = {
  variant?: TowerPublicFooterVariant;
  placement?: TowerPublicFooterPlacement;
  className?: string;
};

const footerLinkClassNames: Record<TowerPublicFooterVariant, string> = {
  default: "text-muted-foreground transition-colors hover:text-foreground",
  marketing: "text-neutral-500 transition-colors hover:text-neutral-300",
};

function TowerPublicFooterLink({
  href,
  variant,
  children,
}: {
  href: string;
  variant: TowerPublicFooterVariant;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={cn("text-xs", footerLinkClassNames[variant])}>
      {children}
    </Link>
  );
}

function TowerPublicFooter({ variant = "default", placement = "static", className }: TowerPublicFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer
      className={cn(
        "border-t",
        placement === "fixed" ? "fixed inset-x-0 bottom-0 z-[5] bg-background" : "relative",
        variant === "marketing" ? "border-white/10" : "border-border/60",
        className
      )}
    >
      <div
        className={cn(
          "mx-auto flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6",
          variant === "marketing" ? "w-full max-w-[90rem] sm:px-12 lg:px-20" : "max-w-6xl"
        )}
      >
        <p className={cn("text-xs", variant === "marketing" ? "text-neutral-500" : "text-muted-foreground")}>
          © {year} Codalyn
        </p>
        <nav aria-label="Legal" className="flex items-center gap-4">
          <TowerPublicFooterLink href={TOWER_TERMS_PATH} variant={variant}>
            Terms
          </TowerPublicFooterLink>
          <TowerPublicFooterLink href={TOWER_PRIVACY_PATH} variant={variant}>
            Privacy
          </TowerPublicFooterLink>
        </nav>
      </div>
    </footer>
  );
}

export { TowerPublicFooter };
