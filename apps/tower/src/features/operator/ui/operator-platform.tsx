"use client";

import { IconActivity, IconExternalLink } from "@tabler/icons-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";
import { Separator } from "@/shared/ui/separator";

export function OperatorPlatform() {
  const [raw, setRaw] = useState<string | null>(null);
  const [status, setStatus] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/health", { credentials: "include" });
        const text = await res.text();
        if (!cancelled) {
          setStatus(res.status);
          setRaw(text);
        }
      } catch {
        if (!cancelled) {
          setStatus(0);
          setRaw(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-amber-600 dark:text-amber-500/90">
          Infrastructure
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Platform</h1>
        <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Health endpoints and integration surfaces you can wire to uptime monitors, deploy hooks, and on-call.
        </p>
      </div>

      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <IconActivity className="size-5 text-zinc-500" aria-hidden />
            <CardTitle className="text-base">Health probe</CardTitle>
          </div>
          <CardDescription>
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-800">
              GET /api/health
            </code>
            {status !== null ? <span className="ml-2 text-foreground">· HTTP {status}</span> : null}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {raw ? (
            <pre className="max-h-64 overflow-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs leading-relaxed dark:border-zinc-800 dark:bg-zinc-900/60">
              {raw}
            </pre>
          ) : (
            <p className="text-sm text-zinc-500">Loading…</p>
          )}
        </CardContent>
        <CardFooter className="flex flex-wrap justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800">
          <Button variant="outline" size="sm" asChild>
            <a href="/api/health" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5">
              Open in new tab
              <IconExternalLink className="size-3.5" aria-hidden />
            </a>
          </Button>
        </CardFooter>
      </Card>

      <Separator />

      <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
        <p className="font-medium text-zinc-900 dark:text-zinc-200">Webflow Data API</p>
        <p>
          Tenant OAuth and proxy routes are shared with Beacon. Authorize users from the{" "}
          <Link href="/" className="text-foreground underline underline-offset-4">
            Tower workspace
          </Link>{" "}
          home when testing end-to-end.
        </p>
      </div>
    </div>
  );
}
