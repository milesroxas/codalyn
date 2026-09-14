"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { TowerDeferredLoadingFallback } from "@/shared/ui/deferred-loading";
import { CompactRedirectSkeleton } from "@/shared/ui/page-loading-skeletons";

function ErrorInner() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  // `popup=1` = cookie-less flow. Tower's own dashboard popup has an opener: notify it and close. The
  // Beacon Designer extension reaches here through a plain `<a target="_blank" rel="noopener">` link
  // (it opens no windows), so there is no opener — the user reads the message and retries from the
  // Designer.
  const cookielessFlow = searchParams.get("popup") === "1";
  const [openerless, setOpenerless] = useState(false);
  useEffect(() => {
    if (!cookielessFlow) {
      return;
    }
    if (window.opener) {
      window.opener.postMessage(
        { type: "codalyn:webflow-oauth", status: "error", error: error ?? "unknown" },
        window.location.origin
      );
      window.close();
      return;
    }
    setOpenerless(true);
  }, [cookielessFlow, error]);

  return (
    <main className="p-6">
      <p className="text-red-600">{messageForOAuthError(error)}</p>
      {openerless ? (
        <p className="mt-2 text-sm text-muted-foreground">Close this tab and try again from the Webflow Designer.</p>
      ) : null}
    </main>
  );
}

/** Callback error code → short, actionable copy; unknown codes fall back to the generic message. */
function messageForOAuthError(error: string | null): string {
  switch (error) {
    case "identity_mismatch":
      return "The Webflow account that approved this connection is not the one that started it. Start the connection again from your own Webflow Designer session.";
    case "state_expired":
      return "This connection link expired. Start the connection again and approve it within 10 minutes.";
    case "team_admin_required":
      return "Only a workspace admin can connect Webflow. Ask an admin to connect, or close this tab.";
    default:
      return "Webflow connection failed. You can close this tab and try again.";
  }
}

export default function WebflowOAuthErrorPage() {
  return (
    <Suspense
      fallback={
        <TowerDeferredLoadingFallback>
          <CompactRedirectSkeleton />
        </TowerDeferredLoadingFallback>
      }
    >
      <ErrorInner />
    </Suspense>
  );
}
