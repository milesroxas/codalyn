"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { TowerDeferredLoadingFallback } from "@/shared/ui/deferred-loading";
import { CompactRedirectSkeleton } from "@/shared/ui/page-loading-skeletons";

function ErrorInner() {
  const searchParams = useSearchParams();
  const popup = searchParams.get("popup");
  const error = searchParams.get("error");
  useEffect(() => {
    if (popup === "1" && window.opener) {
      window.opener.postMessage(
        { type: "codalyn:webflow-oauth", status: "error", error: error ?? "unknown" },
        window.location.origin
      );
      window.close();
    }
  }, [popup, error]);

  return (
    <main className="p-6">
      <p className="text-red-600">{messageForOAuthError(error)}</p>
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
      return "Only a workspace admin can connect Webflow. Ask an admin to connect, or close this window.";
    default:
      return "Webflow connection failed. You can close this window and try again from Tower.";
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
