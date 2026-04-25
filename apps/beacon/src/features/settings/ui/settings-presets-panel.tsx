import {
  BEACON_BUILTIN_ASPECT_PRESETS,
  BEACON_PRESET_DEFAULT_MAX_FILE_BYTES,
  BEACON_PRESET_MAX_FILE_BYTES_MAX,
  BEACON_PRESET_MAX_FILE_BYTES_MIN,
  type BeaconImagePresetRow,
  type ImageExportFormat,
} from "@codalyn/webflow-kit";
import { IconEdit } from "@tabler/icons-react";
import { ChevronDown, EyeOff, Info, Plus, Trash2 } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { parseOutputDimension } from "@/features/image-editor/lib/apply-cropped-export";
import { type AspectPreset, aspectLabels } from "@/features/image-editor/lib/aspect-preset";
import { resolvePresetExportFormat } from "@/features/image-editor/lib/export-preset";
import { formatFileSize } from "@/features/image-editor/lib/format-file-size";
import { useBeaconAppSettings } from "@/features/settings/model/beacon-app-settings-provider";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Separator } from "@/shared/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

type PresetScope = "workspace" | "designer";

type InfoTipPlacement = "default" | "dialog-header" | "dialog-field";

function InfoTip(props: { text: string; ariaLabel: string; placement?: InfoTipPlacement }) {
  const { text, ariaLabel, placement = "default" } = props;
  const isDialog = placement !== "default";
  const side = placement === "dialog-header" ? "bottom" : placement === "dialog-field" ? "top" : "top";
  const align = placement === "dialog-header" ? "center" : placement === "dialog-field" ? "start" : "center";

  return (
    <Tooltip delayDuration={isDialog ? 500 : undefined}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground inline-flex size-5 shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          aria-label={ariaLabel}
        >
          <Info className="size-3.5" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side={side}
        align={align}
        sideOffset={placement === "dialog-header" ? 6 : 4}
        className={cn("max-w-xs text-left", isDialog && "z-[100]")}
      >
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

function presetSummaryLine(p: BeaconImagePresetRow, defaultFormat: ImageExportFormat, defaultQuality: number): string {
  const fmt = resolvePresetExportFormat(p, { exportFormat: defaultFormat, exportQuality: defaultQuality });
  return `${p.width}×${p.height} · ${fmt.toUpperCase()} · max ${formatFileSize(p.maxFileSizeBytes)}`;
}

function ExportPresetPickerList(props: {
  presets: BeaconImagePresetRow[];
  scope: PresetScope;
  defaultFormat: ImageExportFormat;
  defaultQuality: number;
  listAriaLabel: string;
  optionAriaPrefix: string;
  onEdit: (id: string, scope: PresetScope) => void;
}) {
  const { presets, scope, defaultFormat, defaultQuality, listAriaLabel, optionAriaPrefix, onEdit } = props;
  return (
    <div className="space-y-1.5" role="listbox" aria-label={listAriaLabel}>
      {presets.map((p) => (
        <button
          key={p.id}
          type="button"
          role="option"
          aria-label={`Edit ${optionAriaPrefix}: ${p.name}`}
          onClick={() => onEdit(p.id, scope)}
          className={cn(
            "group flex min-w-0 w-full cursor-pointer items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2.5 text-left ring-1 ring-foreground/10 transition-colors outline-none",
            "hover:border-primary/35 hover:bg-muted/35",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          )}
        >
          <span className="min-w-0 flex flex-1 flex-col gap-0.5">
            <span className="text-xs font-medium leading-tight">{p.name}</span>
            <span className="text-muted-foreground text-[10px] tabular-nums leading-snug">
              {presetSummaryLine(p, defaultFormat, defaultQuality)}
            </span>
          </span>
          <IconEdit
            aria-hidden
            stroke={1.5}
            className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground/90"
          />
        </button>
      ))}
    </div>
  );
}

type MaxUnit = "kb" | "mb";

function draftToMaxBytes(value: string, unit: MaxUnit): number {
  const n = Number.parseFloat(value.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) {
    return BEACON_PRESET_DEFAULT_MAX_FILE_BYTES;
  }
  const raw = unit === "mb" ? n * 1024 * 1024 : n * 1024;
  return Math.min(BEACON_PRESET_MAX_FILE_BYTES_MAX, Math.max(BEACON_PRESET_MAX_FILE_BYTES_MIN, Math.round(raw)));
}

function maxBytesToDraft(bytes: number): { value: string; unit: MaxUnit } {
  if (bytes >= 1024 * 1024) {
    const mb = bytes / (1024 * 1024);
    const rounded = Math.round(mb * 10) / 10;
    return { value: Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1), unit: "mb" };
  }
  return { value: String(Math.max(1, Math.round(bytes / 1024))), unit: "kb" };
}

function bytesToStrInUnit(bytes: number, unit: MaxUnit): string {
  if (unit === "mb") {
    const mb = bytes / (1024 * 1024);
    const t = Math.max(0.01, Math.round(mb * 100) / 100);
    return t >= 10 ? t.toFixed(0) : String(t);
  }
  return String(Math.max(1, Math.round(bytes / 1024)));
}

function PresetRowFields(props: {
  baseId: string;
  preset: BeaconImagePresetRow;
  defaultFormat: ImageExportFormat;
  defaultQuality: number;
  isTowerUser: boolean;
  onUpdate: (
    patch: Partial<Pick<BeaconImagePresetRow, "name" | "width" | "height" | "exportFormat" | "maxFileSizeBytes">>
  ) => void;
  onRemove: () => void;
}) {
  const { baseId, preset: p, defaultFormat, defaultQuality, isTowerUser, onUpdate, onRemove } = props;
  const [nameDraft, setNameDraft] = useState(p.name);
  const [wStr, setWStr] = useState(String(p.width));
  const [hStr, setHStr] = useState(String(p.height));
  const [maxStr, setMaxStr] = useState(() => maxBytesToDraft(p.maxFileSizeBytes).value);
  const [maxUnit, setMaxUnit] = useState<MaxUnit>(() => maxBytesToDraft(p.maxFileSizeBytes).unit);

  const resolvedFormat = resolvePresetExportFormat(p, {
    exportFormat: defaultFormat,
    exportQuality: defaultQuality,
  });

  useEffect(() => {
    setNameDraft(p.name);
    setWStr(String(p.width));
    setHStr(String(p.height));
    const d = maxBytesToDraft(p.maxFileSizeBytes);
    setMaxStr(d.value);
    setMaxUnit(d.unit);
  }, [p.name, p.width, p.height, p.maxFileSizeBytes]);

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1.5">
        <Label className="text-[11px] text-muted-foreground" htmlFor={`${baseId}-name-${p.id}`}>
          Label
        </Label>
        <Input
          id={`${baseId}-name-${p.id}`}
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={() => {
            const t = nameDraft.trim();
            const next = t || "Untitled";
            if (next !== p.name) {
              onUpdate({ name: next });
            } else if (!t) {
              setNameDraft(next);
            }
          }}
          className="h-8 text-xs"
        />
      </div>

      <div className="space-y-1.5">
        <span className="text-[11px] text-muted-foreground">Output size (px)</span>
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-1.5 sm:max-w-sm">
          <div className="space-y-1">
            <Label className="sr-only" htmlFor={`${baseId}-w-${p.id}`}>
              Width
            </Label>
            <Input
              id={`${baseId}-w-${p.id}`}
              inputMode="numeric"
              type="text"
              className="h-8 text-xs tabular-nums"
              value={wStr}
              onChange={(e) => setWStr(e.target.value)}
              onBlur={() => {
                const n = parseOutputDimension(wStr, p.width);
                setWStr(String(n));
                if (n !== p.width) {
                  onUpdate({ width: n });
                }
              }}
            />
          </div>
          <span className="pb-2 text-center text-xs text-muted-foreground tabular-nums" aria-hidden>
            ×
          </span>
          <div className="space-y-1">
            <Label className="sr-only" htmlFor={`${baseId}-h-${p.id}`}>
              Height
            </Label>
            <Input
              id={`${baseId}-h-${p.id}`}
              inputMode="numeric"
              type="text"
              className="h-8 text-xs tabular-nums"
              value={hStr}
              onChange={(e) => setHStr(e.target.value)}
              onBlur={() => {
                const n = parseOutputDimension(hStr, p.height);
                setHStr(String(n));
                if (n !== p.height) {
                  onUpdate({ height: n });
                }
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[11px] text-muted-foreground">Codec</span>
        <ToggleGroup
          type="single"
          value={resolvedFormat}
          onValueChange={(v) => {
            if (v === "webp" || v === "avif") {
              if (v === "avif" && !isTowerUser) {
                return;
              }
              onUpdate({ exportFormat: v });
            }
          }}
          variant="outline"
          size="sm"
          className="w-full sm:max-w-sm"
        >
          <ToggleGroupItem value="webp" className="flex-1">
            WebP
          </ToggleGroupItem>
          <ToggleGroupItem value="avif" className="flex-1" disabled={!isTowerUser}>
            AVIF
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="flex flex-col gap-2 sm:max-w-xs">
        <div className="flex items-center gap-1">
          <Label className="text-[11px] text-muted-foreground" htmlFor={`${baseId}-max-${p.id}`}>
            Size cap
          </Label>
          <InfoTip
            ariaLabel="About size cap"
            placement="dialog-field"
            text="Export stops if the estimate is over this."
          />
        </div>
        <div className="flex gap-2">
          <Input
            id={`${baseId}-max-${p.id}`}
            inputMode="decimal"
            type="text"
            className="h-8 min-w-0 flex-1 text-xs tabular-nums"
            value={maxStr}
            onChange={(e) => setMaxStr(e.target.value)}
            onBlur={() => {
              const next = draftToMaxBytes(maxStr, maxUnit);
              const d = maxBytesToDraft(next);
              setMaxStr(d.value);
              setMaxUnit(d.unit);
              if (next !== p.maxFileSizeBytes) {
                onUpdate({ maxFileSizeBytes: next });
              }
            }}
          />
          <Select
            value={maxUnit}
            onValueChange={(v) => {
              if (v !== "kb" && v !== "mb") {
                return;
              }
              setMaxUnit(v);
              setMaxStr(bytesToStrInUnit(p.maxFileSizeBytes, v));
            }}
          >
            <SelectTrigger className="h-8 w-18 shrink-0 px-2 text-xs" aria-label="Unit for size cap">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="kb">KB</SelectItem>
              <SelectItem value="mb">MB</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end border-t border-border/50 pt-3">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-muted-foreground hover:text-destructive gap-1.5"
          onClick={onRemove}
        >
          <Trash2 aria-hidden className="size-3.5" />
          Delete
        </Button>
      </div>
    </div>
  );
}

export function SettingsPresetsPanel() {
  const { settings, updateSettings } = useBeaconAppSettings();
  const hiddenSet = useMemo(() => new Set(settings.hiddenBuiltinAspectPresets), [settings.hiddenBuiltinAspectPresets]);
  const canRemoveBuiltin = useMemo(() => {
    const n = BEACON_BUILTIN_ASPECT_PRESETS.filter((a) => !hiddenSet.has(a)).length;
    return n > 1;
  }, [hiddenSet]);
  const hiddenAspects = useMemo(() => BEACON_BUILTIN_ASPECT_PRESETS.filter((a) => hiddenSet.has(a)), [hiddenSet]);

  const hideBuiltin = (aspect: AspectPreset) => {
    if (!canRemoveBuiltin || hiddenSet.has(aspect)) {
      return;
    }
    updateSettings((prev) => ({
      hiddenBuiltinAspectPresets: [...prev.hiddenBuiltinAspectPresets, aspect],
    }));
  };

  const showBuiltin = (aspect: AspectPreset) => {
    updateSettings((prev) => ({
      hiddenBuiltinAspectPresets: prev.hiddenBuiltinAspectPresets.filter((a) => a !== aspect),
    }));
  };

  const aspectTileClass =
    "relative flex min-h-[2.75rem] min-w-0 flex-col items-center justify-center rounded-md border border-border/70 bg-muted/25 px-1.5 py-2 text-center";

  return (
    <div className="flex min-w-0 flex-col">
      <section className="flex min-w-0 flex-col gap-3 pb-6">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-medium">Crop aspect shortcuts</h2>
          <InfoTip
            ariaLabel="About crop aspect shortcuts"
            text="Workspace-wide in Beacon. Crop shortcuts set aspect only, not export size or compression."
          />
        </div>
        <div>
          <p className="text-muted-foreground mb-2 text-[10px] font-medium uppercase tracking-wide">Visible</p>
          <div className="grid min-w-0 grid-cols-3 gap-1.5">
            {BEACON_BUILTIN_ASPECT_PRESETS.map((aspect) => {
              if (hiddenSet.has(aspect)) {
                return null;
              }
              return (
                <div key={aspect} className={aspectTileClass}>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive absolute right-0 top-0 h-7 w-7"
                    aria-label={`Hide ${aspectLabels[aspect]}`}
                    disabled={!canRemoveBuiltin}
                    title={!canRemoveBuiltin ? "Keep at least one visible" : undefined}
                    onClick={() => hideBuiltin(aspect)}
                  >
                    <EyeOff aria-hidden className="size-3.5" />
                  </Button>
                  <span className="text-xs font-semibold leading-none">{aspectLabels[aspect]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {hiddenAspects.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 w-full justify-between gap-2 px-2.5 text-xs font-normal sm:max-w-xs"
                aria-label={`${hiddenAspects.length} hidden crop shortcuts. Open menu to restore.`}
              >
                <span className="text-muted-foreground">Hidden shortcuts</span>
                <span className="flex items-center gap-1.5">
                  <span className="text-foreground tabular-nums">{hiddenAspects.length}</span>
                  <ChevronDown aria-hidden className="size-3.5 opacity-60" />
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-44">
              <DropdownMenuLabel>Restore to crop toolbar</DropdownMenuLabel>
              {hiddenAspects.map((aspect) => (
                <DropdownMenuItem
                  key={aspect}
                  className="text-xs"
                  onSelect={() => {
                    showBuiltin(aspect);
                  }}
                >
                  {aspectLabels[aspect]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </section>
      <Separator />
      <div className="pt-6">
        <BeaconExportPresetsSection />
      </div>
    </div>
  );
}

function findEditingPresetRow(
  imagePresets: BeaconImagePresetRow[],
  designerOnlyImagePresets: BeaconImagePresetRow[],
  editing: { id: string; scope: PresetScope } | null
): BeaconImagePresetRow | undefined {
  if (!editing) {
    return undefined;
  }
  const list = editing.scope === "workspace" ? imagePresets : designerOnlyImagePresets;
  return list.find((p) => p.id === editing.id);
}

function ExportPresetScopeColumn(props: {
  createFormOpen: boolean;
  onOpenCreate: () => void;
  emptyLabel: string;
  presets: BeaconImagePresetRow[];
  scope: PresetScope;
  listAriaLabel: string;
  optionAriaPrefix: string;
  defaultFormat: ImageExportFormat;
  defaultQuality: number;
  onEditPreset: (id: string, scope: PresetScope) => void;
}) {
  const {
    createFormOpen,
    onOpenCreate,
    emptyLabel,
    presets,
    scope,
    listAriaLabel,
    optionAriaPrefix,
    defaultFormat,
    defaultQuality,
    onEditPreset,
  } = props;
  return (
    <>
      {!createFormOpen ? (
        <Button type="button" size="sm" variant="outline" className="w-full gap-1.5" onClick={onOpenCreate}>
          <Plus aria-hidden className="size-3.5" />
          Add
        </Button>
      ) : null}
      {presets.length === 0 ? (
        <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-5 text-center">
          <p className="text-muted-foreground text-[11px]">{emptyLabel}</p>
        </div>
      ) : (
        <ExportPresetPickerList
          presets={presets}
          scope={scope}
          defaultFormat={defaultFormat}
          defaultQuality={defaultQuality}
          listAriaLabel={listAriaLabel}
          optionAriaPrefix={optionAriaPrefix}
          onEdit={onEditPreset}
        />
      )}
    </>
  );
}

function CreateExportPresetDialog(props: {
  baseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  createPresetScope: PresetScope;
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
  draftMaxUnit: MaxUnit;
  setDraftMaxUnit: (v: MaxUnit) => void;
  onSave: () => void;
  onCancel: () => void;
  isTowerUser: boolean;
}) {
  const {
    baseId,
    open,
    onOpenChange,
    createPresetScope,
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
    onSave,
    onCancel,
    isTowerUser,
  } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex max-h-[min(90vh,520px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          queueMicrotask(() => {
            document.getElementById(`${baseId}-new-name`)?.focus();
          });
        }}
      >
        <DialogHeader className="shrink-0 border-b border-border/50 px-4 py-3 pr-12">
          <div className="flex items-start gap-1.5">
            <DialogTitle>
              {createPresetScope === "designer" ? "New designer-only preset" : "New workspace preset"}
            </DialogTitle>
            <InfoTip
              ariaLabel={createPresetScope === "designer" ? "About designer-only preset" : "About workspace preset"}
              placement="dialog-header"
              text={
                createPresetScope === "designer"
                  ? "This preset is hidden for members in Beacon editor mode. Designers and admins will see it in the image editor."
                  : "Shared with everyone in this workspace. All members can use this in the image editor."
              }
            />
          </div>
          <DialogDescription className="sr-only">
            {createPresetScope === "designer"
              ? "This preset is hidden for members in Beacon editor mode. Designers and admins will see it in the image editor."
              : "Shared with everyone in this workspace. All members can use this in the image editor."}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[min(70vh,28rem)]">
          <div className="flex flex-col gap-3 px-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground" htmlFor={`${baseId}-new-name`}>
                Label
              </Label>
              <Input
                id={`${baseId}-new-name`}
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                className="h-8 text-xs"
                placeholder="e.g. Hero card"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onSave();
                  }
                }}
              />
            </div>
            <div className="space-y-1.5">
              <span className="text-[11px] text-muted-foreground">Output size (px)</span>
              <div className="grid grid-cols-2 gap-2 sm:max-w-sm">
                <div className="space-y-1">
                  <Label className="sr-only" htmlFor={`${baseId}-new-w`}>
                    Width
                  </Label>
                  <Input
                    id={`${baseId}-new-w`}
                    inputMode="numeric"
                    type="text"
                    className="h-8 text-xs tabular-nums"
                    value={draftW}
                    onChange={(e) => setDraftW(e.target.value)}
                    onBlur={() => setDraftW(String(parseOutputDimension(draftW, 1920)))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="sr-only" htmlFor={`${baseId}-new-h`}>
                    Height
                  </Label>
                  <Input
                    id={`${baseId}-new-h`}
                    inputMode="numeric"
                    type="text"
                    className="h-8 text-xs tabular-nums"
                    value={draftH}
                    onChange={(e) => setDraftH(e.target.value)}
                    onBlur={() => setDraftH(String(parseOutputDimension(draftH, 1080)))}
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[11px] text-muted-foreground">Codec</span>
              <ToggleGroup
                type="single"
                value={draftFormat}
                onValueChange={(v) => {
                  if (v === "webp" || v === "avif") {
                    if (v === "avif" && !isTowerUser) {
                      return;
                    }
                    setDraftFormat(v);
                  }
                }}
                variant="outline"
                size="sm"
                className="w-full sm:max-w-sm"
              >
                <ToggleGroupItem value="webp" className="flex-1">
                  WebP
                </ToggleGroupItem>
                <ToggleGroupItem value="avif" className="flex-1" disabled={!isTowerUser}>
                  AVIF
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div className="flex flex-col gap-2 sm:max-w-xs">
              <div className="flex items-center gap-1">
                <Label className="text-[11px] text-muted-foreground" htmlFor={`${baseId}-new-max`}>
                  Size cap
                </Label>
                <InfoTip
                  ariaLabel="About size cap"
                  placement="dialog-field"
                  text="Export stops if the estimate is over this."
                />
              </div>
              <div className="flex gap-2">
                <Input
                  id={`${baseId}-new-max`}
                  inputMode="decimal"
                  type="text"
                  className="h-8 min-w-0 flex-1 text-xs tabular-nums"
                  value={draftMaxStr}
                  onChange={(e) => setDraftMaxStr(e.target.value)}
                  onBlur={() => {
                    const next = draftToMaxBytes(draftMaxStr, draftMaxUnit);
                    const d = maxBytesToDraft(next);
                    setDraftMaxStr(d.value);
                    setDraftMaxUnit(d.unit);
                  }}
                />
                <Select
                  value={draftMaxUnit}
                  onValueChange={(v) => {
                    if (v === "kb" || v === "mb") {
                      setDraftMaxUnit(v);
                    }
                  }}
                >
                  <SelectTrigger className="h-8 w-18 shrink-0 px-2 text-xs" aria-label="Unit for size cap">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="kb">KB</SelectItem>
                    <SelectItem value="mb">MB</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </ScrollArea>
        <div className="flex shrink-0 flex-wrap gap-2 border-t border-border/50 px-4 py-3">
          <Button type="button" size="sm" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" size="sm" variant="default" onClick={onSave}>
            Save preset
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditExportPresetDialog(props: {
  baseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPreset: { id: string; scope: PresetScope } | null;
  editingPresetRow: BeaconImagePresetRow | undefined;
  defaultFormat: ImageExportFormat;
  defaultQuality: number;
  isTowerUser: boolean;
  onUpdate: (
    patch: Partial<Pick<BeaconImagePresetRow, "name" | "width" | "height" | "exportFormat" | "maxFileSizeBytes">>
  ) => void;
  onRemove: () => void;
}) {
  const {
    baseId,
    open,
    onOpenChange,
    editingPreset,
    editingPresetRow,
    defaultFormat,
    defaultQuality,
    isTowerUser,
    onUpdate,
    onRemove,
  } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex max-h-[min(90vh,520px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          const id = editingPresetRow?.id;
          if (!id) {
            return;
          }
          queueMicrotask(() => {
            document.getElementById(`${baseId}-name-${id}`)?.focus();
          });
        }}
      >
        <DialogHeader className="shrink-0 border-b border-border/50 px-4 py-3 pr-12">
          <div className="flex items-start gap-1.5">
            <DialogTitle>
              {editingPreset?.scope === "designer" ? "Edit designer-only preset" : "Edit workspace preset"}
            </DialogTitle>
            <InfoTip
              ariaLabel={editingPreset?.scope === "designer" ? "About designer-only preset" : "About workspace preset"}
              placement="dialog-header"
              text={
                editingPreset?.scope === "designer"
                  ? "Designer-only preset — hidden for members in Beacon editor mode."
                  : "Workspace preset — shared with everyone in this workspace."
              }
            />
          </div>
          <DialogDescription className="sr-only">
            {editingPreset?.scope === "designer"
              ? "Designer-only preset — hidden for members in Beacon editor mode."
              : "Workspace preset — shared with everyone in this workspace."}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[min(70vh,28rem)]">
          {editingPresetRow && editingPreset ? (
            <div className="px-4 py-3">
              <PresetRowFields
                baseId={baseId}
                preset={editingPresetRow}
                defaultFormat={defaultFormat}
                defaultQuality={defaultQuality}
                isTowerUser={isTowerUser}
                onUpdate={onUpdate}
                onRemove={onRemove}
              />
            </div>
          ) : null}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

/** Preset form state + two dialogs; kept as one unit for Tower sync. */
function BeaconExportPresetsSection() {
  const baseId = useId();
  const { settings, updateSettings, isTowerUser, canManageTeamBeaconSettings } = useBeaconAppSettings();
  const [editingPreset, setEditingPreset] = useState<{ id: string; scope: PresetScope } | null>(null);
  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [createPresetScope, setCreatePresetScope] = useState<PresetScope>("workspace");
  const [draftName, setDraftName] = useState("");
  const [draftW, setDraftW] = useState("1920");
  const [draftH, setDraftH] = useState("1080");
  const [draftFormat, setDraftFormat] = useState<ImageExportFormat>(settings.defaultExportFormat);
  const [draftMaxStr, setDraftMaxStr] = useState("100");
  const [draftMaxUnit, setDraftMaxUnit] = useState<MaxUnit>("kb");

  useEffect(() => {
    setDraftFormat(settings.defaultExportFormat);
  }, [settings.defaultExportFormat]);

  useEffect(() => {
    if (createFormOpen) {
      return;
    }
    if (settings.imagePresets.length === 0 && settings.designerOnlyImagePresets.length === 0) {
      setEditingPreset(null);
    }
  }, [settings.imagePresets.length, settings.designerOnlyImagePresets.length, createFormOpen]);

  useEffect(() => {
    if (createFormOpen || !editingPreset) {
      return;
    }
    const inWorkspace = settings.imagePresets.some((p) => p.id === editingPreset.id);
    const inDesigner = settings.designerOnlyImagePresets.some((p) => p.id === editingPreset.id);
    if (!inWorkspace && !inDesigner) {
      setEditingPreset(null);
    }
  }, [createFormOpen, editingPreset, settings.imagePresets, settings.designerOnlyImagePresets]);

  const openCreate = (scope: PresetScope) => {
    setCreatePresetScope(scope);
    setCreateFormOpen(true);
    setEditingPreset(null);
  };

  const addPreset = () => {
    const name = draftName.trim();
    if (!name) {
      return;
    }
    const w = parseOutputDimension(draftW, 1920);
    const h = parseOutputDimension(draftH, 1080);
    let fmt = draftFormat;
    if (!isTowerUser && fmt === "avif") {
      fmt = "webp";
    }
    const maxFileSizeBytes = draftToMaxBytes(draftMaxStr, draftMaxUnit);
    const row: BeaconImagePresetRow = {
      id: crypto.randomUUID(),
      name,
      width: w,
      height: h,
      exportFormat: fmt,
      maxFileSizeBytes,
    };
    if (createPresetScope === "designer") {
      updateSettings((prev) => ({ designerOnlyImagePresets: [...prev.designerOnlyImagePresets, row] }));
    } else {
      updateSettings((prev) => ({ imagePresets: [...prev.imagePresets, row] }));
    }
    setCreateFormOpen(false);
    setDraftName("");
    setDraftW(String(w));
    setDraftH(String(h));
    const d = maxBytesToDraft(maxFileSizeBytes);
    setDraftMaxStr(d.value);
    setDraftMaxUnit(d.unit);
  };

  const removePreset = (id: string, scope: PresetScope) => {
    if (scope === "designer") {
      updateSettings((prev) => ({
        designerOnlyImagePresets: prev.designerOnlyImagePresets.filter((p) => p.id !== id),
      }));
    } else {
      updateSettings((prev) => ({ imagePresets: prev.imagePresets.filter((p) => p.id !== id) }));
    }
    if (editingPreset?.id === id) {
      setEditingPreset(null);
    }
  };

  const updatePreset = (
    id: string,
    scope: PresetScope,
    patch: Partial<Pick<BeaconImagePresetRow, "name" | "width" | "height" | "exportFormat" | "maxFileSizeBytes">>
  ) => {
    if (scope === "designer") {
      updateSettings((prev) => ({
        designerOnlyImagePresets: prev.designerOnlyImagePresets.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      }));
    } else {
      updateSettings((prev) => ({
        imagePresets: prev.imagePresets.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      }));
    }
  };

  const editingPresetRow = findEditingPresetRow(
    settings.imagePresets,
    settings.designerOnlyImagePresets,
    editingPreset
  );

  const onEditPreset = (id: string, scope: PresetScope) => setEditingPreset({ id, scope });

  const workspacePresetsBlock = (
    <ExportPresetScopeColumn
      createFormOpen={createFormOpen}
      onOpenCreate={() => openCreate("workspace")}
      emptyLabel="No workspace presets yet — use Add."
      presets={settings.imagePresets}
      scope="workspace"
      listAriaLabel="Workspace export presets"
      optionAriaPrefix="preset"
      defaultFormat={settings.defaultExportFormat}
      defaultQuality={settings.defaultExportQuality}
      onEditPreset={onEditPreset}
    />
  );

  const designerPresetsBlock = (
    <ExportPresetScopeColumn
      createFormOpen={createFormOpen}
      onOpenCreate={() => openCreate("designer")}
      emptyLabel="No designer-only presets yet — use Add."
      presets={settings.designerOnlyImagePresets}
      scope="designer"
      listAriaLabel="Designer-only export presets"
      optionAriaPrefix="designer preset"
      defaultFormat={settings.defaultExportFormat}
      defaultQuality={settings.defaultExportQuality}
      onEditPreset={onEditPreset}
    />
  );

  return (
    <>
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-medium">Export presets</h2>
          <InfoTip
            ariaLabel="About export presets"
            text="Shared export targets for the image editor (size, codec, file cap)."
          />
        </div>

        {!createFormOpen && canManageTeamBeaconSettings ? (
          <Tabs defaultValue="workspace" className="flex w-full flex-col gap-4">
            <TabsList className="h-8 w-full justify-start sm:w-fit">
              <TabsTrigger value="workspace" className="flex-1 sm:flex-initial">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>Workspace</span>
                  </TooltipTrigger>
                  <TooltipContent side="top" align="center" className="max-w-xs text-left">
                    Everyone in this workspace. These appear for all members in the image editor.
                  </TooltipContent>
                </Tooltip>
              </TabsTrigger>
              <TabsTrigger value="designer" className="flex-1 sm:flex-initial">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>Designers only</span>
                  </TooltipTrigger>
                  <TooltipContent side="top" align="center" className="max-w-xs text-left">
                    Hidden for members in Beacon editor mode. Designers and admins see these in the image editor.
                  </TooltipContent>
                </Tooltip>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="workspace" className="mt-0 flex flex-col gap-3 outline-none">
              {workspacePresetsBlock}
            </TabsContent>
            <TabsContent value="designer" className="mt-0 flex flex-col gap-3 outline-none">
              {designerPresetsBlock}
            </TabsContent>
          </Tabs>
        ) : null}

        {!createFormOpen && !canManageTeamBeaconSettings ? (
          <div className="flex flex-col gap-3">{workspacePresetsBlock}</div>
        ) : null}
      </section>

      <CreateExportPresetDialog
        baseId={baseId}
        open={createFormOpen}
        onOpenChange={(open) => {
          setCreateFormOpen(open);
          if (!open) {
            setEditingPreset(null);
          }
        }}
        createPresetScope={createPresetScope}
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
        onSave={addPreset}
        onCancel={() => setCreateFormOpen(false)}
        isTowerUser={isTowerUser}
      />

      <EditExportPresetDialog
        baseId={baseId}
        open={Boolean(editingPreset && editingPresetRow && !createFormOpen)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingPreset(null);
          }
        }}
        editingPreset={editingPreset}
        editingPresetRow={editingPresetRow}
        defaultFormat={settings.defaultExportFormat}
        defaultQuality={settings.defaultExportQuality}
        isTowerUser={isTowerUser}
        onUpdate={(patch) => {
          if (!editingPresetRow || !editingPreset) {
            return;
          }
          updatePreset(editingPresetRow.id, editingPreset.scope, patch);
        }}
        onRemove={() => {
          if (!editingPresetRow || !editingPreset) {
            return;
          }
          removePreset(editingPresetRow.id, editingPreset.scope);
        }}
      />
    </>
  );
}
