"use client";

import {
  BEACON_PRESET_DEFAULT_MAX_FILE_BYTES,
  BEACON_PRESET_MAX_FILE_BYTES_MAX,
  BEACON_PRESET_MAX_FILE_BYTES_MIN,
  type BeaconAppSettings,
} from "@codalyn/webflow-kit";
import { IconRadar2, IconRefresh } from "@tabler/icons-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { authClient } from "@/features/auth/model/auth-client";
import { formatBeaconPresetMax } from "@/features/beacon/lib/preset-dimensions";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

type BeaconApiPayload = {
  settings: BeaconAppSettings;
  editorExperience?: boolean;
  canManageTeamBeaconSettings?: boolean;
};

type BeaconPresetRow = BeaconAppSettings["imagePresets"][number];

function cappedPresetMaxBytes(p: BeaconPresetRow): number {
  const maxB =
    typeof p.maxFileSizeBytes === "number" && p.maxFileSizeBytes >= BEACON_PRESET_MAX_FILE_BYTES_MIN
      ? p.maxFileSizeBytes
      : BEACON_PRESET_DEFAULT_MAX_FILE_BYTES;
  return Math.min(BEACON_PRESET_MAX_FILE_BYTES_MAX, maxB);
}

function isEmptyPresetsState(
  presets: BeaconPresetRow[],
  designerPresets: BeaconPresetRow[],
  canManage: boolean,
  editorExp: boolean
): boolean {
  return presets.length === 0 && (!canManage || editorExp || designerPresets.length === 0);
}

function PresetListItem({ preset, designerBadge }: { preset: BeaconPresetRow; designerBadge?: boolean }) {
  const capped = cappedPresetMaxBytes(preset);
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 border-b border-border/60 pb-2 last:border-0 last:pb-0">
      <span
        className={
          designerBadge
            ? "flex min-w-0 flex-wrap items-center gap-2 font-medium text-foreground"
            : "min-w-0 font-medium text-foreground"
        }
      >
        {preset.name}
        {designerBadge ? (
          <Badge variant="outline" className="text-[10px] font-normal">
            Designers
          </Badge>
        ) : null}
      </span>
      <span className="shrink-0 font-mono text-muted-foreground">
        {preset.width}×{preset.height}
        {preset.exportFormat ? ` · ${preset.exportFormat}` : ""} · max {formatBeaconPresetMax(capped)}
      </span>
    </li>
  );
}

function WorkspacePresetsCardContent(props: {
  error: string | null;
  presets: BeaconPresetRow[];
  designerPresets: BeaconPresetRow[];
  canManage: boolean;
  editorExp: boolean;
}) {
  const { error, presets, designerPresets, canManage, editorExp } = props;
  if (error) {
    return <p className="text-xs text-destructive">{error}</p>;
  }
  if (isEmptyPresetsState(presets, designerPresets, canManage, editorExp)) {
    return (
      <p className="text-xs text-muted-foreground">
        No export presets yet.
        {canManage ? (
          <>
            {" "}
            <Link href="/beacon" className="font-medium text-foreground underline-offset-4 hover:underline">
              Add presets in Tower
            </Link>
          </>
        ) : null}
      </p>
    );
  }
  return (
    <ul className="max-h-40 space-y-2 overflow-auto text-xs">
      {presets.map((p) => (
        <PresetListItem key={p.id} preset={p} />
      ))}
      {canManage && !editorExp
        ? designerPresets.map((p) => <PresetListItem key={`d-${p.id}`} preset={p} designerBadge />)
        : null}
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

  if (sessionPending) {
    return null;
  }
  if (!session?.user) {
    return null;
  }

  const presets = payload?.settings.imagePresets ?? [];
  const designerPresets = payload?.settings.designerOnlyImagePresets ?? [];
  const canManage = Boolean(payload?.canManageTeamBeaconSettings);
  const editorExp = Boolean(payload?.editorExperience);

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
              Synced for this workspace in Beacon. Designer-only rows are hidden without designer features.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <WorkspacePresetsCardContent
            error={error}
            presets={presets}
            designerPresets={designerPresets}
            canManage={canManage}
            editorExp={editorExp}
          />
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
