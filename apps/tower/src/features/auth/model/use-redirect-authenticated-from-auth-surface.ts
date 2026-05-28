"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { readSessionEmailVerified } from "@/features/auth/lib/email-verification";
import { resolvePostAuthRedirectTarget } from "@/features/auth/lib/resolve-post-auth-redirect";
import { authClient } from "@/features/auth/model/auth-client";
import { sanitizeRelativePath } from "@/shared/lib/navigation/sanitize-relative-path";

type UseRedirectAuthenticatedFromAuthSurfaceOptions = {
  callbackUrl: string;
  beaconOrigin: string | null;
};

export function useRedirectAuthenticatedFromAuthSurface({
  callbackUrl,
  beaconOrigin,
}: UseRedirectAuthenticatedFromAuthSurfaceOptions): {
  sessionPending: boolean;
  redirecting: boolean;
} {
  const router = useRouter();
  const safeCallbackUrl = sanitizeRelativePath(callbackUrl);
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const redirecting = Boolean(session?.user && readSessionEmailVerified(session.user) && !beaconOrigin);

  useEffect(() => {
    if (beaconOrigin || sessionPending || !session?.user || !readSessionEmailVerified(session.user)) {
      return;
    }
    router.replace(resolvePostAuthRedirectTarget(session.user, safeCallbackUrl));
  }, [beaconOrigin, sessionPending, session?.user, safeCallbackUrl, router]);

  return { sessionPending, redirecting };
}
