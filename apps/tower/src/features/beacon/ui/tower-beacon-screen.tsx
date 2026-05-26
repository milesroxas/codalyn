"use client";

import {
  applySiteDefaultPresetPatch,
  BEACON_IMAGE_ERROR_CODES,
  type BeaconAppSettings,
  type BeaconPresetRow,
} from "@codalyn/webflow-kit";
import { useCallback, useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { useRequireTowerSession } from "@/features/auth/model/use-require-tower-session";
import { BeaconPageSkeleton } from "@/features/beacon/ui/beacon-page-skeleton";
import { TowerBeaconPresetsPanel, type TowerBeaconWebflowSite } from "@/features/beacon/ui/tower-beacon-presets-panel";
import { Skeleton } from "@/shared/ui/skeleton";
import { TowerPageMain } from "@/shared/ui/tower-page-shell";

type BeaconApiPayload = {
  settings: BeaconAppSettings;
  editorExperience: boolean;
  canManageTeamBeaconSettings: boolean;
  restrictToEditorExperience: boolean;
  workspaceMemberRole: string | null;
  appUserRole: string | null;
  webflowSites: TowerBeaconWebflowSite[] | null;
};

function canEditSiteDefaultPreset(payload: BeaconApiPayload | null, canEditPresets: boolean): boolean {
  if (!payload || !canEditPresets) {
    return false;
  }
  const normalizedRole = payload.workspaceMemberRole?.toLowerCase() ?? "";
  return normalizedRole === "admin" || normalizedRole === "owner" || normalizedRole === "designer";
}

export function TowerBeaconScreen() {
  const baseId = useId();
  const { session, sessionPending } = useRequireTowerSession("/beacon");

  const [payload, setPayload] = useState<BeaconApiPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const settings = payload?.settings;
  const canManage = Boolean(payload?.canManageTeamBeaconSettings);
  const teamPresetsLocked = Boolean(payload?.editorExperience);
  const canEditPresets = canManage && !teamPresetsLocked;
  const canEditSiteDefault = canEditSiteDefaultPreset(payload, canEditPresets);

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

  const applyPatch = useCallback(
    async (patch: Partial<BeaconAppSettings>) => {
      if (!session?.user) {
        return;
      }
      setSaving(true);
      setError(null);
      try {
        const res = await fetch("/api/v1/beacon/settings", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => null)) as { error?: string; errorCode?: string } | null;
          if (j?.errorCode === BEACON_IMAGE_ERROR_CODES.DUPLICATE_PRESET_TARGET) {
            throw new Error("A preset with this target already exists.");
          }
          throw new Error(j?.error ?? `Save failed (${res.status})`);
        }
        const data = (await res.json()) as BeaconApiPayload;
        setPayload(data);
        toast.success("Beacon settings saved");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Save failed";
        setError(msg);
        toast.error(msg);
      } finally {
        setSaving(false);
      }
    },
    [session?.user]
  );

  const upsertSiteDefaultPreset = useCallback(
    (siteId: string, row: BeaconPresetRow) => {
      if (!canEditSiteDefault) {
        toast.error("You do not have permission to edit the site default preset.");
        return;
      }
      if (!settings) {
        return;
      }
      void applyPatch({
        imagePresetStorage: applySiteDefaultPresetPatch(settings.imagePresetStorage, siteId, row),
      });
    },
    [applyPatch, canEditSiteDefault, settings]
  );

  const clearSiteDefaultPreset = useCallback(
    (siteId: string) => {
      if (!canEditSiteDefault || !settings) {
        return;
      }
      void applyPatch({
        imagePresetStorage: applySiteDefaultPresetPatch(settings.imagePresetStorage, siteId, null),
      });
    },
    [applyPatch, canEditSiteDefault, settings]
  );

  if (sessionPending || !session?.user) {
    return <BeaconPageSkeleton />;
  }

  return (
    <TowerPageMain>
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Beacon</p>
        <h1 className="text-2xl font-semibold tracking-tight">Site presets</h1>
        <p className="max-w-2xl text-muted-foreground">
          Presets are scoped to each Webflow site in this workspace. Site defaults are editable here; scoped element,
          component, and instance presets are managed in the Beacon image editor.
        </p>
      </div>

      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

      {loading && !payload ? <Skeleton className="mt-6 h-48 w-full rounded-xl" aria-hidden /> : null}

      {payload ? (
        <TowerBeaconPresetsPanel
          baseId={baseId}
          loading={loading}
          saving={saving}
          settings={settings}
          webflowSites={payload.webflowSites}
          canManage={canManage}
          teamPresetsLocked={teamPresetsLocked}
          canEditSiteDefault={canEditSiteDefault}
          upsertSiteDefaultPresetAction={upsertSiteDefaultPreset}
          clearSiteDefaultPresetAction={clearSiteDefaultPreset}
        />
      ) : null}
    </TowerPageMain>
  );
}
