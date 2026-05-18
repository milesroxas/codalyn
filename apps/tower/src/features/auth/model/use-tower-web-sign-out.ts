"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { authClient } from "@/features/auth/model/auth-client";

export function useTowerWebSignOut() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = useCallback(async () => {
    setSigningOut(true);
    try {
      await authClient.signOut({ fetchOptions: { credentials: "include" } });
      router.push("/");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }, [router]);

  return { signOut, signingOut };
}
