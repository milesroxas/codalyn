"use client";

import type { BeaconAppSettings, BeaconImagePresetRow, ImageExportFormat } from "@codalyn/webflow-kit";
import Link from "next/link";
import { useCallback, useEffect, useId, useState } from "react";
import { authClient } from "@/features/auth/model/auth-client";
import { draftToMaxBytes, type MaxSizeUnit, parsePresetOutputDimension } from "@/features/beacon/lib/preset-dimensions";
import { TowerBeaconPresetsPanel } from "@/features/beacon/ui/tower-beacon-presets-panel";
import { Button } from "@/shared/ui/button";

type BeaconApiPayload = {
  settings: BeaconAppSettings;
  editorExperience: boolean;
  canManageTeamBeaconSettings: boolean;
  restrictToEditorExperience: boolean;
};

export function TowerBeaconScreen() {
  const baseId = useId();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const { data: activeOrg } = authClient.useActiveOrganization();

  const [payload, setPayload] = useState<BeaconApiPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [draftName, setDraftName] = useState("");
  const [draftW, setDraftW] = useState("1920");
  const [draftH, setDraftH] = useState("1080");
  const [draftFormat, setDraftFormat] = useState<ImageExportFormat>("webp");
  const [draftMaxStr, setDraftMaxStr] = useState("100");
  const [draftMaxUnit, setDraftMaxUnit] = useState<MaxSizeUnit>("kb");
  const [presetTarget, setPresetTarget] = useState<"workspace" | "designer">("workspace");

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
      if (data.settings.defaultExportFormat) {
        setDraftFormat(data.settings.defaultExportFormat);
      }
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
          const j = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(j?.error ?? `Save failed (${res.status})`);
        }
        const data = (await res.json()) as BeaconApiPayload;
        setPayload(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed");
      } finally {
        setSaving(false);
      }
    },
    [session?.user]
  );

  if (sessionPending) {
    return (
      <main className="mx-auto min-h-dvh max-w-4xl px-4 py-10 sm:px-6">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }

  if (!session?.user) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-4xl flex-col gap-6 px-4 py-12 sm:px-6">
        <div className="max-w-md space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Beacon</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to view workspace presets for the Beacon image editor.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/sign-in?callbackUrl=/beacon">Sign in</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/sign-up?callbackUrl=/beacon">Create account</Link>
          </Button>
        </div>
      </main>
    );
  }

  const settings = payload?.settings;
  const canManage = Boolean(payload?.canManageTeamBeaconSettings);
  const teamPresetsLocked = Boolean(payload?.editorExperience);
  const canEditPresets = canManage && !teamPresetsLocked;
  const presets = settings?.imagePresets ?? [];
  const designerPresets = settings?.designerOnlyImagePresets ?? [];

  const addPreset = () => {
    if (!canEditPresets) {
      return;
    }
    const name = draftName.trim();
    if (!name) {
      return;
    }
    const w = parsePresetOutputDimension(draftW, 1920);
    const h = parsePresetOutputDimension(draftH, 1080);
    const maxFileSizeBytes = draftToMaxBytes(draftMaxStr, draftMaxUnit);
    const row: BeaconImagePresetRow = {
      id: crypto.randomUUID(),
      name,
      width: w,
      height: h,
      exportFormat: draftFormat,
      maxFileSizeBytes,
    };
    if (presetTarget === "designer") {
      void applyPatch({ designerOnlyImagePresets: [...designerPresets, row] });
    } else {
      void applyPatch({ imagePresets: [...presets, row] });
    }
    setDraftName("");
    setDraftW(String(w));
    setDraftH(String(h));
  };

  const removePreset = (id: string, scope: "workspace" | "designer") => {
    if (!canEditPresets) {
      return;
    }
    if (scope === "designer") {
      void applyPatch({ designerOnlyImagePresets: designerPresets.filter((p) => p.id !== id) });
    } else {
      void applyPatch({ imagePresets: presets.filter((p) => p.id !== id) });
    }
  };

  const updatePreset = (
    id: string,
    scope: "workspace" | "designer",
    patch: Partial<Pick<BeaconImagePresetRow, "name" | "width" | "height" | "exportFormat" | "maxFileSizeBytes">>
  ) => {
    if (!canEditPresets) {
      return;
    }
    if (scope === "designer") {
      void applyPatch({
        designerOnlyImagePresets: designerPresets.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      });
    } else {
      void applyPatch({
        imagePresets: presets.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      });
    }
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Beacon</p>
        <h1 className="text-2xl font-semibold tracking-tight">Workspace presets</h1>
        <p className="max-w-2xl text-muted-foreground">
          Workspace export presets and crop shortcuts sync to every member; designer-only presets stay hidden from
          editor-mode members. Beacon picks up changes when the app reloads settings (tab focus or reopen).
        </p>
      </div>

      {!activeOrg ? (
        <p className="mt-6 text-sm text-amber-700 dark:text-amber-500">
          No active workspace. Choose a team in{" "}
          <Link href="/team" className="font-medium underline-offset-4 hover:underline">
            Team
          </Link>{" "}
          to tie presets to an organization.
        </p>
      ) : null}

      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

      {loading && !payload ? <p className="mt-6 text-sm text-muted-foreground">Loading presets…</p> : null}

      {payload ? (
        <TowerBeaconPresetsPanel
          baseId={baseId}
          loading={loading}
          saving={saving}
          settings={settings}
          presets={presets}
          designerPresets={designerPresets}
          presetTarget={presetTarget}
          setPresetTarget={setPresetTarget}
          canManage={canManage}
          teamPresetsLocked={teamPresetsLocked}
          canEditPresets={canEditPresets}
          draftName={draftName}
          setDraftName={setDraftName}
          draftW={draftW}
          setDraftW={setDraftW}
          draftH={draftH}
          setDraftH={setDraftH}
          draftFormat={draftFormat}
          setDraftFormat={setDraftFormat}
          draftMaxStr={draftMaxStr}
          setDraftMaxStr={setDraftMaxStr}
          draftMaxUnit={draftMaxUnit}
          setDraftMaxUnit={setDraftMaxUnit}
          addPreset={addPreset}
          removePreset={removePreset}
          updatePreset={updatePreset}
        />
      ) : null}
    </main>
  );
}
