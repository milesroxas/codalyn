"use client";

import type {
  BeaconAppSettings,
  BeaconImagePresetRow,
  BeaconPresetRowV2,
  ImageExportFormat,
} from "@codalyn/webflow-kit";
import { IconTrash } from "@tabler/icons-react";
import { type ChangeEvent, useEffect, useState } from "react";
import {
  draftToMaxBytes,
  formatBeaconPresetMax,
  type MaxSizeUnit,
  maxBytesToDraft,
  parsePresetOutputDimension,
} from "@/features/beacon/lib/preset-dimensions";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { NativeSelect } from "@/shared/ui/native-select";

function PresetMaxEditor(props: { maxFileSizeBytes: number; onCommit: (next: number) => void; disabled?: boolean }) {
  const { maxFileSizeBytes, onCommit, disabled } = props;
  const d = maxBytesToDraft(maxFileSizeBytes);
  const [str, setStr] = useState(d.value);
  const [unit, setUnit] = useState<MaxSizeUnit>(d.unit);

  useEffect(() => {
    const next = maxBytesToDraft(maxFileSizeBytes);
    setStr(next.value);
    setUnit(next.unit);
  }, [maxFileSizeBytes]);

  const commit = (valueStr: string, valueUnit: MaxSizeUnit) => {
    onCommit(draftToMaxBytes(valueStr, valueUnit));
  };

  return (
    <div className="flex max-w-sm gap-2">
      <Input
        className="h-9 text-sm tabular-nums"
        value={str}
        disabled={disabled}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setStr(e.target.value)}
        onBlur={() => commit(str, unit)}
      />
      <NativeSelect
        className="w-18 shrink-0"
        value={unit}
        disabled={disabled}
        onChange={(e) => {
          const nu = e.target.value as MaxSizeUnit;
          setUnit(nu);
          commit(str, nu);
        }}
      >
        <option value="kb">KB</option>
        <option value="mb">MB</option>
      </NativeSelect>
    </div>
  );
}

export type TowerBeaconPresetsPanelProps = {
  baseId: string;
  loading: boolean;
  saving: boolean;
  settings: BeaconAppSettings | undefined;
  presets: BeaconImagePresetRow[];
  designerPresets: BeaconImagePresetRow[];
  presetTarget: "workspace" | "designer";
  setPresetTargetAction: (v: "workspace" | "designer") => void;
  canManage: boolean;
  teamPresetsLocked: boolean;
  canEditPresets: boolean;
  canEditSiteDefault: boolean;
  draftName: string;
  setDraftNameAction: (v: string) => void;
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
  addPresetAction: () => void;
  removePresetAction: (id: string, scope: "workspace" | "designer") => void;
  updatePresetAction: (
    id: string,
    scope: "workspace" | "designer",
    patch: Partial<Pick<BeaconImagePresetRow, "name" | "width" | "height" | "exportFormat" | "maxFileSizeBytes">>
  ) => void;
  siteDefaultPreset: BeaconPresetRowV2 | null;
  upsertSiteDefaultPresetAction: () => void;
  clearSiteDefaultPresetAction: () => void;
};

type PresetDraftFieldsProps = {
  baseId: string;
  idPrefix: "site-default" | "new";
  saving: boolean;
  showNameField: boolean;
  draftName: string;
  setDraftName: (v: string) => void;
  draftW: string;
  setDraftW: (v: string) => void;
  draftH: string;
  setDraftH: (v: string) => void;
  draftFormat: ImageExportFormat;
  setDraftFormat: (v: ImageExportFormat) => void;
  draftMaxStr: string;
  setDraftMaxStr: (v: string) => void;
  draftMaxUnit: MaxSizeUnit;
  setDraftMaxUnit: (v: MaxSizeUnit) => void;
  showPresetTargetSelect: boolean;
  presetTarget: "workspace" | "designer";
  setPresetTargetAction: (v: "workspace" | "designer") => void;
  onNameEnter?: () => void;
};

