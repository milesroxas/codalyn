"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  EMAIL_VERIFICATION_FAILED_TOAST,
  EMAIL_VERIFIED_TOAST,
  readEmailVerificationRedirectError,
  readSessionEmailVerified,
  TOWER_EMAIL_VERIFIED_QUERY,
} from "@/features/auth/lib/email-verification";
import { authClient } from "@/features/auth/model/auth-client";
import { EmailVerificationBanner } from "@/features/auth/ui/email-verification-prompt";

function TowerEmailVerificationBannerInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const notifiedRef = useRef(false);
  const { data: session, isPending, refetch } = authClient.useSession();

  useEffect(() => {
    if (notifiedRef.current) {
      return;
    }
    const verificationError = readEmailVerificationRedirectError(searchParams);
    const verifiedQuery = searchParams.has(TOWER_EMAIL_VERIFIED_QUERY);
    if (!verificationError && !verifiedQuery) {
      return;
    }
    notifiedRef.current = true;
    if (verificationError) {
      toast.error(EMAIL_VERIFICATION_FAILED_TOAST.title, {
        description: EMAIL_VERIFICATION_FAILED_TOAST.description,
      });
    } else {
      toast.success(EMAIL_VERIFIED_TOAST.title, { description: EMAIL_VERIFIED_TOAST.description });
      void refetch();
    }
    const url = new URL(window.location.href);
    url.searchParams.delete(TOWER_EMAIL_VERIFIED_QUERY);
    url.searchParams.delete("error");
    router.replace(`${url.pathname}${url.search}`, { scroll: false });
  }, [refetch, router, searchParams]);

  if (isPending || !session?.user) {
    return null;
  }

  if (readSessionEmailVerified(session.user)) {
    return null;
  }

  return <EmailVerificationBanner email={session.user.email} />;
}

export function TowerEmailVerificationBanner() {
  return (
    <Suspense fallback={null}>
      <TowerEmailVerificationBannerInner />
    </Suspense>
  );
}
