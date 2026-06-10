"use client";

import { useDeferredLoadingIndicator } from "@codalyn/webflow-kit/react";
import { useEffect, useState } from "react";
import { authClient } from "@/features/auth/model/auth-client";
import type { TowerLandingAppLinks } from "@/features/tower-ui/tower-landing";
import { TOWER_PRODUCT_MARKETING_PATH } from "@/shared/lib/navigation/tower-marketing-paths";
import { TowerPublicHeader, TowerPublicHeaderSpacer } from "@/shared/ui/tower-public-header";
import { TowerPublicHeaderAuthActionsSkeleton } from "@/shared/ui/tower-public-header-auth-actions";

type TowerLoggedOutHeaderProps = {
  publicHeaderLinks?: Pick<TowerLandingAppLinks, "beacon" | "flint" | "signIn" | "tower">;
};

export function TowerLoggedOutHeader({ publicHeaderLinks }: TowerLoggedOutHeaderProps) {
  const { isPending } = authClient.useSession();
  const showHeaderSkeleton = useDeferredLoadingIndicator(isPending);
  const [earlyAccessRequired, setEarlyAccessRequired] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/account/access-policy", { credentials: "same-origin" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { earlyAccessRequired?: boolean } | null) => {
        if (!cancelled) {
          setEarlyAccessRequired(Boolean(data?.earlyAccessRequired));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEarlyAccessRequired(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const primaryCtaHref = earlyAccessRequired ? "/request-access" : "/sign-up";
  const primaryCtaLabel = earlyAccessRequired ? "Early Access" : "Sign up";

  const signInHref = publicHeaderLinks?.signIn ?? "/sign-in";
  const beaconHref = publicHeaderLinks?.beacon ?? "/beacon";
  const flintHref = publicHeaderLinks?.flint ?? "/flint";
  const towerHref = publicHeaderLinks?.tower ?? TOWER_PRODUCT_MARKETING_PATH;

  return (
    <>
      <TowerPublicHeader
        beaconHref={beaconHref}
        flintHref={flintHref}
        signInHref={signInHref}
        primaryCtaHref={primaryCtaHref}
        primaryCtaLabel={primaryCtaLabel}
        towerHref={towerHref}
        actions={showHeaderSkeleton || isPending ? <TowerPublicHeaderAuthActionsSkeleton /> : undefined}
      />
      <TowerPublicHeaderSpacer />
    </>
  );
}
