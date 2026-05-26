"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { CompactRedirectSkeleton } from "@/shared/ui/page-loading-skeletons";

function SuccessInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const popup = searchParams.get("popup");

  useEffect(() => {
    if (popup === "1" && window.opener) {
      window.opener.postMessage({ type: "codalyn:webflow-oauth", status: "success" }, window.location.origin);
      window.close();
      return;
    }
    router.replace("/webflow?webflow=connected");
  }, [popup, router]);

  return (
    <main className="p-6">
      <p className="text-sm text-muted-foreground">Webflow is connected. Redirecting…</p>
    </main>
  );
}

export default function WebflowOAuthSuccessPage() {
  return (
    <Suspense fallback={<CompactRedirectSkeleton />}>
      <SuccessInner />
    </Suspense>
  );
}
