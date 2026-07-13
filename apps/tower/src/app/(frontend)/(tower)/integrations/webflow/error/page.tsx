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
      <p className="text-red-600">Webflow connection failed. You can close this window and try again from Tower.</p>
    </main>
  );
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
