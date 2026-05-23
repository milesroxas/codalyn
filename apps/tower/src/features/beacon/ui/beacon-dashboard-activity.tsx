"use client";

import {
  type BeaconAppSettings,
  formatBeaconPresetDisplayName,
  formatBeaconPresetStorageSummary,
  listBeaconPresetStorageEntries,
} from "@codalyn/webflow-kit";
import { IconRadar2, IconRefresh } from "@tabler/icons-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { authClient } from "@/features/auth/model/auth-client";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

type BeaconApiPayload = {
  settings: BeaconAppSettings;
  editorExperience?: boolean;
  canManageTeamBeaconSettings?: boolean;
};

function WorkspacePresetsCardContent(props: {
  error: string | null;
  presetRows: Array<{ id: string; label: string; summary: string }>;
}) {
  const { error, presetRows } = props;
  if (error) {
    return <p className="text-xs text-destructive">{error}</p>;
  }
  if (presetRows.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No export presets yet.{" "}
        <Link href="/beacon" className="font-medium text-foreground underline-offset-4 hover:underline">
          Manage in Tower
        </Link>
      </p>
    );
  }
  return (
    <ul className="max-h-40 space-y-2 overflow-auto text-xs">
      {presetRows.map((row) => (
        <li
          key={row.id}
          className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 border-b border-border/60 pb-2 last:border-0 last:pb-0"
        >
          <span className="min-w-0 font-medium text-foreground">{row.label}</span>
          <span className="shrink-0 font-mono text-muted-foreground">{row.summary}</span>
        </li>
      ))}
    </ul>
  );
}

export function BeaconDashboardActivity() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [payload, setPayload] = useState<BeaconApiPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!session?.user) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/beacon/settings", { credentials: "include", cache: "no-store" });
      if (!res.ok) {
        throw new Error(res.status === 401 ? "Sign in required" : "Could not load Beacon settings");
      }
      const data = (await res.json()) as BeaconApiPayload;
      setPayload(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load");
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [session?.user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && session?.user) {
        void refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh, session?.user]);

  const presetRows = useMemo(() => {
    if (!payload?.settings) {
      return [];
    }
    const defaultFormat = payload.settings.defaultExportFormat;
    return listBeaconPresetStorageEntries(payload.settings.imagePresetStorage).map(({ row, scope }) => ({
      id: row.id,
      label: formatBeaconPresetDisplayName(row, scope),
      summary: formatBeaconPresetStorageSummary(row, defaultFormat),
    }));
  }, [payload?.settings]);

  if (sessionPending) {
    return null;
  }
  if (!session?.user) {
    return null;
  }

  const canManage = Boolean(payload?.canManageTeamBeaconSettings);

  return (
    <section className="mb-10 space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-sm font-medium text-foreground">Beacon</h2>
        <div className="flex flex-wrap items-center gap-2">
          {loading ? (
            <span className="text-xs text-muted-foreground">Updating…</span>
          ) : (
            <span className="text-xs text-muted-foreground">Workspace sync</span>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={loading}
            onClick={() => void refresh()}
          >
            <IconRefresh aria-hidden className="size-3.5" stroke={1.5} />
            Refresh
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-foreground">
              <IconRadar2 aria-hidden className="size-5" stroke={1.5} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary">Beacon</Badge>
              {canManage ? <Badge variant="outline">Editable in Tower</Badge> : null}
            </div>
          </div>
          <div>
            <CardTitle>Workspace export presets</CardTitle>
            <CardDescription className="mt-1.5">
              Synced scoped presets for this workspace. Site default is editable in Tower; scoped presets are managed in
              Beacon.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <WorkspacePresetsCardContent error={error} presetRows={presetRows} />
          <div className="pt-1">
            <Button variant="outline" size="sm" asChild>
              <Link href="/beacon">Manage in Tower</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
