"use client";

import type { BeaconAppSettings, BeaconImagePresetRow, ImageExportFormat } from "@codalyn/webflow-kit";
import { IconTrash } from "@tabler/icons-react";
import { type ChangeEvent, useEffect, useState } from "react";
import {
  draftToMaxBytes,
  formatBeaconPresetMax,
  type MaxSizeUnit,
  maxBytesToDraft,
  parsePresetOutputDimension,
} from "@/features/beacon/lib/preset-dimensions";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

const nativeSelectClass = cn(
  "rounded-lg border border-input bg-transparent text-sm text-foreground outline-none",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
);

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
      <select
        className={cn("h-9 w-18 shrink-0 px-2", nativeSelectClass)}
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
      </select>
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
  setPresetTarget: (v: "workspace" | "designer") => void;
  canManage: boolean;
  teamPresetsLocked: boolean;
  canEditPresets: boolean;
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
  addPreset: () => void;
  removePreset: (id: string, scope: "workspace" | "designer") => void;
  updatePreset: (
    id: string,
    scope: "workspace" | "designer",
    patch: Partial<Pick<BeaconImagePresetRow, "name" | "width" | "height" | "exportFormat" | "maxFileSizeBytes">>
  ) => void;
};

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
    setPresetTarget,
    canManage,
    teamPresetsLocked,
    canEditPresets,
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
    addPreset,
    removePreset,
    updatePreset,
  } = props;

  return (
    <div className="mt-8 space-y-6">
      <div className="flex flex-wrap gap-2">
        {canManage ? <Badge>Designer</Badge> : <Badge variant="secondary">View only</Badge>}
        {teamPresetsLocked ? <Badge variant="outline">Editor experience · presets locked</Badge> : null}
      </div>

      {!canManage ? (
        <p className="text-sm text-muted-foreground">
          Only workspace designers (and operators) can edit shared presets. Ask a designer to update them here or in
          Beacon.
        </p>
      ) : null}
      {canManage && teamPresetsLocked ? (
        <p className="text-sm text-muted-foreground">
          Team presets cannot be changed while your account uses Beacon editor mode. Adjust this under Team, or in
          Beacon settings.
        </p>
      ) : null}

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
                            updatePreset(p.id, "workspace", { name: t });
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
                              updatePreset(p.id, "workspace", { width: n });
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
                              updatePreset(p.id, "workspace", { height: n });
                            }
                          }}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs text-muted-foreground">Format</Label>
                      <select
                        className={cn("h-9 w-full px-2.5", nativeSelectClass)}
                        value={p.exportFormat ?? settings?.defaultExportFormat ?? "webp"}
                        disabled={saving}
                        onChange={(e) =>
                          updatePreset(p.id, "workspace", { exportFormat: e.target.value as ImageExportFormat })
                        }
                      >
                        <option value="webp">WebP</option>
                        <option value="avif">AVIF</option>
                      </select>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs text-muted-foreground">Max encoded size</Label>
                      <PresetMaxEditor
                        maxFileSizeBytes={p.maxFileSizeBytes}
                        disabled={saving}
                        onCommit={(next) => {
                          if (next !== p.maxFileSizeBytes) {
                            updatePreset(p.id, "workspace", { maxFileSizeBytes: next });
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
                    onClick={() => removePreset(p.id, "workspace")}
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
              <div className="mb-3 space-y-1.5">
                <Label className="text-xs text-muted-foreground">Adds to</Label>
                <select
                  className={cn("h-9 w-full max-w-sm px-2.5", nativeSelectClass)}
                  value={presetTarget}
                  disabled={saving}
                  onChange={(e) => setPresetTarget(e.target.value as "workspace" | "designer")}
                >
                  <option value="workspace">Workspace (everyone)</option>
                  <option value="designer">Designers only</option>
                </select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor={`${baseId}-new-name`}>Name</Label>
                  <Input
                    id={`${baseId}-new-name`}
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    className="h-9 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addPreset();
                      }
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${baseId}-new-w`}>Width</Label>
                  <Input
                    id={`${baseId}-new-w`}
                    value={draftW}
                    onChange={(e) => setDraftW(e.target.value)}
                    className="h-9 text-sm tabular-nums"
                    inputMode="numeric"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${baseId}-new-h`}>Height</Label>
                  <Input
                    id={`${baseId}-new-h`}
                    value={draftH}
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
                      onChange={(e) => setDraftMaxStr(e.target.value)}
                    />
                    <select
                      className={cn("h-9 w-18 shrink-0 px-2", nativeSelectClass)}
                      value={draftMaxUnit}
                      onChange={(e) => setDraftMaxUnit(e.target.value as MaxSizeUnit)}
                    >
                      <option value="kb">KB</option>
                      <option value="mb">MB</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Format</Label>
                  <select
                    className={cn("h-9 w-full px-2.5", nativeSelectClass)}
                    value={draftFormat}
                    onChange={(e) => setDraftFormat(e.target.value as ImageExportFormat)}
                  >
                    <option value="webp">WebP</option>
                    <option value="avif">AVIF</option>
                  </select>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <Button type="button" size="sm" disabled={saving} onClick={addPreset}>
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
            <CardDescription>Not shown to members in Beacon editor mode.</CardDescription>
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
                              updatePreset(p.id, "designer", { name: t });
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
                                updatePreset(p.id, "designer", { width: n });
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
                                updatePreset(p.id, "designer", { height: n });
                              }
                            }}
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-xs text-muted-foreground">Format</Label>
                        <select
                          className={cn("h-9 w-full px-2.5", nativeSelectClass)}
                          value={p.exportFormat ?? settings?.defaultExportFormat ?? "webp"}
                          disabled={saving}
                          onChange={(e) =>
                            updatePreset(p.id, "designer", { exportFormat: e.target.value as ImageExportFormat })
                          }
                        >
                          <option value="webp">WebP</option>
                          <option value="avif">AVIF</option>
                        </select>
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-xs text-muted-foreground">Max encoded size</Label>
                        <PresetMaxEditor
                          maxFileSizeBytes={p.maxFileSizeBytes}
                          disabled={saving}
                          onCommit={(next) => {
                            if (next !== p.maxFileSizeBytes) {
                              updatePreset(p.id, "designer", { maxFileSizeBytes: next });
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
                      onClick={() => removePreset(p.id, "designer")}
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
