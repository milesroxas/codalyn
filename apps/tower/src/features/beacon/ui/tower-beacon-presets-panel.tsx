"use client";

import type { BeaconAppSettings, BeaconPresetRow, ImageExportFormat } from "@codalyn/webflow-kit";
import {
  type BeaconPresetSiteGroup,
  type BeaconPresetStorageEntry,
  buildBeaconPresetSiteGroups,
  formatBeaconPresetDisplayName,
  formatBeaconPresetMax,
  formatBeaconPresetStorageSummary,
} from "@codalyn/webflow-kit";
import { IconPlug } from "@tabler/icons-react";
import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from "react";
import {
  draftToMaxBytes,
  type MaxSizeUnit,
  maxBytesToDraft,
  parsePresetOutputDimension,
} from "@/features/beacon/lib/preset-dimensions";
import { TowerWebflowOAuthPopupButton } from "@/features/tower-ui/tower-webflow-oauth-popup-button";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { NativeSelect } from "@/shared/ui/native-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

export type TowerBeaconWebflowSite = {
  id: string;
  displayName?: string;
};

export function TowerBeaconConnectEmptyState(props: {
  webflowOAuthConnected: boolean;
  oauthConfigured: boolean;
  canConnectWebflow: boolean;
  onConnectSuccess: () => void;
}) {
  const { webflowOAuthConnected, oauthConfigured, canConnectWebflow, onConnectSuccess } = props;
  const connectLabel = webflowOAuthConnected ? "Relink Webflow" : "Connect Webflow";

  return (
    <Card size="sm">
      <CardContent className="flex flex-col items-center gap-4 px-6 py-14 text-center">
        <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <IconPlug className="size-6" aria-hidden />
        </span>
        <div className="max-w-md space-y-2">
          <p className="text-base font-semibold text-foreground">
            {webflowOAuthConnected ? "No Webflow sites yet" : "Connect Webflow to get started"}
          </p>
          <p className="text-sm text-muted-foreground">
            {webflowOAuthConnected
              ? "Your workspace is linked, but no sites were returned. Relink if access changed recently."
              : "Authorize Webflow for this workspace to list sites and configure Beacon image presets per site."}
          </p>
        </div>
        {canConnectWebflow && oauthConfigured ? (
          <TowerWebflowOAuthPopupButton variant="default" onSuccess={onConnectSuccess}>
            {connectLabel}
          </TowerWebflowOAuthPopupButton>
        ) : canConnectWebflow ? (
          <p className="text-xs text-muted-foreground">Webflow OAuth is not configured on this Tower instance.</p>
        ) : (
          <p className="text-xs text-muted-foreground">Ask a workspace admin to connect Webflow.</p>
        )}
      </CardContent>
    </Card>
  );
}

