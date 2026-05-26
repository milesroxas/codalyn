"use client";

import {
  IconAlertTriangle,
  IconArrowRight,
  IconBuilding,
  IconCircleCheck,
  IconExternalLink,
  IconKey,
  IconRefresh,
  IconUserCheck,
  IconUsers,
} from "@tabler/icons-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { OperatorApiError, operatorApi } from "@/features/operator/api/client";
import { appRoleLabel, formatRelative, initialsFor } from "@/features/operator/model/format";
import type { OperatorMetrics } from "@/server/operator/types";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";
import { StatTile } from "@/shared/ui/stat-tile";

export function OperatorOverview() {
  const [metrics, setMetrics] = useState<OperatorMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [healthOk, setHealthOk] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [m, healthRes] = await Promise.all([
        operatorApi.metrics(),
        fetch("/api/health", { credentials: "include" })
          .then((r) => r.ok)
          .catch(() => false),
      ]);
      setMetrics(m);
      setHealthOk(Boolean(healthRes));
    } catch (err) {
      setError(err instanceof OperatorApiError ? err.message : "Could not load metrics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = metrics?.totals;
  const activity = metrics?.activity;

  const nf = useMemo(() => new Intl.NumberFormat(), []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Operator</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Overview</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Product-wide signal: customers, workspaces, integrations, and platform health.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={loading}
            className="gap-1.5"
          >
            <IconRefresh className={loading ? "size-4 animate-spin" : "size-4"} />
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <PrimaryStats totals={totals} activity={activity} loading={loading} nf={nf} />
      <SecondaryStats totals={totals} loading={loading} nf={nf} />

      <div className="grid gap-4 lg:grid-cols-2">
        <RecentCustomers users={metrics?.recentUsers ?? []} loading={loading} />
        <RecentWorkspaces workspaces={metrics?.recentWorkspaces ?? []} loading={loading} />
      </div>

      <HealthCard healthOk={healthOk} />
    </div>
  );
}

function PrimaryStats({
  totals,
  activity,
  loading,
  nf,
}: {
  totals: OperatorMetrics["totals"] | undefined;
  activity: OperatorMetrics["activity"] | undefined;
  loading: boolean;
  nf: Intl.NumberFormat;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {loading || !totals ? (
        Array.from({ length: 4 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeletons
          <Card key={i} size="sm">
            <CardContent className="space-y-2 pt-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))
      ) : (
        <>
          <StatTile
            label="Customers"
            value={nf.format(totals.users)}
            hint={`${nf.format(activity?.signupsLast30d ?? 0)} new in 30d`}
            icon={IconUsers}
          />
          <StatTile
            label="Workspaces"
            value={nf.format(totals.workspaces)}
            hint={`${nf.format(activity?.workspacesLast30d ?? 0)} new in 30d`}
            icon={IconBuilding}
          />
          <StatTile
            label="Webflow connected"
            value={nf.format(totals.webflowConnected)}
            hint={`${totals.users === 0 ? 0 : Math.round((totals.webflowConnected / totals.users) * 100)}% of customers`}
            icon={IconKey}
            tone="positive"
          />
          <StatTile
            label="Active sessions"
            value={nf.format(activity?.activeSessions ?? 0)}
            hint="Valid, unexpired"
            icon={IconUserCheck}
          />
        </>
      )}
    </div>
  );
}

function SecondaryStats({
  totals,
  loading,
  nf,
}: {
  totals: OperatorMetrics["totals"] | undefined;
  loading: boolean;
  nf: Intl.NumberFormat;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {loading || !totals ? (
        Array.from({ length: 3 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeletons
          <Card key={i} size="sm">
            <CardContent className="space-y-2 pt-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-10" />
            </CardContent>
          </Card>
        ))
      ) : (
        <>
          <StatTile
            label="Eligible to create workspace"
            value={nf.format(totals.eligibleForWorkspace)}
            hint="canCreateOrganization = true"
            icon={IconCircleCheck}
          />
          <StatTile
            label="Banned accounts"
            value={nf.format(totals.banned)}
            hint={totals.banned === 0 ? "Nothing to review" : "Review under Customers"}
            icon={IconAlertTriangle}
            tone={totals.banned > 0 ? "warn" : "default"}
          />
          <StatTile
            label="Early access requests"
            value={nf.format(totals.pendingEarlyAccessRequests)}
            hint="Review under Access requests"
            icon={IconKey}
            tone={totals.pendingEarlyAccessRequests > 0 ? "warn" : "default"}
          />
        </>
      )}
    </div>
  );
}

function RecentCustomers({ users, loading }: { users: OperatorMetrics["recentUsers"]; loading: boolean }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <CardTitle className="text-sm">Recent customers</CardTitle>
            <CardDescription>Latest sign-ups across the product.</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild className="gap-1">
            <Link href="/console/customers">
              View all
              <IconArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="divide-y divide-border">
        <RecentCustomersBody users={users} loading={loading} />
      </CardContent>
    </Card>
  );
}

function RecentCustomersBody({ users, loading }: { users: OperatorMetrics["recentUsers"]; loading: boolean }) {
  if (loading) {
    return (
      <>
        {Array.from({ length: 4 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeletons
          <div key={i} className="flex items-center gap-3 py-2">
            <Skeleton className="size-8 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </>
    );
  }
  if (users.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No customers yet.</p>;
  }
  return (
    <>
      {users.map((u) => (
        <Link
          key={u.id}
          href={`/console/customers?id=${encodeURIComponent(u.id)}`}
          className="flex items-center gap-3 py-2 transition-colors hover:bg-muted/30 -mx-4 px-4"
        >
          <Avatar className="size-8">
            <AvatarFallback>{initialsFor(u.name || u.email)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{u.name || u.email}</p>
            <p className="truncate text-xs text-muted-foreground">{u.email}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-0.5">
            {u.role === "product_admin" ? (
              <Badge variant="secondary" className="h-5">
                {appRoleLabel(u.role)}
              </Badge>
            ) : null}
            <span className="text-xs text-muted-foreground">{formatRelative(u.createdAt)}</span>
          </div>
        </Link>
      ))}
    </>
  );
}

function RecentWorkspaces({
  workspaces,
  loading,
}: {
  workspaces: OperatorMetrics["recentWorkspaces"];
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <CardTitle className="text-sm">Recent workspaces</CardTitle>
            <CardDescription>Newly created team workspaces.</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild className="gap-1">
            <Link href="/console/workspaces">
              View all
              <IconArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="divide-y divide-border">
        <RecentWorkspacesBody workspaces={workspaces} loading={loading} />
      </CardContent>
    </Card>
  );
}

function RecentWorkspacesBody({
  workspaces,
  loading,
}: {
  workspaces: OperatorMetrics["recentWorkspaces"];
  loading: boolean;
}) {
  if (loading) {
    return (
      <>
        {Array.from({ length: 4 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeletons
          <div key={i} className="flex items-center gap-3 py-2">
            <Skeleton className="size-8 rounded-md" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </>
    );
  }
  if (workspaces.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No workspaces yet.</p>;
  }
  return (
    <>
      {workspaces.map((w) => (
        <Link
          key={w.id}
          href={`/console/workspaces?id=${encodeURIComponent(w.id)}`}
          className="flex items-center gap-3 py-2 transition-colors hover:bg-muted/30 -mx-4 px-4"
        >
          <span className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <IconBuilding className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{w.name}</p>
            <p className="truncate font-mono text-xs text-muted-foreground">{w.slug}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-0.5">
            <span className="text-xs text-muted-foreground">{w.memberCount} members</span>
            <span className="text-xs text-muted-foreground">{formatRelative(w.createdAt)}</span>
          </div>
        </Link>
      ))}
    </>
  );
}

function HealthBadge({ healthOk }: { healthOk: boolean | null }) {
  if (healthOk === null) return <Badge variant="outline">Checking…</Badge>;
  if (healthOk) return <Badge>OK</Badge>;
  return <Badge variant="destructive">Issue</Badge>;
}

function HealthCard({ healthOk }: { healthOk: boolean | null }) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="text-sm">Platform health</CardTitle>
          <CardDescription>
            Quick probe against <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">/api/health</code>
            {". "}Open{" "}
            <Link href="/console/platform" className="underline underline-offset-4">
              Platform
            </Link>{" "}
            for the full response.
          </CardDescription>
        </div>
        <div className="shrink-0">
          <HealthBadge healthOk={healthOk} />
        </div>
      </CardHeader>
      <CardContent>
        <Button variant="outline" size="sm" asChild className="gap-1.5">
          <a href="/api/health" target="_blank" rel="noreferrer">
            Open probe
            <IconExternalLink className="size-3.5" />
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
