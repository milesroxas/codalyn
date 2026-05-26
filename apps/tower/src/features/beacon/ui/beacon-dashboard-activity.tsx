"use client";

import {
  type BeaconAppSettings,
  buildBeaconPresetSiteGroups,
  formatBeaconPresetDisplayName,
  formatBeaconPresetStorageSummary,
} from "@codalyn/webflow-kit";
import { IconRefresh } from "@tabler/icons-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { authClient } from "@/features/auth/model/auth-client";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

type BeaconApiPayload = {
  settings: BeaconAppSettings;
  editorExperience?: boolean;
  canManageTeamBeaconSettings?: boolean;
  webflowSites?: Array<{ id: string; displayName?: string }> | null;
};

function dedupePresetLabel(label: string): string {
  const match = label.match(/^(.+) \((.+)\)$/);
  return match && match[1] === match[2] ? match[1] : label;
}

function WorkspacePresetsCardContent(props: {
  error: string | null;
  siteGroups: ReturnType<typeof buildBeaconPresetSiteGroups>;
  defaultExportFormat?: BeaconAppSettings["defaultExportFormat"];
}) {
  const { error, siteGroups, defaultExportFormat } = props;
  if (error) {
    return <p className="text-xs text-destructive">{error}</p>;
  }
  const presetCount = siteGroups.reduce(
    (total, group) => total + group.scopedPresets.length + (group.siteDefault ? 1 : 0),
    0
  );
  if (presetCount === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No export presets yet.{" "}
        <Link href="/beacon" className="font-medium text-foreground underline-offset-4 hover:underline">
          Add presets in Tower
        </Link>
      </p>
    );
  }
  return (
    <div className="max-h-48 space-y-3 overflow-auto text-xs">
      {siteGroups.map((group) => {
        const rows = [
          ...(group.siteDefault ? [{ row: group.siteDefault, scope: "site-default" as const }] : []),
          ...group.scopedPresets,
        ];
        if (rows.length === 0) {
          return null;
        }
        return (
          <div key={group.siteId} className="space-y-2">
            <p className="font-medium text-foreground">{group.displayName}</p>
            <ul className="space-y-2">
              {rows.map(({ row, scope }) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 border-b border-border/60 pb-2 last:border-0 last:pb-0"
                >
                  <span className="min-w-0 font-medium text-foreground">
                    {dedupePresetLabel(formatBeaconPresetDisplayName(row, scope))}
                  </span>
                  <span className="shrink-0 font-mono text-muted-foreground">
                    {formatBeaconPresetStorageSummary(row, defaultExportFormat)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
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

  const siteGroups = useMemo(() => {
    if (!payload?.settings) {
      return [];
    }
    return buildBeaconPresetSiteGroups(payload.settings.imagePresetStorage, payload.webflowSites ?? []);
  }, [payload?.settings, payload?.webflowSites]);

  const presetCount = siteGroups.reduce(
    (total, group) => total + group.scopedPresets.length + (group.siteDefault ? 1 : 0),
    0
  );

  if (sessionPending || !session?.user) {
    return null;
  }

  const canManage = Boolean(payload?.canManageTeamBeaconSettings);
  const syncStatus = loading
    ? "Syncing…"
    : presetCount === 0
      ? "No presets synced"
      : `${presetCount} preset${presetCount === 1 ? "" : "s"} · live sync`;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Export presets</CardTitle>
        <CardDescription>
          Synced from this workspace, grouped by Webflow site. Site defaults are editable in Tower; scoped presets are
          managed in Beacon.
        </CardDescription>
        <CardAction>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={loading}
            onClick={() => void refresh()}
          >
            <IconRefresh aria-hidden className="size-3.5" stroke={1.5} />
            {loading ? "Updating…" : "Refresh"}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Beacon</Badge>
          {canManage ? <Badge variant="outline">Editable in Tower</Badge> : null}
          <span className="text-xs text-muted-foreground">{syncStatus}</span>
        </div>
        <WorkspacePresetsCardContent
          error={error}
          siteGroups={siteGroups}
          defaultExportFormat={payload?.settings.defaultExportFormat}
        />
        <div className="pt-1">
          <Button variant="outline" size="sm" asChild>
            <Link href="/beacon">Manage presets</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
