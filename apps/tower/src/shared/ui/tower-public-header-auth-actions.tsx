import Link from "next/link";

import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";

function resolveTowerPublicHeaderMobileCtaLabel(label: string): string {
  if (label === "Early Access") {
    return "Access";
  }

  return label;
}

type TowerPublicHeaderAuthActionsProps = {
  signInHref: string;
  primaryCtaHref: string;
  primaryCtaLabel: string;
  className?: string;
};

function TowerPublicHeaderAuthActions({
  signInHref,
  primaryCtaHref,
  primaryCtaLabel,
  className,
}: TowerPublicHeaderAuthActionsProps) {
  const mobileCtaLabel = resolveTowerPublicHeaderMobileCtaLabel(primaryCtaLabel);

  return (
    <>
      <div
        className={cn("hidden items-center gap-2 rounded-sm bg-[#52525240] p-2 backdrop-blur-sm md:flex", className)}
      >
        <Button variant="marketing-nav-ghost" size="default" asChild>
          <Link href={signInHref}>Sign in</Link>
        </Button>
        <Button variant="marketing-nav-cta" size="default" asChild>
          <Link href={primaryCtaHref}>{primaryCtaLabel}</Link>
        </Button>
      </div>

      <div className={cn("flex shrink-0 items-center md:hidden", className)}>
        <Button variant="marketing-nav-cta" size="sm" asChild>
          <Link href={primaryCtaHref}>{mobileCtaLabel}</Link>
        </Button>
      </div>
    </>
  );
}

function TowerPublicHeaderAuthActionsSkeleton({ className }: { className?: string }) {
  return (
    <>
      <div className={cn("hidden items-center gap-2 md:flex", className)} aria-hidden>
        <div className="h-8 w-16 rounded-sm bg-white/20" />
        <div className="h-8 w-24 rounded-sm bg-white/30" />
      </div>
      <div className={cn("h-7 w-16 rounded-sm bg-white/30 md:hidden", className)} aria-hidden />
    </>
  );
}

export { TowerPublicHeaderAuthActions, TowerPublicHeaderAuthActionsSkeleton };
