import type { ExportConstraints, ImageExportFormat, MaxSizeUnit, PresetCrudScope } from "@codalyn/webflow-kit";
import {
  draftToMaxBytes,
  IMAGE_EXPORT_FORMAT_OPTIONS,
  isImageExportFormat,
  isMaxSizeUnit,
  MAX_SIZE_UNIT_OPTIONS,
  maxBytesToDraft,
  parsePositiveIntegerString,
} from "@codalyn/webflow-kit";
import { useState } from "react";
import type { ImagePageTarget } from "@/features/image-editor/lib/scan-image-targets-on-page";
import { ImagePageTargetSurfaceSummary } from "@/features/image-editor/ui/image-editor-page-target-surface-summary";
import { FormFieldsCard } from "@/shared/ui/card";
import { Checkbox } from "@/shared/ui/checkbox";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

function ExportDimensionInputs(props: {
  baseId: string;
  savePending: boolean;
  wStr: string;
  setWStr: (v: string) => void;
  hStr: string;
  setHStr: (v: string) => void;
}) {
  const { baseId, savePending, wStr, setWStr, hStr, setHStr } = props;
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="space-y-1.5">
        <Label htmlFor={`${baseId}-preset-w`} className="text-xs">
          Width (px)
        </Label>
        <Input
          id={`${baseId}-preset-w`}
          inputMode="numeric"
          value={wStr}
          onChange={(e) => setWStr(e.target.value)}
          className="min-w-0 tabular-nums"
          disabled={savePending}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${baseId}-preset-h`} className="text-xs">
          Height (px)
        </Label>
        <Input
          id={`${baseId}-preset-h`}
          inputMode="numeric"
          value={hStr}
          onChange={(e) => setHStr(e.target.value)}
          className="min-w-0 tabular-nums"
          disabled={savePending}
        />
      </div>
    </div>
  );
}

function PresetFormEncodingFields(props: {
  baseId: string;
  savePending: boolean;
  maxSizeStr: string;
  setMaxSizeStr: (v: string) => void;
  maxSizeUnit: MaxSizeUnit;
  setMaxSizeUnit: (v: MaxSizeUnit) => void;
  formatEnabled: boolean;
  setFormatEnabled: (v: boolean) => void;
  formatDraft: ImageExportFormat;
  setFormatDraft: (v: ImageExportFormat) => void;
}) {
  const {
    baseId,
    savePending,
    maxSizeStr,
    setMaxSizeStr,
    maxSizeUnit,
    setMaxSizeUnit,
    formatEnabled,
    setFormatEnabled,
    formatDraft,
    setFormatDraft,
  } = props;
  const formatToggleId = `${baseId}-preset-format-toggle`;
  const maxSizeId = `${baseId}-preset-max-size`;

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor={maxSizeId} className="text-xs">
          Max file size
        </Label>
        <div className="flex gap-2">
          <Input
            id={maxSizeId}
            inputMode="decimal"
            value={maxSizeStr}
            onChange={(e) => setMaxSizeStr(e.target.value)}
            className="min-w-0 tabular-nums"
            disabled={savePending}
          />
          <Select value={maxSizeUnit} onValueChange={(v) => isMaxSizeUnit(v) && setMaxSizeUnit(v)}>
            <SelectTrigger className="w-20 shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              {MAX_SIZE_UNIT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <Checkbox
            id={formatToggleId}
            checked={formatEnabled}
            onCheckedChange={(checked) => setFormatEnabled(checked === true)}
            disabled={savePending}
          />
          <Label htmlFor={formatToggleId}>Set preset export format</Label>
        </div>
        {formatEnabled ? (
          <Select value={formatDraft} onValueChange={(v) => isImageExportFormat(v) && setFormatDraft(v)}>
            <SelectTrigger size="full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              {IMAGE_EXPORT_FORMAT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-muted-foreground text-xs">Uses workspace default format.</p>
        )}
      </div>
    </>
  );
}

export function PresetFormStep2(props: {
  baseId: string;
  savePending: boolean;
  presetScope: PresetCrudScope;
  surfaceTarget: ImagePageTarget | null;
  surfaceDiscoveryPending?: boolean;
  nameDraft: string;
  setNameDraft: (v: string) => void;
  wStr: string;
  setWStr: (v: string) => void;
  hStr: string;
  setHStr: (v: string) => void;
  maxSizeStr: string;
  setMaxSizeStr: (v: string) => void;
  maxSizeUnit: MaxSizeUnit;
  setMaxSizeUnit: (v: MaxSizeUnit) => void;
  formatEnabled: boolean;
  setFormatEnabled: (v: boolean) => void;
  formatDraft: ImageExportFormat;
  setFormatDraft: (v: ImageExportFormat) => void;
}) {
  const {
    baseId,
    savePending,
    presetScope,
    surfaceTarget,
    surfaceDiscoveryPending = false,
    nameDraft,
    setNameDraft,
    wStr,
    setWStr,
    hStr,
    setHStr,
    maxSizeStr,
    setMaxSizeStr,
    maxSizeUnit,
    setMaxSizeUnit,
    formatEnabled,
    setFormatEnabled,
    formatDraft,
    setFormatDraft,
  } = props;
  const showSurfaceSummary = presetScope !== "site-default";

  return (
    <FormFieldsCard>
      {showSurfaceSummary ? (
        <ImagePageTargetSurfaceSummary discoveryPending={surfaceDiscoveryPending} target={surfaceTarget} />
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor={`${baseId}-preset-name`} className="text-xs">
          Name
        </Label>
        <Input
          id={`${baseId}-preset-name`}
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          placeholder="e.g. Hero"
          className="min-w-0"
          disabled={savePending}
        />
      </div>
      <ExportDimensionInputs
        baseId={baseId}
        savePending={savePending}
        wStr={wStr}
        setWStr={setWStr}
        hStr={hStr}
        setHStr={setHStr}
      />
      <PresetFormEncodingFields
        baseId={baseId}
        savePending={savePending}
        maxSizeStr={maxSizeStr}
        setMaxSizeStr={setMaxSizeStr}
        maxSizeUnit={maxSizeUnit}
        setMaxSizeUnit={setMaxSizeUnit}
        formatEnabled={formatEnabled}
        setFormatEnabled={setFormatEnabled}
        formatDraft={formatDraft}
        setFormatDraft={setFormatDraft}
      />
    </FormFieldsCard>
  );
}

type ExportConstraintsDraft = {
  wStr: string;
  hStr: string;
  maxSizeStr: string;
  maxSizeUnit: MaxSizeUnit;
  formatEnabled: boolean;
  formatDraft: ImageExportFormat;
};

/**
 * Shared, self-contained editor for {@link ExportConstraints} — used by BOTH the image-editor preset form and the
 * CMS slot Designer per-prop constraints panel, so the controls have one owner. Manages its own draft strings
 * (seeded once from `value`; give each instance a stable React `key` per row to reseed), and emits a normalized
 * `ExportConstraints` (or `null` when width/height are not yet a valid pair). `quality` is carried through from
 * `value` (or `defaultQuality`) — this form does not expose a quality control.
 */
export function ExportConstraintsFields(props: {
  value: ExportConstraints | null;
  onChange: (next: ExportConstraints | null) => void;
  baseId: string;
  defaultQuality: number;
  disabled?: boolean;
}) {
  const { value, onChange, baseId, defaultQuality, disabled = false } = props;
  const seedMax = value?.maxFileSizeBytes != null ? maxBytesToDraft(value.maxFileSizeBytes) : null;
  const [wStr, setWStr] = useState(value != null ? String(value.width) : "");
  const [hStr, setHStr] = useState(value != null ? String(value.height) : "");
  const [maxSizeStr, setMaxSizeStr] = useState(seedMax?.value ?? "");
  const [maxSizeUnit, setMaxSizeUnit] = useState<MaxSizeUnit>(seedMax?.unit ?? "kb");
  const [formatEnabled, setFormatEnabled] = useState(true);
  const [formatDraft, setFormatDraft] = useState<ImageExportFormat>(value?.exportFormat ?? "webp");

  const quality = value?.quality ?? defaultQuality;

  const emit = (draft: ExportConstraintsDraft) => {
    const width = parsePositiveIntegerString(draft.wStr);
    const height = parsePositiveIntegerString(draft.hStr);
    if (width == null || height == null) {
      onChange(null);
      return;
    }
    onChange({
      width,
      height,
      exportFormat: draft.formatEnabled ? draft.formatDraft : "webp",
      maxFileSizeBytes: draft.maxSizeStr.trim() === "" ? null : draftToMaxBytes(draft.maxSizeStr, draft.maxSizeUnit),
      quality,
    });
  };

  const current: ExportConstraintsDraft = { wStr, hStr, maxSizeStr, maxSizeUnit, formatEnabled, formatDraft };

  return (
    <div className="space-y-3">
      <ExportDimensionInputs
        baseId={baseId}
        savePending={disabled}
        wStr={wStr}
        setWStr={(v) => {
          setWStr(v);
          emit({ ...current, wStr: v });
        }}
        hStr={hStr}
        setHStr={(v) => {
          setHStr(v);
          emit({ ...current, hStr: v });
        }}
      />
      <PresetFormEncodingFields
        baseId={baseId}
        savePending={disabled}
        maxSizeStr={maxSizeStr}
        setMaxSizeStr={(v) => {
          setMaxSizeStr(v);
          emit({ ...current, maxSizeStr: v });
        }}
        maxSizeUnit={maxSizeUnit}
        setMaxSizeUnit={(v) => {
          setMaxSizeUnit(v);
          emit({ ...current, maxSizeUnit: v });
        }}
        formatEnabled={formatEnabled}
        setFormatEnabled={(v) => {
          setFormatEnabled(v);
          emit({ ...current, formatEnabled: v });
        }}
        formatDraft={formatDraft}
        setFormatDraft={(v) => {
          setFormatDraft(v);
          emit({ ...current, formatDraft: v });
        }}
      />
    </div>
  );
}
