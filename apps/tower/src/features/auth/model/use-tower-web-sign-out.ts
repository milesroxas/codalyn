"use client";

import { useCallback } from "react";
import { authClient } from "@/features/auth/model/auth-client";
import {
  completeTowerWebSignOutNavigation,
  setTowerSignOutTransition,
  useTowerSignOutTransition,
} from "@/features/auth/model/tower-sign-out-transition";

export function useTowerWebSignOut() {
  const signingOut = useTowerSignOutTransition();

  const signOut = useCallback(async () => {
    setTowerSignOutTransition(true);
    try {
      await authClient.signOut({ fetchOptions: { credentials: "include" } });
      await completeTowerWebSignOutNavigation();
    } catch {
      setTowerSignOutTransition(false);
    }
  }, []);

  return { signOut, signingOut };
}