function PresetDraftFields(props: PresetDraftFieldsProps) {
  const {
    baseId,
    idPrefix,
    saving,
    showNameField,
    draftName,
    setDraftName,
    draftW,
    setDraftW,
    draftH,
    setDraftH,
    draftFormat,
    setDraftFormat,
    draftMaxStr,
    setDraftMaxStr,
    draftMaxUnit,
    setDraftMaxUnit,
    showPresetTargetSelect,
    presetTarget,
    setPresetTargetAction,
    onNameEnter,
  } = props;

  return (
    <>
      {showPresetTargetSelect ? (
        <div className="mb-3 space-y-1.5">
          <Label className="text-xs text-muted-foreground">Adds to</Label>
          <NativeSelect
            className="max-w-sm"
            value={presetTarget}
            disabled={saving}
            onChange={(e) => setPresetTargetAction(e.target.value as "workspace" | "designer")}
          >
            <option value="workspace">Workspace (everyone)</option>
            <option value="designer">Designers only</option>
          </NativeSelect>
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {showNameField ? (
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor={`${baseId}-${idPrefix}-name`}>Name</Label>
            <Input
              id={`${baseId}-${idPrefix}-name`}
              value={draftName}
              disabled={saving}
              onChange={(e) => setDraftName(e.target.value)}
              className="h-9 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onNameEnter?.();
                }
              }}
            />
          </div>
        ) : null}
        <div className="space-y-1.5">
          <Label htmlFor={`${baseId}-${idPrefix}-w`}>Width</Label>
          <Input
            id={`${baseId}-${idPrefix}-w`}
            value={draftW}
            disabled={saving}
            onChange={(e) => setDraftW(e.target.value)}
            className="h-9 text-sm tabular-nums"
            inputMode="numeric"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${baseId}-${idPrefix}-h`}>Height</Label>
          <Input
            id={`${baseId}-${idPrefix}-h`}
            value={draftH}
            disabled={saving}
            onChange={(e) => setDraftH(e.target.value)}
            className="h-9 text-sm tabular-nums"
            inputMode="numeric"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Max file size</Label>
          <div className="flex gap-2">
            <Input
              className="h-9 text-sm tabular-nums"
              value={draftMaxStr}
              disabled={saving}
              onChange={(e) => setDraftMaxStr(e.target.value)}
            />
            <NativeSelect
              className="w-18 shrink-0"
              value={draftMaxUnit}
              disabled={saving}
              onChange={(e) => setDraftMaxUnit(e.target.value as MaxSizeUnit)}
            >
              <option value="kb">KB</option>
              <option value="mb">MB</option>
            </NativeSelect>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Format</Label>
          <NativeSelect
            className="w-full"
            value={draftFormat}
            disabled={saving}
            onChange={(e) => setDraftFormat(e.target.value as ImageExportFormat)}
          >
            <option value="webp">WebP</option>
            <option value="avif">AVIF</option>
          </NativeSelect>
        </div>
      </div>
    </>
  );
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: parallel workspace + designer cards
export function TowerBeaconPresetsPanel(props: TowerBeaconPresetsPanelProps) {
  const {
    baseId,
    loading,
    saving,
    settings,
    presets,
    designerPresets,
    presetTarget,
    setPresetTargetAction,
    canManage,
    teamPresetsLocked,
    canEditPresets,
    canEditSiteDefault,
    draftName,
    setDraftNameAction,
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
    addPresetAction,
    removePresetAction,
    updatePresetAction,
    siteDefaultPreset,
    upsertSiteDefaultPresetAction,
    clearSiteDefaultPresetAction,
  } = props;

  return (
    <div className="mt-8 space-y-6">
      <div className="flex flex-wrap gap-2">
        {canManage ? <Badge>Designer</Badge> : <Badge variant="secondary">View only</Badge>}
        {teamPresetsLocked ? <Badge variant="outline">Designer features off · locked</Badge> : null}
      </div>

      {!canManage ? (
        <p className="text-sm text-muted-foreground">
          Only workspace designers (and operators) can edit shared presets. Ask a designer to update them here or in
          Beacon.
        </p>
      ) : null}
      {canManage && teamPresetsLocked ? (
        <p className="text-sm text-muted-foreground">
          Team presets are read-only while designer features are off. Turn them on under Team, or in Beacon settings.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Site default preset</CardTitle>
          <CardDescription>Fallback preset for this site when no scoped target preset matches.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {siteDefaultPreset ? (
            <div className="rounded-md border border-border/60 bg-muted/15 px-3 py-2 text-sm">
              <p className="font-medium">{siteDefaultPreset.name}</p>
              <p className="text-muted-foreground text-xs tabular-nums">
                {siteDefaultPreset.width}×{siteDefaultPreset.height}
                {siteDefaultPreset.exportFormat
                  ? ` · ${siteDefaultPreset.exportFormat}`
                  : settings?.defaultExportFormat
                    ? ` · ${settings.defaultExportFormat}`
                    : ""}{" "}
                · max {formatBeaconPresetMax(siteDefaultPreset.maxFileSizeBytes)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No site default preset yet.</p>
          )}
          {canEditSiteDefault ? (
            <div className="space-y-3 rounded-lg border border-dashed border-border/80 bg-background/50 p-3">
              <PresetDraftFields
                baseId={baseId}
                idPrefix="site-default"
                saving={saving}
                showNameField={false}
                draftName={draftName}
                setDraftName={setDraftNameAction}
                draftW={draftW}
                setDraftW={setDraftWAction}
                draftH={draftH}
                setDraftH={setDraftHAction}
                draftFormat={draftFormat}
                setDraftFormat={setDraftFormatAction}
                draftMaxStr={draftMaxStr}
                setDraftMaxStr={setDraftMaxStrAction}
                draftMaxUnit={draftMaxUnit}
                setDraftMaxUnit={setDraftMaxUnitAction}
                showPresetTargetSelect={false}
                presetTarget={presetTarget}
                setPresetTargetAction={setPresetTargetAction}
              />
              <div className="flex gap-2">
                <Button type="button" size="sm" disabled={saving} onClick={upsertSiteDefaultPresetAction}>
                  Create
                </Button>
                {siteDefaultPreset ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={saving}
                    onClick={clearSiteDefaultPresetAction}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workspace presets</CardTitle>
          <CardDescription>Visible to everyone in this workspace in Beacon.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {presets.length === 0 && !loading ? (
            <p className="text-sm text-muted-foreground">No presets yet.{canEditPresets ? " Add one below." : ""}</p>
          ) : !canEditPresets ? (
            <ul className="space-y-2 text-sm">
              {presets.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 rounded-md border border-border/50 px-3 py-2"
                >
                  <span className="font-medium text-foreground">{p.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {p.width}×{p.height}
                    {p.exportFormat
                      ? ` · ${p.exportFormat}`
                      : settings?.defaultExportFormat
                        ? ` · ${settings.defaultExportFormat}`
                        : ""}{" "}
                    · max {formatBeaconPresetMax(p.maxFileSizeBytes)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="space-y-3">
              {presets.map((p) => (
                <li
                  key={`${p.id}-${p.width}-${p.height}-${p.name}-${p.exportFormat ?? ""}-${p.maxFileSizeBytes}`}
                  className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/15 p-3 sm:flex-row sm:items-end"
                >
                  <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Name</Label>
                      <Input
                        className="h-9 text-sm"
                        defaultValue={p.name}
                        disabled={saving}
                        onBlur={(e) => {
                          const t = e.target.value.trim() || "Untitled";
                          if (t !== p.name) {
                            updatePresetAction(p.id, "workspace", { name: t });
                          }
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Width</Label>
                        <Input
                          className="h-9 text-sm tabular-nums"
                          inputMode="numeric"
                          defaultValue={String(p.width)}
                          disabled={saving}
                          onBlur={(e) => {
                            const n = parsePresetOutputDimension(e.target.value, p.width);
                            if (n !== p.width) {
                              updatePresetAction(p.id, "workspace", { width: n });
                            }
                          }}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Height</Label>
                        <Input
                          className="h-9 text-sm tabular-nums"
                          inputMode="numeric"
                          defaultValue={String(p.height)}
                          disabled={saving}
                          onBlur={(e) => {
                            const n = parsePresetOutputDimension(e.target.value, p.height);
                            if (n !== p.height) {
                              updatePresetAction(p.id, "workspace", { height: n });
                            }
                          }}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs text-muted-foreground">Format</Label>
                      <NativeSelect
                        className="w-full"
                        value={p.exportFormat ?? settings?.defaultExportFormat ?? "webp"}
                        disabled={saving}
                        onChange={(e) =>
                          updatePresetAction(p.id, "workspace", { exportFormat: e.target.value as ImageExportFormat })
                        }
                      >
                        <option value="webp">WebP</option>
                        <option value="avif">AVIF</option>
                      </NativeSelect>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs text-muted-foreground">Max encoded size</Label>
                      <PresetMaxEditor
                        maxFileSizeBytes={p.maxFileSizeBytes}
                        disabled={saving}
                        onCommit={(next) => {
                          if (next !== p.maxFileSizeBytes) {
                            updatePresetAction(p.id, "workspace", { maxFileSizeBytes: next });
                          }
                        }}
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label={`Remove ${p.name}`}
                    disabled={saving}
                    onClick={() => removePresetAction(p.id, "workspace")}
                  >
                    <IconTrash aria-hidden className="size-4" stroke={1.5} />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {canEditPresets ? (
            <div className="rounded-lg border border-dashed border-border/80 bg-background/50 p-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">New preset</p>
              <PresetDraftFields
                baseId={baseId}
                idPrefix="new"
                saving={saving}
                showNameField
                draftName={draftName}
                setDraftName={setDraftNameAction}
                draftW={draftW}
                setDraftW={setDraftWAction}
                draftH={draftH}
                setDraftH={setDraftHAction}
                draftFormat={draftFormat}
                setDraftFormat={setDraftFormatAction}
                draftMaxStr={draftMaxStr}
                setDraftMaxStr={setDraftMaxStrAction}
                draftMaxUnit={draftMaxUnit}
                setDraftMaxUnit={setDraftMaxUnitAction}
                showPresetTargetSelect
                presetTarget={presetTarget}
                setPresetTargetAction={setPresetTargetAction}
                onNameEnter={addPresetAction}
              />
              <div className="mt-3 flex justify-end">
                <Button type="button" size="sm" disabled={saving} onClick={addPresetAction}>
                  Add preset
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
        {saving ? <CardFooter className="text-xs text-muted-foreground">Saving…</CardFooter> : null}
      </Card>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Designer presets</CardTitle>
            <CardDescription>Hidden in Beacon for members without designer features.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {designerPresets.length === 0 && !loading ? (
              <p className="text-sm text-muted-foreground">
                No designer-only presets yet.{canEditPresets ? " Add one above." : ""}
              </p>
            ) : !canEditPresets ? (
              <ul className="space-y-2 text-sm">
                {designerPresets.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-baseline justify-between gap-2 rounded-md border border-border/50 px-3 py-2"
                  >
                    <span className="font-medium text-foreground">{p.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {p.width}×{p.height}
                      {p.exportFormat
                        ? ` · ${p.exportFormat}`
                        : settings?.defaultExportFormat
                          ? ` · ${settings.defaultExportFormat}`
                          : ""}{" "}
                      · max {formatBeaconPresetMax(p.maxFileSizeBytes)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="space-y-3">
                {designerPresets.map((p) => (
                  <li
                    key={`d-${p.id}-${p.width}-${p.height}-${p.name}-${p.exportFormat ?? ""}-${p.maxFileSizeBytes}`}
                    className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/15 p-3 sm:flex-row sm:items-end"
                  >
                    <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Name</Label>
                        <Input
                          className="h-9 text-sm"
                          defaultValue={p.name}
                          disabled={saving}
                          onBlur={(e) => {
                            const t = e.target.value.trim() || "Untitled";
                            if (t !== p.name) {
                              updatePresetAction(p.id, "designer", { name: t });
                            }
                          }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Width</Label>
                          <Input
                            className="h-9 text-sm tabular-nums"
                            inputMode="numeric"
                            defaultValue={String(p.width)}
                            disabled={saving}
                            onBlur={(e) => {
                              const n = parsePresetOutputDimension(e.target.value, p.width);
                              if (n !== p.width) {
                                updatePresetAction(p.id, "designer", { width: n });
                              }
                            }}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Height</Label>
                          <Input
                            className="h-9 text-sm tabular-nums"
                            inputMode="numeric"
                            defaultValue={String(p.height)}
                            disabled={saving}
                            onBlur={(e) => {
                              const n = parsePresetOutputDimension(e.target.value, p.height);
                              if (n !== p.height) {
                                updatePresetAction(p.id, "designer", { height: n });
                              }
                            }}
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-xs text-muted-foreground">Format</Label>
                        <NativeSelect
                          className="w-full"
                          value={p.exportFormat ?? settings?.defaultExportFormat ?? "webp"}
                          disabled={saving}
                          onChange={(e) =>
                            updatePresetAction(p.id, "designer", { exportFormat: e.target.value as ImageExportFormat })
                          }
                        >
                          <option value="webp">WebP</option>
                          <option value="avif">AVIF</option>
                        </NativeSelect>
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-xs text-muted-foreground">Max encoded size</Label>
                        <PresetMaxEditor
                          maxFileSizeBytes={p.maxFileSizeBytes}
                          disabled={saving}
                          onCommit={(next) => {
                            if (next !== p.maxFileSizeBytes) {
                              updatePresetAction(p.id, "designer", { maxFileSizeBytes: next });
                            }
                          }}
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${p.name}`}
                      disabled={saving}
                      onClick={() => removePresetAction(p.id, "designer")}
                    >
                      <IconTrash aria-hidden className="size-4" stroke={1.5} />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
          {saving ? <CardFooter className="text-xs text-muted-foreground">Saving…</CardFooter> : null}
        </Card>
      ) : null}
    </div>
  );
}
