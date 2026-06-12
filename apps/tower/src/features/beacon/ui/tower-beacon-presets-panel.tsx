"use client";

import type {
  BeaconAppSettings,
  BeaconPresetRow,
  BeaconPresetStorageEntry,
  ImageExportFormat,
} from "@codalyn/webflow-kit";
import {
  type BeaconPresetSiteGroup,
  buildBeaconPresetSiteGroups,
  formatBeaconPresetDisplayName,
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
import { BeaconPresetExportPlaceholder } from "@/features/beacon/ui/beacon-preset-export-placeholder";
import {
  BeaconScopedPresetFields,
  BeaconSiteDefaultPresetFields,
} from "@/features/beacon/ui/beacon-preset-form-fields";
import { TowerBeaconPresetCard } from "@/features/beacon/ui/tower-beacon-preset-card";
import { countBeaconSitePresets } from "@/features/beacon/ui/tower-beacon-preset-list";
import { TowerWebflowOAuthPopupButton } from "@/features/tower-ui/tower-webflow-oauth-popup-button";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
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
  canManage: boolean;
  teamPresetsLocked: boolean;
  canEditSiteDefault: boolean;
  upsertSiteDefaultPresetAction: (siteId: string, row: BeaconPresetRow) => void;
  clearSiteDefaultPresetAction: (siteId: string) => void;
  upsertPresetRowAction: (row: BeaconPresetRow) => void;
  removePresetByIdAction: (presetId: string) => void;
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

type PresetFormDraft = {
  draftName: string;
  draftW: string;
  draftH: string;
  draftFormat: ImageExportFormat;
  draftMaxStr: string;
  draftMaxUnit: MaxSizeUnit;
};

type SiteDefaultDraft = Omit<PresetFormDraft, "draftName">;

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

  const previewWidth = parsePresetOutputDimension(draft.draftW, 1920);
  const previewHeight = parsePresetOutputDimension(draft.draftH, 1080);

  return (
    <FormFieldInset>
      <BeaconPresetExportPlaceholder
        width={previewWidth}
        height={previewHeight}
        exportFormat={draft.draftFormat}
        defaultExportFormat={defaultExportFormat}
      />
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

function createScopedPresetDraft(row: BeaconPresetRow, defaultExportFormat: ImageExportFormat): PresetFormDraft {
  const maxDraft = maxBytesToDraft(row.maxFileSizeBytes);
  return {
    draftName: row.name,
    draftW: String(row.width),
    draftH: String(row.height),
    draftFormat: row.exportFormat ?? defaultExportFormat,
    draftMaxStr: maxDraft.value,
    draftMaxUnit: maxDraft.unit,
  };
}

function ScopedPresetEditor(props: {
  baseId: string;
  entry: BeaconPresetStorageEntry;
  saving: boolean;
  defaultExportFormat: ImageExportFormat;
  upsertPresetRowAction: (row: BeaconPresetRow) => void;
  removePresetByIdAction: (presetId: string) => void;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const {
    baseId,
    entry,
    saving,
    defaultExportFormat,
    upsertPresetRowAction,
    removePresetByIdAction,
    onCancel,
    onSaved,
  } = props;
  const { row } = entry;
  const [draft, setDraft] = useState<PresetFormDraft>(() => createScopedPresetDraft(row, defaultExportFormat));

  useEffect(() => {
    setDraft(createScopedPresetDraft(row, defaultExportFormat));
  }, [row, defaultExportFormat]);

  const save = () => {
    const name = draft.draftName.trim();
    if (name.length === 0) {
      return;
    }
    const width = parsePresetOutputDimension(draft.draftW, row.width);
    const height = parsePresetOutputDimension(draft.draftH, row.height);
    upsertPresetRowAction({
      ...row,
      name,
      width,
      height,
      exportFormat: draft.draftFormat,
      maxFileSizeBytes: draftToMaxBytes(draft.draftMaxStr, draft.draftMaxUnit),
    });
    onSaved();
  };

  const previewWidth = parsePresetOutputDimension(draft.draftW, row.width);
  const previewHeight = parsePresetOutputDimension(draft.draftH, row.height);

  return (
    <FormFieldInset>
      <BeaconPresetExportPlaceholder
        width={previewWidth}
        height={previewHeight}
        exportFormat={draft.draftFormat}
        defaultExportFormat={defaultExportFormat}
      />
      <BeaconScopedPresetFields
        baseId={`${baseId}-${row.id}`}
        disabled={saving}
        name={draft.draftName}
        width={draft.draftW}
        height={draft.draftH}
        exportFormat={draft.draftFormat}
        maxStr={draft.draftMaxStr}
        maxUnit={draft.draftMaxUnit}
        onNameChange={(value) => setDraft((current) => ({ ...current, draftName: value }))}
        onWidthChange={(value) => setDraft((current) => ({ ...current, draftW: value }))}
        onHeightChange={(value) => setDraft((current) => ({ ...current, draftH: value }))}
        onExportFormatChange={(value) => setDraft((current) => ({ ...current, draftFormat: value }))}
        onMaxStrChange={(value) => setDraft((current) => ({ ...current, draftMaxStr: value }))}
        onMaxUnitChange={(value) => setDraft((current) => ({ ...current, draftMaxUnit: value }))}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={saving || draft.draftName.trim().length === 0} onClick={save}>
          Update
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={saving}
          onClick={() => {
            removePresetByIdAction(row.id);
            onCancel();
          }}
        >
          Remove
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={saving} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </FormFieldInset>
  );
}

function ScopedPresetsSection(props: {
  baseId: string;
  group: BeaconPresetSiteGroup;
  saving: boolean;
  canEdit: boolean;
  defaultExportFormat?: ImageExportFormat;
  upsertPresetRowAction: (row: BeaconPresetRow) => void;
  removePresetByIdAction: (presetId: string) => void;
}) {
  const { baseId, group, saving, canEdit, defaultExportFormat, upsertPresetRowAction, removePresetByIdAction } = props;
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const resolvedDefaultFormat = defaultExportFormat ?? "webp";

  if (group.scopedPresets.length === 0) {
    return (
      <div className="space-y-1">
        <p className="text-sm font-medium">Scoped presets</p>
        <p className="text-sm text-muted-foreground">
          No element, component, or instance presets for this site yet. Create them in Beacon&apos;s image editor.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-medium">Scoped presets</p>
        <p className="text-sm text-muted-foreground">
          Element, component, and instance presets. Changes sync to Beacon for this workspace.
        </p>
      </div>
      <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
        {group.scopedPresets.map((entry) => {
          const isEditing = editingPresetId === entry.row.id;
          const { row, scope } = entry;
          return (
            <li key={entry.row.id} className={isEditing ? "min-w-0 sm:col-span-2" : "min-w-0"}>
              {isEditing ? (
                <ScopedPresetEditor
                  baseId={baseId}
                  entry={entry}
                  saving={saving}
                  defaultExportFormat={resolvedDefaultFormat}
                  upsertPresetRowAction={upsertPresetRowAction}
                  removePresetByIdAction={removePresetByIdAction}
                  onCancel={() => setEditingPresetId(null)}
                  onSaved={() => setEditingPresetId(null)}
                />
              ) : (
                <TowerBeaconPresetCard
                  row={row}
                  scope={scope}
                  displayName={formatBeaconPresetDisplayName(row, scope)}
                  defaultExportFormat={defaultExportFormat}
                  canEdit={canEdit}
                  onEdit={canEdit ? () => setEditingPresetId(row.id) : undefined}
                />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
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
          const presetCount = countBeaconSitePresets(group);
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

function SitePresetsDetail(props: {
  baseId: string;
  group: BeaconPresetSiteGroup;
  siteGroups: BeaconPresetSiteGroup[];
  selectedSiteId: string;
  onSelectedSiteIdChange: Dispatch<SetStateAction<string>>;
  saving: boolean;
  settings: BeaconAppSettings | undefined;
  canEditSiteDefault: boolean;
  upsertSiteDefaultPresetAction: (siteId: string, row: BeaconPresetRow) => void;
  clearSiteDefaultPresetAction: (siteId: string) => void;
  upsertPresetRowAction: (row: BeaconPresetRow) => void;
  removePresetByIdAction: (presetId: string) => void;
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
    upsertSiteDefaultPresetAction,
    clearSiteDefaultPresetAction,
    upsertPresetRowAction,
    removePresetByIdAction,
  } = props;
  const [siteDefaultFormOpen, setSiteDefaultFormOpen] = useState(false);
  const siteDefaultPreset = group.siteDefault;

  return (
    <div className="space-y-4">
      {siteGroups.length > 1 ? (
        <BeaconSitePicker
          siteGroups={siteGroups}
          selectedSiteId={selectedSiteId}
          onSelectedSiteIdChange={onSelectedSiteIdChange}
        />
      ) : null}
      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">Site default preset</p>
          <p className="text-sm text-muted-foreground">
            Used when Beacon exports images without a more specific preset.
          </p>
        </div>
        {siteDefaultPreset && !siteDefaultFormOpen ? (
          <TowerBeaconPresetCard
            row={siteDefaultPreset}
            scope="site-default"
            displayName={siteDefaultPreset.name}
            defaultExportFormat={settings?.defaultExportFormat}
            canEdit={canEditSiteDefault}
            onEdit={canEditSiteDefault ? () => setSiteDefaultFormOpen(true) : undefined}
          />
        ) : null}
        {!siteDefaultPreset && !siteDefaultFormOpen ? (
          <SiteDefaultPresetEmptyState
            canEdit={canEditSiteDefault}
            onSet={canEditSiteDefault ? () => setSiteDefaultFormOpen(true) : undefined}
          />
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
      <ScopedPresetsSection
        baseId={baseId}
        group={group}
        saving={saving}
        canEdit={canEditSiteDefault}
        defaultExportFormat={settings?.defaultExportFormat}
        upsertPresetRowAction={upsertPresetRowAction}
        removePresetByIdAction={removePresetByIdAction}
      />
      {saving ? <p className="text-xs text-muted-foreground">Saving…</p> : null}
    </div>
  );
}

export function TowerBeaconPresetsPanel(props: TowerBeaconPresetsPanelProps) {
  const {
    settings,
    webflowSites,
    webflowAppClientId,
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
                ? "Choose a site to manage its image export presets. Changes sync to Beacon."
                : "Manage image export presets for this site. Changes sync to Beacon."}
            </CardDescription>
            <CardAction align="center">
              <BeaconDesignerOpenLink shortName={selectedGroup.shortName} webflowAppClientId={webflowAppClientId} />
            </CardAction>
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
              {...siteDefaultActions}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
