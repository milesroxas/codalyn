"use client";

import { IconActivity, IconExternalLink, IconPlug, IconRefresh } from "@tabler/icons-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { OperatorApiError, operatorApi } from "@/features/operator/api/client";
import { OperatorPlatformMeteringCard } from "@/features/operator/ui/operator-platform-metering";
import type { OperatorMetrics } from "@/server/operator/types";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";
import { Separator } from "@/shared/ui/separator";
import { Skeleton } from "@/shared/ui/skeleton";

type HealthState = {
  status: number | null;
  raw: string | null;
  loadedAt: Date | null;
};

export function OperatorPlatform() {
  const [health, setHealth] = useState<HealthState>({ status: null, raw: null, loadedAt: null });
  const [healthLoading, setHealthLoading] = useState(true);
  const [metrics, setMetrics] = useState<OperatorMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  const loadHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const res = await fetch("/api/health", { credentials: "include" });
      const text = await res.text();
      setHealth({ status: res.status, raw: text, loadedAt: new Date() });
    } catch {
      setHealth({ status: 0, raw: null, loadedAt: new Date() });
    } finally {
      setHealthLoading(false);
    }
  }, []);

  const loadMetrics = useCallback(async () => {
    setMetricsLoading(true);
    setMetricsError(null);
    try {
      setMetrics(await operatorApi.metrics());
    } catch (err) {
      setMetricsError(err instanceof OperatorApiError ? err.message : "Could not load integrations");
      setMetrics(null);
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHealth();
    void loadMetrics();
  }, [loadHealth, loadMetrics]);

  const refreshing = healthLoading || metricsLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Operator</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Platform</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Health checks and integration surfaces you can wire to uptime monitors, deploy hooks, and on-call.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => {
            void loadHealth();
            void loadMetrics();
          }}
          disabled={refreshing}
        >
          <IconRefresh className={refreshing ? "size-4 animate-spin" : "size-4"} />
          Refresh
        </Button>
      </div>

      <HealthCard health={health} loading={healthLoading} />
      <OperatorPlatformMeteringCard />
      <IntegrationsCard metrics={metrics} loading={metricsLoading} error={metricsError} />

      <Separator />

      <div className="space-y-2 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Webflow Data API</p>
        <p>
          Tenant OAuth and proxy routes are shared with Beacon. Authorize users from the{" "}
          <Link href="/" className="text-foreground underline underline-offset-4">
            Tower tenant
          </Link>{" "}
          home when testing end-to-end.
        </p>
      </div>
    </div>
  );
}

function HealthCard({ health, loading }: { health: HealthState; loading: boolean }) {
  const healthOk = health.status !== null && health.status >= 200 && health.status < 300;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <IconActivity className="size-5 text-muted-foreground" aria-hidden />
            <CardTitle className="text-base">Health probe</CardTitle>
          </div>
          {health.status !== null ? (
            <Badge variant={healthOk ? "secondary" : "destructive"}>HTTP {health.status}</Badge>
          ) : null}
        </div>
        <CardDescription>
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">GET /api/health</code>
          {health.loadedAt ? (
            <span className="ml-2 text-muted-foreground">· updated {health.loadedAt.toLocaleTimeString()}</span>
          ) : null}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <HealthBody loading={loading} raw={health.raw} />
      </CardContent>
      <CardFooter className="flex flex-wrap justify-end gap-2 border-t border-border">
        <Button variant="outline" size="sm" asChild>
          <a href="/api/health" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5">
            Open in new tab
            <IconExternalLink className="size-3.5" aria-hidden />
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
}

function HealthBody({ loading, raw }: { loading: boolean; raw: string | null }) {
  if (loading) {
    return <Skeleton className="h-24 w-full" />;
  }
  if (raw) {
    return (
      <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-muted/30 p-3 font-mono text-xs leading-relaxed">
        {raw}
      </pre>
    );
  }
  return <p className="text-sm text-muted-foreground">No response from /api/health.</p>;
}

function IntegrationsCard({
  metrics,
  loading,
  error,
}: {
  metrics: OperatorMetrics | null;
  loading: boolean;
  error: string | null;
}) {
  const rows: Array<{ label: string; suffix: string; value: string | null }> = [
    {
      label: "Webflow OAuth",
      suffix: "authorized users",
      value: metrics ? `${metrics.totals.webflowConnected}` : null,
    },
    {
      label: "Active sessions",
      suffix: "currently valid",
      value: metrics ? `${metrics.activity.activeSessions}` : null,
    },
    {
      label: "Pending invites",
      suffix: "awaiting acceptance",
      value: metrics ? `${metrics.totals.pendingInvitations}` : null,
    },
    {
      label: "Banned accounts",
      suffix: "blocked from sign-in",
      value: metrics ? `${metrics.totals.banned}` : null,
    },
  ];
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <IconPlug className="size-5 text-muted-foreground" aria-hidden />
          <CardTitle className="text-base">Integrations</CardTitle>
        </div>
        <CardDescription>Live counts from the auth database for third-party integrations in use.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}
        <dl className="grid gap-3 sm:grid-cols-2">
          {rows.map((r) => (
            <IntegrationRow key={r.label} label={r.label} value={r.value} suffix={r.suffix} loading={loading} />
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function IntegrationRow({
  label,
  value,
  suffix,
  loading,
}: {
  label: string;
  value: string | null;
  suffix: string;
  loading: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between rounded-lg border border-border bg-card px-3 py-2.5">
      <div>
        <dt className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
        <dd className="text-xs text-muted-foreground">{suffix}</dd>
      </div>
      {loading ? (
        <Skeleton className="h-6 w-12" />
      ) : (
        <span className="font-heading text-2xl font-semibold tabular-nums text-foreground">{value ?? "—"}</span>
      )}
    </div>
  );
}
