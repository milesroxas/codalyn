"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { authClient } from "@/features/auth/model/auth-client";
import { useTowerSignOutTransition } from "@/features/auth/model/tower-sign-out-transition";

/**
 * Reconciles the client Better Auth session with the server-rendered auth state.
 *
 * Better Auth broadcasts session changes across tabs (localStorage + focus refetch), so a
 * sign-out or sign-in in another tab flips the client session under a page that was
 * server-rendered for the opposite state. Chrome and page content always follow the server
 * render (`TowerAppShell`), so on divergence this triggers `router.refresh()` and lets the
 * server decide the outcome: middleware and page guards redirect protected paths to sign-in,
 * public paths re-render in the correct auth state.
 */
export function TowerSessionSync({ serverSignedIn }: { serverSignedIn: boolean }) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const signingOut = useTowerSignOutTransition();
  const clientSignedIn = Boolean(session?.user);

  useEffect(() => {
    // This tab's own sign-out already navigates via `completeTowerWebSignOutNavigation`.
    if (isPending || signingOut || clientSignedIn === serverSignedIn) {
      return;
    }
    router.refresh();
  }, [isPending, signingOut, clientSignedIn, serverSignedIn, router]);

  return null;
}
