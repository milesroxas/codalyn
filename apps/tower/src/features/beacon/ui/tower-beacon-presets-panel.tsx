"use client";

import type { BeaconAppSettings, BeaconPresetRow, ImageExportFormat } from "@codalyn/webflow-kit";
import {
  type BeaconPresetStorageEntry,
  formatBeaconPresetDisplayName,
  formatBeaconPresetMax,
  formatBeaconPresetStorageSummary,
  listBeaconPresetStorageEntries,
} from "@codalyn/webflow-kit";
import { useMemo } from "react";
import type { MaxSizeUnit } from "@/features/beacon/lib/preset-dimensions";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { NativeSelect } from "@/shared/ui/native-select";

export type TowerBeaconPresetsPanelProps = {
  baseId: string;
  loading: boolean;
  saving: boolean;
  settings: BeaconAppSettings | undefined;
  canManage: boolean;
  teamPresetsLocked: boolean;
  canEditSiteDefault: boolean;
  draftW: string;
  setDraftWAction: (v: string) => void;
  draftH: string;
  setDraftHAction: (v: string) => void;
  draftFormat: ImageExportFormat;
  setDraftFormatAction: (v: ImageExportFormat) => void;
  draftMaxStr: string;
  setDraftMaxStrAction: (v: string) => void;
  draftMaxUnit: MaxSizeUnit;
  setDraftMaxUnitAction: (v: MaxSizeUnit) => void;
  siteDefaultPreset: BeaconPresetRow | null;
  upsertSiteDefaultPresetAction: () => void;
  clearSiteDefaultPresetAction: () => void;
};

function TowerBeaconPanelStatus(props: { canManage: boolean; teamPresetsLocked: boolean }) {
  const { canManage, teamPresetsLocked } = props;
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {canManage ? <Badge>Designer</Badge> : <Badge variant="secondary">View only</Badge>}
        {teamPresetsLocked ? <Badge variant="outline">Designer features off · locked</Badge> : null}
      </div>
      {!canManage ? (
        <p className="text-sm text-muted-foreground">
          Only workspace designers (and operators) can edit shared presets. Ask a designer to update them in Beacon.
        </p>
      ) : null}
      {canManage && teamPresetsLocked ? (
        <p className="text-sm text-muted-foreground">
          Team presets are read-only while designer features are off. Turn them on under Team, or in Beacon settings.
        </p>
      ) : null}
    </>
  );
}

function SiteDefaultPresetSummary(props: {
  siteDefaultPreset: BeaconPresetRow;
  defaultExportFormat?: ImageExportFormat;
}) {
  const { siteDefaultPreset, defaultExportFormat } = props;
  return (
    <div className="rounded-md border border-border/60 bg-muted/15 px-3 py-2 text-sm">
      <p className="font-medium">{siteDefaultPreset.name}</p>
      <p className="text-muted-foreground text-xs tabular-nums">
        {siteDefaultPreset.width}×{siteDefaultPreset.height}
        {siteDefaultPreset.exportFormat
          ? ` · ${siteDefaultPreset.exportFormat}`
          : defaultExportFormat
            ? ` · ${defaultExportFormat}`
            : ""}{" "}
        · max {formatBeaconPresetMax(siteDefaultPreset.maxFileSizeBytes)}
      </p>
    </div>
  );
}

