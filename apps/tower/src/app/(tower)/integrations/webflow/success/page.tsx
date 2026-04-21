"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

function SuccessInner() {
  const searchParams = useSearchParams();
  const popup = searchParams.get("popup");

  useEffect(() => {
    if (popup === "1" && window.opener) {
      window.opener.postMessage({ type: "codalyn:webflow-oauth", status: "success" }, "*");
      window.close();
    }
  }, [popup]);

  return (
    <main className="p-6">
      <p>Webflow is connected. You can close this window.</p>
    </main>
  );
}

export default function WebflowOAuthSuccessPage() {
  return (
    <Suspense fallback={<p className="p-6">Loading…</p>}>
      <SuccessInner />
    </Suspense>
  );
}
