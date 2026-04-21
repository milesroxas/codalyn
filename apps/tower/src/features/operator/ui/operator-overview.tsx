"use client";

import { IconArrowUpRight, IconBuildingCommunity, IconPlug, IconUsers } from "@tabler/icons-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";

export function OperatorOverview() {
  const [healthText, setHealthText] = useState<string | null>(null);
  const [healthOk, setHealthOk] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/health", { credentials: "include" });
        const text = await res.text();
        if (!cancelled) {
          setHealthOk(res.ok);
          setHealthText(text.slice(0, 280) + (text.length > 280 ? "…" : ""));
        }
      } catch {
        if (!cancelled) {
          setHealthOk(false);
          setHealthText("Request failed");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-amber-600 dark:text-amber-500/90">
          Product & platform
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Overview</h1>
        <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Run the SaaS: customer accounts, infrastructure checks, and handoffs to tenant workspace administration.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader className="pb-2">
            <CardDescription>API health</CardDescription>
            <div className="flex items-center gap-2 pt-1">
              {healthOk === null ? (
                <Badge variant="secondary">Checking…</Badge>
              ) : healthOk ? (
                <Badge>OK</Badge>
              ) : (
                <Badge variant="destructive">Issue</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <p className="line-clamp-4 font-mono text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
              {healthText ?? "—"}
            </p>
          </CardContent>
          <CardFooter className="justify-end border-t border-zinc-100 pt-3 dark:border-zinc-800">
            <Button variant="outline" size="sm" asChild>
              <Link href="/console/platform">Platform tools</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader className="pb-2">
            <CardDescription>Accounts</CardDescription>
            <CardTitle className="text-base text-zinc-900 dark:text-zinc-50">Tower users</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              List and inspect user records via the admin API for support and compliance workflows.
            </p>
          </CardContent>
          <CardFooter className="justify-end border-t border-zinc-100 pt-3 dark:border-zinc-800">
            <Button size="sm" asChild>
              <Link href="/console/accounts" className="inline-flex items-center gap-1">
                Open accounts
                <IconArrowUpRight className="size-3.5 opacity-70" aria-hidden />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader className="pb-2">
            <CardDescription>Tenants</CardDescription>
            <CardTitle className="text-base text-zinc-900 dark:text-zinc-50">Workspaces</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Customer sign-up invites and workspace eligibility are under Accounts. Invites to an existing team and
              seat limits are managed in Team.
            </p>
          </CardContent>
          <CardFooter className="justify-end border-t border-zinc-100 pt-3 dark:border-zinc-800">
            <Button variant="outline" size="sm" asChild>
              <Link href="/team" className="inline-flex items-center gap-1">
                Team
                <IconBuildingCommunity className="size-3.5 opacity-70" aria-hidden />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Card className="border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/40">
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-zinc-200/80 dark:bg-zinc-800">
              <IconPlug className="size-4 text-zinc-700 dark:text-zinc-300" aria-hidden />
            </span>
            <div>
              <CardTitle className="text-base">Business context</CardTitle>
              <CardDescription>
                Billing, plan limits, and feature entitlements are enforced server-side and in your deployment
                configuration — not in this UI yet.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-zinc-600 dark:text-zinc-400">
          <p>
            Use <span className="font-mono text-xs">Accounts</span> for identity support,{" "}
            <span className="font-mono text-xs">Platform</span> for probes and integrations, and{" "}
            <span className="font-mono text-xs">Team</span> when you need to act inside a tenant workspace.
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href="/console/accounts" className="inline-flex items-center gap-2">
            <IconUsers className="size-4" aria-hidden />
            Accounts
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/">Tower home</Link>
        </Button>
      </div>
    </div>
  );
}
