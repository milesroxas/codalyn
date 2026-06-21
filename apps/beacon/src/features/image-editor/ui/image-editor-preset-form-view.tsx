import type { ImageExportFormat, MaxSizeUnit, PresetCrudScope, PresetTargetKey } from "@codalyn/webflow-kit";
import type { PresetFormSubStep } from "@/features/image-editor/lib/image-editor-preset-form-commit";
import type {
  PresetFormAddableScope,
  PresetFormExistingMatch,
} from "@/features/image-editor/lib/image-editor-preset-form-existing";
import type {
  ImagePageTarget,
  ImagePageTargetScanProgress,
} from "@/features/image-editor/lib/scan-image-targets-on-page";
import { PresetFormStep2 } from "@/features/image-editor/ui/image-editor-preset-form-fields";
import { ImageEditorTargetStepColumn } from "@/features/image-editor/ui/image-editor-target-step-column";
import { PresetTargetLocateControl } from "@/features/image-editor/ui/preset-target-locate-control";
import {
  IMAGE_UPLOAD_PRESET_ADD_DESCRIPTION,
  IMAGE_UPLOAD_PRESET_ADD_TITLE,
  IMAGE_UPLOAD_PRESET_EDIT_DESCRIPTION,
  IMAGE_UPLOAD_PRESET_EDIT_TITLE,
} from "@/shared/lib/beacon-feature-route-copy";
import { Button } from "@/shared/ui/button";
import {
  SurfaceSummaryCardFormFields,
  SurfaceSummaryCardPageIntro,
  SurfaceSummaryCardScanListError,
} from "@/shared/ui/surface-summary-card";

export function ImageEditorConfigurationPresetsFormView(props: {
  baseId: string;
  editingId: string | null;
  editingTargetKey: PresetTargetKey | null;
  instanceLocationLabel: string | null;
  locatePending: boolean;
  onLocatePresetTarget: () => void;
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
  formScanProgress: ImagePageTargetScanProgress | null;
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
    editingTargetKey,
    instanceLocationLabel,
    locatePending,
    onLocatePresetTarget,
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
    formScanProgress,
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
    <SurfaceSummaryCardFormFields>
      <SurfaceSummaryCardPageIntro
        title={isEditing ? IMAGE_UPLOAD_PRESET_EDIT_TITLE : IMAGE_UPLOAD_PRESET_ADD_TITLE}
        description={isEditing ? IMAGE_UPLOAD_PRESET_EDIT_DESCRIPTION : IMAGE_UPLOAD_PRESET_ADD_DESCRIPTION}
      />
      {formError ? <SurfaceSummaryCardScanListError>{formError}</SurfaceSummaryCardScanListError> : null}

      {isEditing && editingTargetKey != null ? (
        <PresetTargetLocateControl
          instanceLocationLabel={instanceLocationLabel}
          locatePending={locatePending}
          onLocate={onLocatePresetTarget}
          targetKey={editingTargetKey}
        />
      ) : null}

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
        <ImageEditorTargetStepColumn
          discoverySettled={formDiscoverySettled}
          idPrefix="preset-form-tgt"
          onRescan={formRescan}
          onSelectTarget={formTargetSelect}
          pageScanned={formPageScanned}
          scanError={formScanError}
          scanPending={formScanPending}
          scanProgress={formScanProgress}
          selectedTarget={formTarget}
          surface={{
            addableScopes,
            discoveryPending: !formDiscoverySettled,
            existingPresets,
            onAddScope: onAddPresetScope,
            onEditPreset,
            target: surfaceTarget,
          }}
          targets={formTargets}
        />
      ) : null}

      {isEditing && onRequestDelete ? (
        <Button type="button" variant="destructive" size="sm" disabled={savePending} onClick={onRequestDelete}>
          Delete preset
        </Button>
      ) : null}
    </SurfaceSummaryCardFormFields>
  );
}
