"use client";

import { type BeaconAppSettings, buildBeaconPresetSiteGroups } from "@codalyn/webflow-kit";
import { IconRefresh } from "@tabler/icons-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { authClient } from "@/features/auth/model/auth-client";
import { countBeaconSitePresets, TowerBeaconPresetRowsList } from "@/features/beacon/ui/tower-beacon-preset-list";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

type BeaconApiPayload = {
  settings: BeaconAppSettings;
  editorExperience?: boolean;
  canManageTeamBeaconSettings?: boolean;
  webflowSites?: Array<{ id: string; displayName?: string }> | null;
};

function WorkspacePresetsCardContent(props: {
  error: string | null;
  siteGroups: ReturnType<typeof buildBeaconPresetSiteGroups>;
  defaultExportFormat?: BeaconAppSettings["defaultExportFormat"];
}) {
  const { error, siteGroups, defaultExportFormat } = props;
  if (error) {
    return <p className="text-xs text-destructive">{error}</p>;
  }
  const presetCount = siteGroups.reduce((total, group) => total + countBeaconSitePresets(group), 0);
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
        if (countBeaconSitePresets(group) === 0) {
          return null;
        }
        return (
          <div key={group.siteId} className="space-y-2">
            <p className="font-medium text-foreground">{group.displayName}</p>
            <TowerBeaconPresetRowsList group={group} defaultExportFormat={defaultExportFormat} />
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

  const presetCount = siteGroups.reduce((total, group) => total + countBeaconSitePresets(group), 0);

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
        <CardDescription>Grouped by site. Edit in Tower or Beacon; changes stay in sync.</CardDescription>
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