function SiteDefaultPresetEditor(props: {
  baseId: string;
  saving: boolean;
  siteDefaultPreset: BeaconPresetRow | null;
  draftW: string;
  setDraftWAction: (v: string) => void;
  draftH: string;
  setDraftHAction: (v: string) => void;
  draftFormat: ImageExportFormat;
  setDraftFormatAction: (v: ImageExportFormat) => void;
  draftMaxStr: string;
  setDraftMaxStrAction: (v: string) => void;
  draftMaxUnit: MaxSizeUnit;
  setDraftMaxUnitAction: (v: MaxSizeUnit) => void;
  upsertSiteDefaultPresetAction: () => void;
  clearSiteDefaultPresetAction: () => void;
}) {
  const {
    baseId,
    saving,
    siteDefaultPreset,
    draftW,
    setDraftWAction,
    draftH,
    setDraftHAction,
    draftFormat,
    setDraftFormatAction,
    draftMaxStr,
    setDraftMaxStrAction,
    draftMaxUnit,
    setDraftMaxUnitAction,
    upsertSiteDefaultPresetAction,
    clearSiteDefaultPresetAction,
  } = props;

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-border/80 bg-background/50 p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${baseId}-site-default-w`}>Width</Label>
          <Input
            id={`${baseId}-site-default-w`}
            value={draftW}
            disabled={saving}
            onChange={(e) => setDraftWAction(e.target.value)}
            className="h-9 text-sm tabular-nums"
            inputMode="numeric"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${baseId}-site-default-h`}>Height</Label>
          <Input
            id={`${baseId}-site-default-h`}
            value={draftH}
            disabled={saving}
            onChange={(e) => setDraftHAction(e.target.value)}
            className="h-9 text-sm tabular-nums"
            inputMode="numeric"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`${baseId}-site-default-format`}>Format</Label>
          <NativeSelect
            id={`${baseId}-site-default-format`}
            className="w-full"
            value={draftFormat}
            disabled={saving}
            onChange={(e) => setDraftFormatAction(e.target.value as ImageExportFormat)}
          >
            <option value="webp">WebP</option>
            <option value="avif">AVIF</option>
          </NativeSelect>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs text-muted-foreground">Max encoded size</Label>
          <div className="flex max-w-sm gap-2">
            <Input
              className="h-9 text-sm tabular-nums"
              value={draftMaxStr}
              disabled={saving}
              onChange={(e) => setDraftMaxStrAction(e.target.value)}
            />
            <NativeSelect
              className="w-18 shrink-0"
              value={draftMaxUnit}
              disabled={saving}
              onChange={(e) => setDraftMaxUnitAction(e.target.value as MaxSizeUnit)}
            >
              <option value="kb">KB</option>
              <option value="mb">MB</option>
            </NativeSelect>
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={saving} onClick={upsertSiteDefaultPresetAction}>
          {siteDefaultPreset ? "Update" : "Create"}
        </Button>
        {siteDefaultPreset ? (
          <Button type="button" variant="outline" size="sm" disabled={saving} onClick={clearSiteDefaultPresetAction}>
            Remove
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function SiteDefaultPresetCard(props: {
  baseId: string;
  saving: boolean;
  settings: BeaconAppSettings | undefined;
  canEditSiteDefault: boolean;
  siteDefaultPreset: BeaconPresetRow | null;
  draftW: string;
  setDraftWAction: (v: string) => void;
  draftH: string;
  setDraftHAction: (v: string) => void;
  draftFormat: ImageExportFormat;
  setDraftFormatAction: (v: ImageExportFormat) => void;
  draftMaxStr: string;
  setDraftMaxStrAction: (v: string) => void;
  draftMaxUnit: MaxSizeUnit;
  setDraftMaxUnitAction: (v: MaxSizeUnit) => void;
  upsertSiteDefaultPresetAction: () => void;
  clearSiteDefaultPresetAction: () => void;
}) {
  const { saving, settings, canEditSiteDefault, siteDefaultPreset, ...editorProps } = props;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Site default preset</CardTitle>
        <CardDescription>Fallback preset when no scoped target preset matches.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {siteDefaultPreset ? (
          <SiteDefaultPresetSummary
            siteDefaultPreset={siteDefaultPreset}
            defaultExportFormat={settings?.defaultExportFormat}
          />
        ) : (
          <p className="text-sm text-muted-foreground">No site default preset yet.</p>
        )}
        {canEditSiteDefault ? (
          <SiteDefaultPresetEditor saving={saving} siteDefaultPreset={siteDefaultPreset} {...editorProps} />
        ) : null}
      </CardContent>
      {saving ? <CardFooter className="text-xs text-muted-foreground">Saving…</CardFooter> : null}
    </Card>
  );
}

function ScopedPresetListItem(props: { entry: BeaconPresetStorageEntry; defaultExportFormat?: ImageExportFormat }) {
  const { entry, defaultExportFormat } = props;
  const { row, scope } = entry;
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-2 rounded-md border border-border/50 px-3 py-2">
      <span className="font-medium text-foreground">{formatBeaconPresetDisplayName(row, scope)}</span>
      <span className="font-mono text-xs text-muted-foreground">
        {formatBeaconPresetStorageSummary(row, defaultExportFormat)}
      </span>
    </li>
  );
}

function ScopedPresetsCard(props: {
  loading: boolean;
  settings: BeaconAppSettings | undefined;
  scopedPresets: BeaconPresetStorageEntry[];
}) {
  const { loading, settings, scopedPresets } = props;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scoped presets</CardTitle>
        <CardDescription>
          Element, component, and instance presets are managed in the Beacon image editor Configure flow.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {scopedPresets.length === 0 && !loading ? (
          <p className="text-sm text-muted-foreground">No scoped presets yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {scopedPresets.map((entry) => (
              <ScopedPresetListItem
                key={entry.row.id}
                entry={entry}
                defaultExportFormat={settings?.defaultExportFormat}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function TowerBeaconPresetsPanel(props: TowerBeaconPresetsPanelProps) {
  const { loading, settings, canManage, teamPresetsLocked, canEditSiteDefault, siteDefaultPreset, ...rest } = props;

  const scopedPresets = useMemo(() => {
    if (!settings) {
      return [];
    }
    return listBeaconPresetStorageEntries(settings.imagePresetStorage).filter(({ scope }) => scope !== "site-default");
  }, [settings]);

  return (
    <div className="mt-8 space-y-6">
      <TowerBeaconPanelStatus canManage={canManage} teamPresetsLocked={teamPresetsLocked} />
      <SiteDefaultPresetCard
        canEditSiteDefault={canEditSiteDefault}
        settings={settings}
        siteDefaultPreset={siteDefaultPreset}
        {...rest}
      />
      <ScopedPresetsCard loading={loading} scopedPresets={scopedPresets} settings={settings} />
    </div>
  );
}
