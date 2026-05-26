"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { CompactRedirectSkeleton } from "@/shared/ui/page-loading-skeletons";

function ErrorInner() {
  const searchParams = useSearchParams();
  const popup = searchParams.get("popup");
  const error = searchParams.get("error");
  const detail = searchParams.get("detail") ?? searchParams.get("error_description");

  useEffect(() => {
    if (popup === "1" && window.opener) {
      window.opener.postMessage(
        { type: "codalyn:webflow-oauth", status: "error", error: error ?? "unknown", detail },
        window.location.origin
      );
      window.close();
    }
  }, [popup, error, detail]);

  return (
    <main className="p-6">
      <p className="text-red-600">Webflow connection failed{error ? `: ${error}` : ""}</p>
      {detail ? <p className="mt-2 text-sm text-neutral-600">{detail}</p> : null}
    </main>
  );
}

export default function WebflowOAuthErrorPage() {
  return (
    <Suspense fallback={<CompactRedirectSkeleton />}>
      <ErrorInner />
    </Suspense>
  );
}
