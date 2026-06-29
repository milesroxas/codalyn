"use client";

import { useDeferredLoadingIndicator } from "@codalyn/webflow-kit/react";
import { IconShieldLock } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useRef } from "react";
import { authClient } from "@/features/auth/model/auth-client";
import { useTowerSignOutTransition } from "@/features/auth/model/tower-sign-out-transition";
import { OperatorShell } from "@/features/operator/ui/operator-shell";
import { isProductAdminAppRole } from "@/shared/lib/membership/product-admin-role";
import { Button } from "@/shared/ui/button";
import { OperatorGateSkeleton } from "@/shared/ui/page-loading-skeletons";

export function OperatorGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const signingOut = useTowerSignOutTransition();
  const { data: session, isPending } = authClient.useSession();
  const lastOperatorUserRef = useRef<{ email: string; name: string } | null>(null);
  const isProductAdmin = isProductAdminAppRole(session?.user?.role);
  const operatorSignInHref = `/sign-in?callbackUrl=${encodeURIComponent(pathname || "/console")}`;
  const showGateLoading = useDeferredLoadingIndicator(isPending);

  if (session?.user) {
    lastOperatorUserRef.current = {
      email: session.user.email,
      name: session.user.name ?? "",
    };
  }

  const lastOperatorUser = lastOperatorUserRef.current;
  if (signingOut && lastOperatorUser) {
    return (
      <OperatorShell userEmail={lastOperatorUser.email} userName={lastOperatorUser.name}>
        {children}
      </OperatorShell>
    );
  }
  if (showGateLoading) {
    return <OperatorGateSkeleton />;
  }
  if (isPending) {
    return null;
  }

  if (!session?.user) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-4">
        <div className="max-w-md space-y-3 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Tower · Operator</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Sign in required</h1>
          <p className="text-sm text-muted-foreground">
            The operator console is a separate surface from the tenant workspace. Sign in with an account that has the{" "}
            <span className="font-mono text-xs">product_admin</span> role.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link href={operatorSignInHref}>Sign in</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">Back to Tower</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!isProductAdmin) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-4">
        <div className="max-w-md rounded-sm border border-border bg-card p-6">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-muted">
              <IconShieldLock className="size-5 text-muted-foreground" aria-hidden />
            </span>
            <div className="min-w-0 space-y-2">
              <h1 className="text-lg font-semibold tracking-tight text-foreground">Access denied</h1>
              <p className="text-sm text-muted-foreground">
                The operator console is only available to SaaS operators. Tenant workspace roles are managed under Team.
              </p>
              <Button className="mt-3" variant="secondary" size="sm" asChild>
                <Link href="/team">Open Team</Link>
              </Button>
            </div>
          </div>
        </div>
        <Button variant="ghost" asChild>
          <Link href="/">← Tower home</Link>
        </Button>
      </div>
    );
  }

  return (
    <OperatorShell userEmail={session.user.email} userName={session.user.name ?? ""}>
      {children}
    </OperatorShell>
  );
}
