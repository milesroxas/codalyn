"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { authClient } from "@/features/auth/model/auth-client";

export function TowerLandingAuthSync({ serverSignedIn }: { serverSignedIn: boolean }) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const refreshedRef = useRef(false);

  useEffect(() => {
    if (serverSignedIn || isPending || !session?.user || refreshedRef.current) {
      return;
    }
    refreshedRef.current = true;
    router.refresh();
  }, [serverSignedIn, isPending, session?.user, router]);

  return null;
}
