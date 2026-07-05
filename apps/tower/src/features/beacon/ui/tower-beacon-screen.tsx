"use client";

import {
  applyBeaconPresetRowUpsert,
  applySiteDefaultPresetPatch,
  BEACON_IMAGE_ERROR_CODES,
  type BeaconAppSettings,
  type BeaconPresetRow,
  buildBeaconPresetSiteGroups,
  removeBeaconPresetRowById,
} from "@codalyn/webflow-kit";
import { useDeferredLoadingIndicator } from "@codalyn/webflow-kit/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { useRequireTowerSession } from "@/features/auth/model/use-require-tower-session";
import { BeaconEditorExperienceSection } from "@/features/beacon/ui/beacon-editor-experience-section";
import { BeaconPageSkeleton } from "@/features/beacon/ui/beacon-page-skeleton";
import {
  TowerBeaconConnectEmptyState,
  TowerBeaconPresetsPanel,
  type TowerBeaconWebflowSite,
} from "@/features/beacon/ui/tower-beacon-presets-panel";
import { isTowerTeamAdminRole } from "@/shared/lib/membership/tower-organization-access";
import { TOWER_CONNECTION_PATH } from "@/shared/lib/navigation/tower-app-paths";
import { Skeleton } from "@/shared/ui/skeleton";
import { TowerPageHeader, TowerPageMain } from "@/shared/ui/tower-page-shell";

type BeaconApiPayload = {
  settings: BeaconAppSettings;
  editorExperience: boolean;
  canManageTeamBeaconSettings: boolean;
  restrictToEditorExperience: boolean;
  workspaceMemberRole: string | null;
  appUserRole: string | null;
  webflowSites: TowerBeaconWebflowSite[] | null;
  webflowAppClientId: string | null;
};

function canEditSiteDefaultPreset(payload: BeaconApiPayload | null, canEditPresets: boolean): boolean {
  if (!payload || !canEditPresets) {
    return false;
  }
  const normalizedRole = payload.workspaceMemberRole?.toLowerCase() ?? "";
  return normalizedRole === "admin" || normalizedRole === "owner" || normalizedRole === "designer";
}

export function TowerBeaconScreen(props: { oauthConfigured?: boolean }) {
  const { oauthConfigured = false } = props;
  const { session, sessionPending } = useRequireTowerSession("/beacon");
  const showSessionSkeleton = useDeferredLoadingIndicator(sessionPending);

  if (showSessionSkeleton) {
    return <BeaconPageSkeleton />;
  }
  if (sessionPending || !session?.user) {
    return null;
  }

  return <TowerBeaconScreenLoaded oauthConfigured={oauthConfigured} session={session} />;
}

function TowerBeaconScreenLoaded(props: {
  oauthConfigured: boolean;
  session: NonNullable<ReturnType<typeof useRequireTowerSession>["session"]>;
}) {
  const { oauthConfigured, session } = props;
  const router = useRouter();
  const baseId = useId();

  const [payload, setPayload] = useState<BeaconApiPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const settings = payload?.settings;
  const canManage = Boolean(payload?.canManageTeamBeaconSettings);
  const teamPresetsLocked = Boolean(payload?.editorExperience);
  const canEditPresets = canManage && !teamPresetsLocked;
  const canEditSiteDefault = canEditSiteDefaultPreset(payload, canEditPresets);
  const canConnectWebflow = Boolean(payload?.workspaceMemberRole && isTowerTeamAdminRole(payload.workspaceMemberRole));

  const siteGroups = useMemo(() => {
    if (!payload?.settings) {
      return [];
    }
    return buildBeaconPresetSiteGroups(payload.settings.imagePresetStorage, payload.webflowSites ?? []);
  }, [payload?.settings, payload?.webflowSites]);

  const showBeaconConnectState =
    Boolean(payload) &&
    !loading &&
    siteGroups.length === 0 &&
    (payload?.webflowSites === null || (payload?.webflowSites?.length ?? 0) === 0);

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

  const upsertPresetRow = useCallback(
    (row: BeaconPresetRow) => {
      if (!canEditSiteDefault || !settings) {
        toast.error("You do not have permission to edit workspace presets.");
        return;
      }
      void applyPatch({
        imagePresetStorage: applyBeaconPresetRowUpsert(settings.imagePresetStorage, row),
      });
    },
    [applyPatch, canEditSiteDefault, settings]
  );

  const removePresetById = useCallback(
    (presetId: string) => {
      if (!canEditSiteDefault || !settings) {
        return;
      }
      void applyPatch({
        imagePresetStorage: removeBeaconPresetRowById(settings.imagePresetStorage, presetId),
      });
    },
    [applyPatch, canEditSiteDefault, settings]
  );

  const showPayloadSkeleton = useDeferredLoadingIndicator(loading && !payload);

  return (
    <TowerPageMain>
      <TowerPageHeader title="Beacon App" description="Configure settings for the designer extension." />

      {error ? (
        <div className="mb-6 rounded-sm border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {showPayloadSkeleton ? <Skeleton className="mb-6 h-48 w-full rounded-sm" aria-hidden /> : null}

      {showBeaconConnectState ? (
        <TowerBeaconConnectEmptyState
          webflowOAuthConnected={payload?.webflowSites !== null}
          oauthConfigured={oauthConfigured}
          canConnectWebflow={canConnectWebflow}
          onConnectSuccess={() => {
            // Land the user on the connection page after OAuth so they see the linked sites.
            router.push(TOWER_CONNECTION_PATH);
          }}
        />
      ) : null}

      {payload && !showBeaconConnectState && isTowerTeamAdminRole(payload.workspaceMemberRole) ? (
        <div className="mb-6">
          <BeaconEditorExperienceSection
            restrictToEditorExperience={payload.restrictToEditorExperience}
            loading={loading}
            onUpdated={refresh}
          />
        </div>
      ) : null}

      {payload && !showBeaconConnectState ? (
        <TowerBeaconPresetsPanel
          baseId={baseId}
          loading={loading}
          saving={saving}
          settings={settings}
          webflowSites={payload.webflowSites}
          webflowAppClientId={payload.webflowAppClientId}
          canManage={canManage}
          teamPresetsLocked={teamPresetsLocked}
          canEditSiteDefault={canEditSiteDefault}
          upsertSiteDefaultPresetAction={upsertSiteDefaultPreset}
          clearSiteDefaultPresetAction={clearSiteDefaultPreset}
          upsertPresetRowAction={upsertPresetRow}
          removePresetByIdAction={removePresetById}
        />
      ) : null}
    </TowerPageMain>
  );
}
