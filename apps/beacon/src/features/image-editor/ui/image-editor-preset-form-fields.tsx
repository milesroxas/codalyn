import type { ImageExportFormat, MaxSizeUnit, PresetCrudScope } from "@codalyn/webflow-kit";
import type {
  PresetFormAddableScope,
  PresetFormExistingMatch,
} from "@/features/image-editor/lib/image-editor-preset-form-existing";
import type { ImagePageTarget } from "@/features/image-editor/lib/scan-image-targets-on-page";
import { ImagePageTargetScanListSection } from "@/features/image-editor/ui/image-editor-page-target-select-list";
import { ImagePageTargetSurfaceSummary } from "@/features/image-editor/ui/image-editor-page-target-surface-summary";
import {
  ImageEditorTargetStepActions,
  ImageEditorTargetStepScanButton,
} from "@/features/image-editor/ui/image-editor-target-step-actions";
import { Checkbox } from "@/shared/ui/checkbox";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { SurfaceSummaryCardFormFields } from "@/shared/ui/surface-summary-card";

export function TargetPickSection(props: {
  discoverySettled: boolean;
  targets: ImagePageTarget[];
  scanPending: boolean;
  scanError: string | null;
  pageScanned: boolean;
  onRescan: () => void;
  selectedTarget: ImagePageTarget | null;
  onSelectTarget: (t: ImagePageTarget) => void;
  surfaceTarget: ImagePageTarget | null;
  existingPresets: PresetFormExistingMatch[];
  addableScopes: PresetFormAddableScope[];
  onEditPreset: (match: PresetFormExistingMatch) => void;
  onAddPresetScope: (scope: PresetCrudScope) => void;
}) {
  const {
    discoverySettled,
    targets,
    scanPending,
    scanError,
    pageScanned,
    onRescan,
    selectedTarget,
    onSelectTarget,
    surfaceTarget,
    existingPresets,
    addableScopes,
    onEditPreset,
    onAddPresetScope,
  } = props;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <ImageEditorTargetStepActions
        onScanPage={onRescan}
        pageScanned={pageScanned}
        scanPending={scanPending}
        showScanButton={false}
        surface={{
          addableScopes,
          discoveryPending: !discoverySettled,
          existingPresets,
          onAddScope: onAddPresetScope,
          onEditPreset,
          target: surfaceTarget,
        }}
      />
      {discoverySettled ? (
        <ImagePageTargetScanListSection
          idPrefix="preset-form-tgt"
          onRescan={onRescan}
          onSelectTarget={onSelectTarget}
          pageScanned={pageScanned}
          scanError={scanError}
          scanPending={scanPending}
          scrollable
          selectedTarget={selectedTarget}
          targets={targets}
        />
      ) : null}
      <ImageEditorTargetStepScanButton onScanPage={onRescan} scanPending={scanPending} />
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
          <Select value={maxSizeUnit} onValueChange={(v) => (v === "kb" || v === "mb") && setMaxSizeUnit(v)}>
            <SelectTrigger className="w-20 shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="kb">KB</SelectItem>
              <SelectItem value="mb">MB</SelectItem>
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
          <Select value={formatDraft} onValueChange={(v) => (v === "webp" || v === "avif") && setFormatDraft(v)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="webp">WebP</SelectItem>
              <SelectItem value="avif">AVIF</SelectItem>
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
    <SurfaceSummaryCardFormFields>
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
    </SurfaceSummaryCardFormFields>
  );
}
