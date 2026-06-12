"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  readSessionEmailVerified,
  resolveTowerEmailVerificationCallbackUrl,
} from "@/features/auth/lib/email-verification";
import { authClient } from "@/features/auth/model/auth-client";
import { EmailVerificationBanner } from "@/features/auth/ui/email-verification-prompt";
import { TEAM_INVITATION_ACCEPT_PATH } from "@/shared/lib/membership/team-invitation-accept";
import { sanitizeRelativePath } from "@/shared/lib/navigation/sanitize-relative-path";

function TowerEmailVerificationBannerInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session, isPending } = authClient.useSession();
  const callbackPath = resolveTowerEmailVerificationCallbackUrl(
    sanitizeRelativePath(pathname, searchParams.toString() ? `?${searchParams.toString()}` : "")
  );

  if (isPending || !session?.user) {
    return null;
  }

  if (readSessionEmailVerified(session.user)) {
    return null;
  }

  if (pathname.startsWith(TEAM_INVITATION_ACCEPT_PATH)) {
    return null;
  }

  return <EmailVerificationBanner email={session.user.email} callbackPath={callbackPath} />;
}

export function TowerEmailVerificationBanner() {
  return (
    <Suspense fallback={null}>
      <TowerEmailVerificationBannerInner />
    </Suspense>
  );
}
