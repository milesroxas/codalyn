"use client";

import { useDeferredLoadingIndicator } from "@codalyn/webflow-kit/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useRedirectAuthenticatedFromAuthSurface } from "@/features/auth/model/use-redirect-authenticated-from-auth-surface";
import { EarlyAccessRequestForm } from "@/features/auth/ui/early-access-request-form";
import { EarlyAccessRequestFormSkeletonPage } from "@/features/auth/ui/early-access-request-form-skeleton";
import { EarlyAccessPageShell } from "@/features/tower-ui/early-access-page-shell";
import { resolveTowerEarlyAccessRequired } from "@/shared/lib/access/access-policy";
import {
  EARLY_ACCESS_REQUEST_PAGE_SIGN_UP_CTA,
  EARLY_ACCESS_REQUEST_PAGE_UNAVAILABLE,
} from "@/shared/lib/access/early-access-copy";
import { sanitizeRelativePath } from "@/shared/lib/navigation/sanitize-relative-path";
import { TowerDeferredLoadingFallback } from "@/shared/ui/deferred-loading";

function RequestAccessLoading() {
  return <EarlyAccessRequestFormSkeletonPage />;
}

function RequestAccessContent() {
  const searchParams = useSearchParams();
  const callbackUrl = sanitizeRelativePath(searchParams.get("callbackUrl") ?? "/");
  const { sessionPending, redirecting: redirectingSignedInUser } = useRedirectAuthenticatedFromAuthSurface({
    callbackUrl,
  });
  const [available, setAvailable] = useState<boolean | null>(null);

  const signInHref = `/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/account/access-policy", { credentials: "same-origin" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: unknown) => {
        if (!cancelled) {
          setAvailable(resolveTowerEarlyAccessRequired(data));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAvailable(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const authBusy = sessionPending || redirectingSignedInUser || available === null;
  const showAuthSkeleton = useDeferredLoadingIndicator(authBusy);
  if (showAuthSkeleton) {
    return <EarlyAccessRequestFormSkeletonPage />;
  }
  if (authBusy) {
    return null;
  }

  if (!available) {
    return (
      <EarlyAccessPageShell>
        <p className="text-sm text-muted-foreground">
          {EARLY_ACCESS_REQUEST_PAGE_UNAVAILABLE}{" "}
          <Link href="/sign-up" className="font-medium text-foreground underline-offset-4 hover:underline">
            {EARLY_ACCESS_REQUEST_PAGE_SIGN_UP_CTA}
          </Link>
        </p>
      </EarlyAccessPageShell>
    );
  }

  return (
    <EarlyAccessPageShell>
      <EarlyAccessRequestForm signInHref={signInHref} />
    </EarlyAccessPageShell>
  );
}

export default function RequestAccessPage() {
  return (
    <Suspense
      fallback={
        <TowerDeferredLoadingFallback>
          <RequestAccessLoading />
        </TowerDeferredLoadingFallback>
      }
    >
      <RequestAccessContent />
    </Suspense>
  );
}
