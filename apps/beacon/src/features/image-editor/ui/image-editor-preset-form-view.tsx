import type { ImageExportFormat, MaxSizeUnit, PresetCrudScope } from "@codalyn/webflow-kit";
import type { PresetFormSubStep } from "@/features/image-editor/lib/image-editor-preset-form-commit";
import type {
  PresetFormAddableScope,
  PresetFormExistingMatch,
} from "@/features/image-editor/lib/image-editor-preset-form-existing";
import type { ImagePageTarget } from "@/features/image-editor/lib/scan-image-targets-on-page";
import { PresetFormStep2, TargetPickSection } from "@/features/image-editor/ui/image-editor-preset-form-fields";
import { Button } from "@/shared/ui/button";

export function ImageEditorConfigurationPresetsFormView(props: {
  baseId: string;
  editingId: string | null;
  formSubStep: PresetFormSubStep;
  formError: string | null;
  savePending: boolean;
  nameDraft: string;
  setNameDraft: (v: string) => void;
  wStr: string;
  setWStr: (v: string) => void;
  hStr: string;
  setHStr: (v: string) => void;
  formatEnabled: boolean;
  setFormatEnabled: (v: boolean) => void;
  formatDraft: ImageExportFormat;
  setFormatDraft: (v: ImageExportFormat) => void;
  maxSizeStr: string;
  setMaxSizeStr: (v: string) => void;
  maxSizeUnit: MaxSizeUnit;
  setMaxSizeUnit: (v: MaxSizeUnit) => void;
  formTarget: ImagePageTarget | null;
  formScanPending: boolean;
  formScanError: string | null;
  formPageScanned: boolean;
  formRescan: () => void;
  formTargetSelect: (t: ImagePageTarget) => void;
  formTargets: ImagePageTarget[];
  formDiscoverySettled: boolean;
  presetScope: PresetCrudScope;
  presetFormSurfaceTarget: ImagePageTarget | null;
  surfaceTarget: ImagePageTarget | null;
  existingPresets: PresetFormExistingMatch[];
  addableScopes: PresetFormAddableScope[];
  onEditPreset: (match: PresetFormExistingMatch) => void;
  onAddPresetScope: (scope: PresetCrudScope) => void;
  onRequestDelete?: () => void;
}) {
  const {
    baseId,
    editingId,
    formSubStep,
    formError,
    savePending,
    nameDraft,
    setNameDraft,
    wStr,
    setWStr,
    hStr,
    setHStr,
    formatEnabled,
    setFormatEnabled,
    formatDraft,
    setFormatDraft,
    maxSizeStr,
    setMaxSizeStr,
    maxSizeUnit,
    setMaxSizeUnit,
    formScanPending,
    formScanError,
    formPageScanned,
    formRescan,
    formTargetSelect,
    formTarget,
    formTargets,
    formDiscoverySettled,
    presetScope,
    presetFormSurfaceTarget,
    surfaceTarget,
    existingPresets,
    addableScopes,
    onEditPreset,
    onAddPresetScope,
    onRequestDelete,
  } = props;
  const isEditing = editingId != null;

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1">
        <h3 className="text-sm font-medium">{isEditing ? "Edit preset" : "Add preset"}</h3>
        <p className="text-muted-foreground text-xs">
          {isEditing ? "Update name and export settings for this preset." : "Configure export preset details."}
        </p>
      </div>
      <div className="flex flex-col gap-4">
        {formError ? <p className="text-destructive text-xs">{formError}</p> : null}

        {isEditing || formSubStep === 2 ? (
          <PresetFormStep2
            baseId={baseId}
            formatDraft={formatDraft}
            formatEnabled={formatEnabled}
            hStr={hStr}
            maxSizeStr={maxSizeStr}
            maxSizeUnit={maxSizeUnit}
            nameDraft={nameDraft}
            presetScope={presetScope}
            savePending={savePending}
            setFormatDraft={setFormatDraft}
            setFormatEnabled={setFormatEnabled}
            setHStr={setHStr}
            setMaxSizeStr={setMaxSizeStr}
            setMaxSizeUnit={setMaxSizeUnit}
            setNameDraft={setNameDraft}
            setWStr={setWStr}
            surfaceDiscoveryPending={!isEditing && !formDiscoverySettled}
            surfaceTarget={presetFormSurfaceTarget}
            wStr={wStr}
          />
        ) : null}

        {!isEditing && formSubStep === 1 ? (
          <TargetPickSection
            addableScopes={addableScopes}
            discoverySettled={formDiscoverySettled}
            existingPresets={existingPresets}
            onAddPresetScope={onAddPresetScope}
            onEditPreset={onEditPreset}
            onRescan={formRescan}
            onSelectTarget={formTargetSelect}
            pageScanned={formPageScanned}
            scanError={formScanError}
            scanPending={formScanPending}
            selectedTarget={formTarget}
            surfaceTarget={surfaceTarget}
            targets={formTargets}
          />
        ) : null}

        {isEditing && onRequestDelete ? (
          <Button type="button" variant="destructive" size="sm" disabled={savePending} onClick={onRequestDelete}>
            Delete preset
          </Button>
        ) : null}
      </div>
    </div>
  );
}
