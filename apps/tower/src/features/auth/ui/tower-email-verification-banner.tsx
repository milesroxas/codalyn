"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { toast } from "sonner";
import { readSessionEmailVerified, TOWER_EMAIL_VERIFIED_QUERY } from "@/features/auth/lib/email-verification";
import { authClient } from "@/features/auth/model/auth-client";
import { EmailVerificationBanner } from "@/features/auth/ui/email-verification-prompt";

function TowerEmailVerificationBannerInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const notifiedRef = useRef(false);
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (notifiedRef.current || !searchParams.has(TOWER_EMAIL_VERIFIED_QUERY)) {
      return;
    }
    notifiedRef.current = true;
    toast.success("Email verified", { description: "Your Tower email address is confirmed." });
    const url = new URL(window.location.href);
    url.searchParams.delete(TOWER_EMAIL_VERIFIED_QUERY);
    router.replace(`${url.pathname}${url.search}`, { scroll: false });
  }, [router, searchParams]);

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
