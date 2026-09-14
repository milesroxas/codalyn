"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { towerConnectionPathWithStatus } from "@/shared/lib/navigation/tower-app-paths";
import { TowerDeferredLoadingFallback } from "@/shared/ui/deferred-loading";
import { CompactRedirectSkeleton } from "@/shared/ui/page-loading-skeletons";

/**
 * `popup=1` marks the cookie-less (DB-state) flow, reached two ways:
 *
 * - Tower's own dashboard popup (`use-tower-webflow-oauth-popup.ts`): this window has an opener at
 *   the Tower origin — notify it and close.
 * - The Beacon Designer extension: it links to Webflow's consent screen with a plain
 *   `<a target="_blank" rel="noopener">` (the extension opens no windows — Marketplace popup
 *   guidance), so there is no opener to notify and no cookie session to land in; the extension
 *   polls Tower for the grant itself. Show a static "return to the Designer" note — a scripted
 *   `window.close()` is not permitted on a tab the browser opened for a link.
 *
 * Without `popup=1` (dashboard cookie flow) the page redirects into the connection screen.
 */
function SuccessInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cookielessFlow = searchParams.get("popup") === "1";
  const [openerless, setOpenerless] = useState(false);

  useEffect(() => {
    if (cookielessFlow) {
      if (window.opener) {
        window.opener.postMessage({ type: "codalyn:webflow-oauth", status: "success" }, window.location.origin);
        window.close();
        return;
      }
      setOpenerless(true);
      return;
    }
    router.replace(towerConnectionPathWithStatus("connected"));
  }, [cookielessFlow, router]);

  if (openerless) {
    return (
      <main className="p-6">
        <p className="text-sm text-foreground">Webflow is connected.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          You can close this tab and return to the Webflow Designer — Beacon picks up the connection automatically.
        </p>
      </main>
    );
  }

  return (
    <main className="p-6">
      <p className="text-sm text-muted-foreground">Webflow is connected. Redirecting…</p>
    </main>
  );
}

export default function WebflowOAuthSuccessPage() {
  return (
    <Suspense
      fallback={
        <TowerDeferredLoadingFallback>
          <CompactRedirectSkeleton />
        </TowerDeferredLoadingFallback>
      }
    >
      <SuccessInner />
    </Suspense>
  );
}
