import type { ImageExportFormat, MaxSizeUnit, PresetCrudScope } from "@codalyn/webflow-kit";
import {
  IMAGE_EXPORT_FORMAT_OPTIONS,
  isImageExportFormat,
  isMaxSizeUnit,
  MAX_SIZE_UNIT_OPTIONS,
} from "@codalyn/webflow-kit";
import type { ImagePageTarget } from "@/features/image-editor/lib/scan-image-targets-on-page";
import { ImagePageTargetSurfaceSummary } from "@/features/image-editor/ui/image-editor-page-target-surface-summary";
import { FormFieldsCard } from "@/shared/ui/card";
import { Checkbox } from "@/shared/ui/checkbox";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

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
    </FormFieldsCard>
  );
}
