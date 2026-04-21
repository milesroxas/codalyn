"use client";

import { IconShieldLock } from "@tabler/icons-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { authClient } from "@/features/auth/model/auth-client";
import { OperatorShell } from "@/features/operator/ui/operator-shell";
import { isProductAdminAppRole } from "@/shared/lib/membership/product-admin-role";
import { Button } from "@/shared/ui/button";

export function OperatorGate({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const isProductAdmin = isProductAdminAppRole(session?.user?.role);

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <p className="text-sm text-zinc-400">Loading operator workspace…</p>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-zinc-950 px-4">
        <div className="max-w-md space-y-3 text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-amber-500/90">Tower operator</p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Sign in required</h1>
          <p className="text-sm text-zinc-400">
            Product administration is separate from the tenant workspace. Use an account with the{" "}
            <span className="font-mono text-xs text-zinc-300">product_admin</span> role.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link href="/sign-in?callbackUrl=/console">Sign in</Link>
          </Button>
          <Button variant="outline" className="border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-900" asChild>
            <Link href="/">Back to Tower</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!isProductAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-950 px-4">
        <div className="max-w-md rounded-xl border border-zinc-800 bg-zinc-900/80 p-8">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-zinc-800">
              <IconShieldLock className="size-5 text-zinc-400" aria-hidden />
            </span>
            <div className="min-w-0 space-y-2">
              <h1 className="text-lg font-semibold tracking-tight text-zinc-50">Access denied</h1>
              <p className="text-sm text-zinc-400">
                This workspace is only for product operators. Tenant roles and invitations are managed under Team.
              </p>
              <Button className="mt-3" variant="secondary" size="sm" asChild>
                <Link href="/team">Open Team</Link>
              </Button>
            </div>
          </div>
        </div>
        <Button variant="ghost" className="text-zinc-500 hover:text-zinc-300" asChild>
          <Link href="/">← Tower home</Link>
        </Button>
      </div>
    );
  }

  return <OperatorShell userEmail={session.user.email}>{children}</OperatorShell>;
}
