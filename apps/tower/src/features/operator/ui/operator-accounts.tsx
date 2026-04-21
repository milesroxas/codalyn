"use client";

import { IconUsers } from "@tabler/icons-react";
import { useState } from "react";
import { authClient } from "@/features/auth/model/auth-client";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

export function OperatorAccounts() {
  const [busy, setBusy] = useState(false);
  const [payload, setPayload] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onLoad = async () => {
    setError(null);
    setBusy(true);
    const res = await authClient.admin.listUsers({ query: { limit: 50 } });
    setBusy(false);
    if (res.error) {
      setError(res.error.message ?? "Could not list accounts");
      setPayload(null);
      return;
    }
    setPayload(JSON.stringify(res.data, null, 2));
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-widest text-amber-600 dark:text-amber-500/90">
          Operations
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Accounts</h1>
        <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Customer identities in Tower (admin API). Use for support, audits, and provisioning follow-up.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      ) : null}

      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <IconUsers className="size-5 text-zinc-500" aria-hidden />
            <CardTitle className="text-base">User directory</CardTitle>
          </div>
          <CardDescription>First page (limit 50). Shape matches Better Auth admin list response.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button type="button" size="sm" disabled={busy} onClick={() => void onLoad()}>
            {busy ? "Loading…" : "Load accounts"}
          </Button>
          {payload ? (
            <pre className="max-h-[min(28rem,60vh)] overflow-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3 font-mono text-[11px] leading-relaxed dark:border-zinc-800 dark:bg-zinc-900/60">
              {payload}
            </pre>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
