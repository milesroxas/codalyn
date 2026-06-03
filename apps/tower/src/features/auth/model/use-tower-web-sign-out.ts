"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { authClient } from "@/features/auth/model/auth-client";
import {
  isTowerPostSignOutExternalUrl,
  resolveTowerPostSignOutUrl,
} from "@/shared/lib/navigation/resolve-tower-post-sign-out-url";

export function useTowerWebSignOut() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = useCallback(async () => {
    setSigningOut(true);
    try {
      await authClient.signOut({ fetchOptions: { credentials: "include" } });
      const destination = resolveTowerPostSignOutUrl();
      if (isTowerPostSignOutExternalUrl(destination)) {
        window.location.assign(destination);
        return;
      }
      router.push(destination);
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }, [router]);

  return { signOut, signingOut };
}
