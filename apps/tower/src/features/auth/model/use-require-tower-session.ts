"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { buildTowerSignInHref } from "@/features/auth/lib/build-tower-sign-in-href";
import { authClient } from "@/features/auth/model/auth-client";

export function useRequireTowerSession(callbackPath: string): {
  session: ReturnType<typeof authClient.useSession>["data"];
  sessionPending: boolean;
  refetch: ReturnType<typeof authClient.useSession>["refetch"];
} {
  const router = useRouter();
  const signInHref = buildTowerSignInHref(callbackPath);
  const { data: session, isPending: sessionPending, refetch } = authClient.useSession();
  const missingSession = !sessionPending && !session?.user;
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (!missingSession || redirectedRef.current) {
      return;
    }
    redirectedRef.current = true;
    router.replace(signInHref);
  }, [missingSession, signInHref, router]);

  return {
    session,
    sessionPending: sessionPending || missingSession,
    refetch,
  };
}