export type TowerBeaconPresetsPanelProps = {
  baseId: string;
  loading: boolean;
  saving: boolean;
  settings: BeaconAppSettings | undefined;
  webflowSites: TowerBeaconWebflowSite[] | null;
  canManage: boolean;
  teamPresetsLocked: boolean;
  canEditSiteDefault: boolean;
  upsertSiteDefaultPresetAction: (siteId: string, row: BeaconPresetRow) => void;
  clearSiteDefaultPresetAction: (siteId: string) => void;
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
          Team presets are read-only while designer features are off. Enable designer features above.
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

type SiteDefaultDraft = {
  draftW: string;
  draftH: string;
  draftFormat: ImageExportFormat;
  draftMaxStr: string;
  draftMaxUnit: MaxSizeUnit;
};

function createSiteDefaultDraft(
  siteDefaultPreset: BeaconPresetRow | null,
  defaultExportFormat: ImageExportFormat
): SiteDefaultDraft {
  if (siteDefaultPreset == null) {
    return {
      draftW: "1920",
      draftH: "1080",
      draftFormat: defaultExportFormat,
      draftMaxStr: "100",
      draftMaxUnit: "kb",
    };
  }
  const maxDraft = maxBytesToDraft(siteDefaultPreset.maxFileSizeBytes);
  return {
    draftW: String(siteDefaultPreset.width),
    draftH: String(siteDefaultPreset.height),
    draftFormat: siteDefaultPreset.exportFormat ?? defaultExportFormat,
    draftMaxStr: maxDraft.value,
    draftMaxUnit: maxDraft.unit,
  };
}

function SiteDefaultPresetEditor(props: {
  baseId: string;
  siteId: string;
  saving: boolean;
  siteDefaultPreset: BeaconPresetRow | null;
  defaultExportFormat: ImageExportFormat;
  upsertSiteDefaultPresetAction: (siteId: string, row: BeaconPresetRow) => void;
  clearSiteDefaultPresetAction: (siteId: string) => void;
}) {
  const {
    baseId,
    siteId,
    saving,
    siteDefaultPreset,
    defaultExportFormat,
    upsertSiteDefaultPresetAction,
    clearSiteDefaultPresetAction,
  } = props;
  const [draft, setDraft] = useState<SiteDefaultDraft>(() =>
    createSiteDefaultDraft(siteDefaultPreset, defaultExportFormat)
  );

  useEffect(() => {
    setDraft(createSiteDefaultDraft(siteDefaultPreset, defaultExportFormat));
  }, [siteDefaultPreset, defaultExportFormat]);

  const save = () => {
    const width = parsePresetOutputDimension(draft.draftW, 1920);
    const height = parsePresetOutputDimension(draft.draftH, 1080);
    upsertSiteDefaultPresetAction(siteId, {
      id: siteDefaultPreset?.id ?? crypto.randomUUID(),
      name: "Site default",
      width,
      height,
      exportFormat: draft.draftFormat,
      maxFileSizeBytes: draftToMaxBytes(draft.draftMaxStr, draft.draftMaxUnit),
      targetKey: { kind: "site-default", siteId },
    });
  };

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-border/80 bg-background/50 p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${baseId}-${siteId}-site-default-w`}>Width</Label>
          <Input
            id={`${baseId}-${siteId}-site-default-w`}
            value={draft.draftW}
            disabled={saving}
            onChange={(event) => setDraft((current) => ({ ...current, draftW: event.target.value }))}
            className="h-9 text-sm tabular-nums"
            inputMode="numeric"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${baseId}-${siteId}-site-default-h`}>Height</Label>
          <Input
            id={`${baseId}-${siteId}-site-default-h`}
            value={draft.draftH}
            disabled={saving}
            onChange={(event) => setDraft((current) => ({ ...current, draftH: event.target.value }))}
            className="h-9 text-sm tabular-nums"
            inputMode="numeric"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`${baseId}-${siteId}-site-default-format`}>Format</Label>
          <NativeSelect
            id={`${baseId}-${siteId}-site-default-format`}
            className="w-full"
            value={draft.draftFormat}
            disabled={saving}
            onChange={(event) =>
              setDraft((current) => ({ ...current, draftFormat: event.target.value as ImageExportFormat }))
            }
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
              value={draft.draftMaxStr}
              disabled={saving}
              onChange={(event) => setDraft((current) => ({ ...current, draftMaxStr: event.target.value }))}
            />
            <NativeSelect
              className="w-18 shrink-0"
              value={draft.draftMaxUnit}
              disabled={saving}
              onChange={(event) =>
                setDraft((current) => ({ ...current, draftMaxUnit: event.target.value as MaxSizeUnit }))
              }
            >
              <option value="kb">KB</option>
              <option value="mb">MB</option>
            </NativeSelect>
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={saving} onClick={save}>
          {siteDefaultPreset ? "Update" : "Create"}
        </Button>
        {siteDefaultPreset ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={() => clearSiteDefaultPresetAction(siteId)}
          >
            Remove
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function countSitePresets(group: BeaconPresetSiteGroup): number {
  return group.scopedPresets.length + (group.siteDefault ? 1 : 0);
}

function BeaconSitePicker(props: {
  siteGroups: BeaconPresetSiteGroup[];
  selectedSiteId: string;
  onSelectedSiteIdChange: Dispatch<SetStateAction<string>>;
}) {
  const { siteGroups, selectedSiteId, onSelectedSiteIdChange } = props;

  if (siteGroups.length <= 1) {
    return null;
  }

  return (
    <Select value={selectedSiteId} onValueChange={onSelectedSiteIdChange}>
      <SelectTrigger aria-label="Webflow site" className="w-56 max-w-full">
        <SelectValue placeholder="Select site" />
      </SelectTrigger>
      <SelectContent>
        {siteGroups.map((group) => {
          const presetCount = countSitePresets(group);
          const presetSuffix =
            presetCount > 0 ? ` · ${presetCount} preset${presetCount === 1 ? "" : "s"}` : " · no presets";
          return (
            <SelectItem key={group.siteId} value={group.siteId}>
              {group.displayName}
              {presetSuffix}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
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

function SitePresetsDetail(props: {
  baseId: string;
  group: BeaconPresetSiteGroup;
  saving: boolean;
  settings: BeaconAppSettings | undefined;
  canEditSiteDefault: boolean;
  upsertSiteDefaultPresetAction: (siteId: string, row: BeaconPresetRow) => void;
  clearSiteDefaultPresetAction: (siteId: string) => void;
}) {
  const {
    baseId,
    group,
    saving,
    settings,
    canEditSiteDefault,
    upsertSiteDefaultPresetAction,
    clearSiteDefaultPresetAction,
  } = props;
  const presetCount = countSitePresets(group);

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Site ID <span className="font-mono">{group.siteId}</span>
        {presetCount > 0 ? ` · ${presetCount} preset${presetCount === 1 ? "" : "s"}` : " · no presets yet"}
      </p>
      <div className="space-y-3">
        <p className="text-sm font-medium">Site default</p>
        {group.siteDefault ? (
          <SiteDefaultPresetSummary
            siteDefaultPreset={group.siteDefault}
            defaultExportFormat={settings?.defaultExportFormat}
          />
        ) : (
          <p className="text-sm text-muted-foreground">No site default preset yet.</p>
        )}
        {canEditSiteDefault ? (
          <SiteDefaultPresetEditor
            baseId={baseId}
            siteId={group.siteId}
            saving={saving}
            siteDefaultPreset={group.siteDefault}
            defaultExportFormat={settings?.defaultExportFormat ?? "webp"}
            upsertSiteDefaultPresetAction={upsertSiteDefaultPresetAction}
            clearSiteDefaultPresetAction={clearSiteDefaultPresetAction}
          />
        ) : null}
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Scoped presets</p>
        {group.scopedPresets.length === 0 ? (
          <p className="text-sm text-muted-foreground">Managed in the Beacon image editor.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {group.scopedPresets.map((entry) => (
              <ScopedPresetListItem
                key={entry.row.id}
                entry={entry}
                defaultExportFormat={settings?.defaultExportFormat}
              />
            ))}
          </ul>
        )}
      </div>
      {saving ? <p className="text-xs text-muted-foreground">Saving…</p> : null}
    </div>
  );
}

export function TowerBeaconPresetsPanel(props: TowerBeaconPresetsPanelProps) {
  const { settings, webflowSites, canManage, teamPresetsLocked, canEditSiteDefault, ...siteDefaultActions } = props;

  const siteGroups = useMemo(() => {
    if (!settings) {
      return [];
    }
    return buildBeaconPresetSiteGroups(settings.imagePresetStorage, webflowSites ?? []);
  }, [settings, webflowSites]);

  const [selectedSiteId, setSelectedSiteId] = useState(() => siteGroups[0]?.siteId ?? "");

  useEffect(() => {
    if (siteGroups.length === 0) {
      return;
    }
    const stillExists = siteGroups.some((group) => group.siteId === selectedSiteId);
    if (!stillExists) {
      setSelectedSiteId(siteGroups[0]?.siteId ?? "");
    }
  }, [selectedSiteId, siteGroups]);

  const selectedGroup = siteGroups.find((group) => group.siteId === selectedSiteId) ?? siteGroups[0] ?? null;
  const multipleSites = siteGroups.length > 1;

  return (
    <div className="mt-8 space-y-6">
      <TowerBeaconPanelStatus canManage={canManage} teamPresetsLocked={teamPresetsLocked} />
      {selectedGroup ? (
        <Card>
          <CardHeader>
            <CardTitle>{multipleSites ? "Webflow sites" : selectedGroup.displayName}</CardTitle>
            <CardDescription>
              {multipleSites
                ? `${siteGroups.length} sites linked to this workspace. Choose one to configure image presets.`
                : "Configure the site default preset here. Scoped presets are managed in the Beacon image editor."}
            </CardDescription>
            {multipleSites ? (
              <CardAction>
                <BeaconSitePicker
                  siteGroups={siteGroups}
                  selectedSiteId={selectedSiteId}
                  onSelectedSiteIdChange={setSelectedSiteId}
                />
              </CardAction>
            ) : null}
          </CardHeader>
          <CardContent>
            <SitePresetsDetail
              group={selectedGroup}
              settings={settings}
              canEditSiteDefault={canEditSiteDefault}
              {...siteDefaultActions}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
