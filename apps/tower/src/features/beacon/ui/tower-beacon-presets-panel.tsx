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
import { BeaconDesignerOpenLink } from "@/features/beacon/ui/beacon-designer-open-link";
import { BeaconSiteDefaultPresetFields } from "@/features/beacon/ui/beacon-preset-form-fields";
import { TowerWebflowOAuthPopupButton } from "@/features/tower-ui/tower-webflow-oauth-popup-button";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { FormFieldInset } from "@/shared/ui/form-field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

export type TowerBeaconWebflowSite = {
  id: string;
  displayName?: string;
  shortName?: string;
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
  webflowAppClientId: string | null;
  webflowBeaconMarketplaceUrl?: string | null;
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
      {teamPresetsLocked ? (
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">Designer features off · locked</Badge>
        </div>
      ) : null}
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

function SiteDefaultPresetEmptyState(props: { canEdit: boolean; onSet?: () => void }) {
  const { canEdit, onSet } = props;

  return (
    <Card size="sm">
      <CardContent className="flex flex-col items-center gap-4 px-4 py-6 text-center">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">No site default preset has been set</p>
          <p className="text-sm text-muted-foreground">
            Set a default format, size, and file limit for images exported from this site.
          </p>
        </div>
        {canEdit ? (
          <Button type="button" onClick={onSet}>
            Set site default preset
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SiteDefaultPresetEditor(props: {
  baseId: string;
  siteId: string;
  saving: boolean;
  siteDefaultPreset: BeaconPresetRow | null;
  defaultExportFormat: ImageExportFormat;
  upsertSiteDefaultPresetAction: (siteId: string, row: BeaconPresetRow) => void;
  clearSiteDefaultPresetAction: (siteId: string) => void;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const {
    baseId,
    siteId,
    saving,
    siteDefaultPreset,
    defaultExportFormat,
    upsertSiteDefaultPresetAction,
    clearSiteDefaultPresetAction,
    onCancel,
    onSaved,
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
    onSaved();
  };

  return (
    <FormFieldInset>
      <BeaconSiteDefaultPresetFields
        baseId={`${baseId}-${siteId}`}
        disabled={saving}
        width={draft.draftW}
        height={draft.draftH}
        exportFormat={draft.draftFormat}
        maxStr={draft.draftMaxStr}
        maxUnit={draft.draftMaxUnit}
        onWidthChange={(value) => setDraft((current) => ({ ...current, draftW: value }))}
        onHeightChange={(value) => setDraft((current) => ({ ...current, draftH: value }))}
        onExportFormatChange={(value) => setDraft((current) => ({ ...current, draftFormat: value }))}
        onMaxStrChange={(value) => setDraft((current) => ({ ...current, draftMaxStr: value }))}
        onMaxUnitChange={(value) => setDraft((current) => ({ ...current, draftMaxUnit: value }))}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={saving} onClick={save}>
          {siteDefaultPreset ? "Update" : "Create"}
        </Button>
        {siteDefaultPreset ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={() => {
              clearSiteDefaultPresetAction(siteId);
              onCancel();
            }}
          >
            Remove
          </Button>
        ) : null}
        <Button type="button" variant="outline" size="sm" disabled={saving} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </FormFieldInset>
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
      <SelectTrigger aria-label="Webflow site" width="menu">
        <SelectValue placeholder="Select site" />
      </SelectTrigger>
      <SelectContent>
        {siteGroups.map((group) => {
          const presetCount = countSitePresets(group);
          const presetSuffix = presetCount > 0 ? ` · ${presetCount} preset${presetCount === 1 ? "" : "s"}` : "";
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
  siteGroups: BeaconPresetSiteGroup[];
  selectedSiteId: string;
  onSelectedSiteIdChange: Dispatch<SetStateAction<string>>;
  saving: boolean;
  settings: BeaconAppSettings | undefined;
  canEditSiteDefault: boolean;
  webflowAppClientId: string | null;
  webflowBeaconMarketplaceUrl?: string | null;
  upsertSiteDefaultPresetAction: (siteId: string, row: BeaconPresetRow) => void;
  clearSiteDefaultPresetAction: (siteId: string) => void;
}) {
  const {
    baseId,
    group,
    siteGroups,
    selectedSiteId,
    onSelectedSiteIdChange,
    saving,
    settings,
    canEditSiteDefault,
    webflowAppClientId,
    webflowBeaconMarketplaceUrl,
    upsertSiteDefaultPresetAction,
    clearSiteDefaultPresetAction,
  } = props;
  const [siteDefaultFormOpen, setSiteDefaultFormOpen] = useState(false);
  const siteDefaultPreset = group.siteDefault;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <BeaconSitePicker
          siteGroups={siteGroups}
          selectedSiteId={selectedSiteId}
          onSelectedSiteIdChange={onSelectedSiteIdChange}
        />
        <BeaconDesignerOpenLink
          siteDisplayName={group.displayName}
          shortName={group.shortName}
          webflowAppClientId={webflowAppClientId}
          webflowBeaconMarketplaceUrl={webflowBeaconMarketplaceUrl}
        />
      </div>
      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">Site default preset</p>
          <p className="text-sm text-muted-foreground">
            Used when Beacon exports images without a more specific preset.
          </p>
        </div>
        {siteDefaultPreset ? (
          <SiteDefaultPresetSummary
            siteDefaultPreset={siteDefaultPreset}
            defaultExportFormat={settings?.defaultExportFormat}
          />
        ) : null}
        {!siteDefaultPreset && !siteDefaultFormOpen ? (
          <SiteDefaultPresetEmptyState
            canEdit={canEditSiteDefault}
            onSet={canEditSiteDefault ? () => setSiteDefaultFormOpen(true) : undefined}
          />
        ) : null}
        {canEditSiteDefault && siteDefaultPreset && !siteDefaultFormOpen ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setSiteDefaultFormOpen(true)}>
            Edit site default preset
          </Button>
        ) : null}
        {canEditSiteDefault && siteDefaultFormOpen ? (
          <SiteDefaultPresetEditor
            baseId={baseId}
            siteId={group.siteId}
            saving={saving}
            siteDefaultPreset={siteDefaultPreset}
            defaultExportFormat={settings?.defaultExportFormat ?? "webp"}
            upsertSiteDefaultPresetAction={upsertSiteDefaultPresetAction}
            clearSiteDefaultPresetAction={clearSiteDefaultPresetAction}
            onCancel={() => setSiteDefaultFormOpen(false)}
            onSaved={() => setSiteDefaultFormOpen(false)}
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
  const {
    settings,
    webflowSites,
    webflowAppClientId,
    webflowBeaconMarketplaceUrl,
    canManage,
    teamPresetsLocked,
    canEditSiteDefault,
    ...siteDefaultActions
  } = props;

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
                ? "Choose a site to manage its image export presets."
                : "Manage image export presets for this site."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SitePresetsDetail
              key={selectedGroup.siteId}
              group={selectedGroup}
              siteGroups={siteGroups}
              selectedSiteId={selectedSiteId}
              onSelectedSiteIdChange={setSelectedSiteId}
              settings={settings}
              canEditSiteDefault={canEditSiteDefault}
              webflowAppClientId={webflowAppClientId}
              webflowBeaconMarketplaceUrl={webflowBeaconMarketplaceUrl}
              {...siteDefaultActions}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
