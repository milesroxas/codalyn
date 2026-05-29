import { formatBeaconPresetDimensionsLabel, type ImageExportFormat, type PresetCrudScope } from "@codalyn/webflow-kit";
import { Loader2, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { BeaconFeatureRouteDockButton } from "@/app/ui/beacon-feature-route-chrome";
import type { PresetFormSubStep } from "@/features/image-editor/lib/image-editor-preset-form-commit";
import { PresetListTile } from "@/features/image-editor/ui/preset-list-tile";
import {
  IMAGE_UPLOAD_ADD_PRESET_LABEL,
  IMAGE_UPLOAD_PRESETS_GUEST_MESSAGE,
  IMAGE_UPLOAD_PRESETS_LIST_ARIA_LABEL,
  IMAGE_UPLOAD_PRESETS_SECTION_LABEL,
  IMAGE_UPLOAD_SITE_DEFAULT_LIST_ARIA_LABEL,
  IMAGE_UPLOAD_SITE_DEFAULT_SECTION_LABEL,
} from "@/shared/lib/beacon-feature-route-copy";
import { Button } from "@/shared/ui/button";
import { SurfaceSummaryCardPanelSectionLabel } from "@/shared/ui/surface-summary-card";

export type PresetListRow = {
  id: string;
  name: string;
  displayName: string;
  scope: PresetCrudScope;
  width: number;
  height: number;
  exportFormat?: ImageExportFormat;
  maxFileSizeBytes: number;
};

type View = "list" | "form";

function PresetSaveFooterActions(props: { onBack: () => void; onSave: () => void; savePending: boolean }) {
  const { onBack, onSave, savePending } = props;
  return (
    <>
      <BeaconFeatureRouteDockButton type="button" stretch emphasized={false} onClick={onBack}>
        Back
      </BeaconFeatureRouteDockButton>
      <BeaconFeatureRouteDockButton
        type="button"
        stretch
        disabled={savePending}
        aria-busy={savePending}
        onClick={onSave}
      >
        {savePending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
        {savePending ? "Saving…" : "Save preset"}
      </BeaconFeatureRouteDockButton>
    </>
  );
}

export function buildPresetConfigurationFooter(input: {
  view: View;
  isEditing: boolean;
  formSubStep: PresetFormSubStep;
  savePending: boolean;
  onDone: () => void;
  onFormBack: () => void;
  onSave: () => void;
}): ReactNode | null {
  const { view, isEditing, formSubStep, savePending, onDone, onFormBack, onSave } = input;

  if (view === "list") {
    return (
      <BeaconFeatureRouteDockButton type="button" stretch emphasized={false} onClick={onDone}>
        Done
      </BeaconFeatureRouteDockButton>
    );
  }

  if (isEditing || formSubStep === 2) {
    return <PresetSaveFooterActions onBack={onFormBack} onSave={onSave} savePending={savePending} />;
  }

  return (
    <BeaconFeatureRouteDockButton type="button" stretch emphasized={false} onClick={onFormBack}>
      Back
    </BeaconFeatureRouteDockButton>
  );
}

export function ImageEditorConfigurationPresetsListView(props: {
  isGuest: boolean;
  presetRows: PresetListRow[];
  openEdit: (p: PresetListRow) => void;
  onOpenAdd: () => void;
  onRequestDelete: (p: PresetListRow) => void;
}) {
  const { isGuest, presetRows, openEdit, onOpenAdd, onRequestDelete } = props;
  const exportPresetRows = presetRows.filter((preset) => preset.scope !== "site-default");
  const siteDefaultPresetRow = presetRows.find((preset) => preset.scope === "site-default") ?? null;

  const renderPresetTile = (preset: PresetListRow) => (
    <PresetListTile
      key={preset.id}
      dimensionsLabel={formatBeaconPresetDimensionsLabel(preset)}
      displayName={preset.displayName}
      disabled={isGuest}
      onOpen={() => openEdit(preset)}
      onRequestDelete={() => onRequestDelete(preset)}
    />
  );

  return (
    <div className="space-y-3" data-slot="image_upload_presets">
      {isGuest ? (
        <p className="text-muted-foreground text-xs leading-relaxed">{IMAGE_UPLOAD_PRESETS_GUEST_MESSAGE}</p>
      ) : null}

      <Button type="button" variant="actionCard" size="actionCard" disabled={isGuest} onClick={onOpenAdd}>
        <Plus data-icon="inline-start" aria-hidden strokeWidth={2.25} />
        <span>{IMAGE_UPLOAD_ADD_PRESET_LABEL}</span>
      </Button>

      {exportPresetRows.length > 0 ? (
        <div className="space-y-3">
          <SurfaceSummaryCardPanelSectionLabel>
            {IMAGE_UPLOAD_PRESETS_SECTION_LABEL}
          </SurfaceSummaryCardPanelSectionLabel>
          <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0" aria-label={IMAGE_UPLOAD_PRESETS_LIST_ARIA_LABEL}>
            {exportPresetRows.map(renderPresetTile)}
          </ul>
        </div>
      ) : null}

      {siteDefaultPresetRow ? (
        <div className="space-y-3">
          <SurfaceSummaryCardPanelSectionLabel>
            {IMAGE_UPLOAD_SITE_DEFAULT_SECTION_LABEL}
          </SurfaceSummaryCardPanelSectionLabel>
          <ul
            className="m-0 grid list-none grid-cols-2 gap-3 p-0"
            aria-label={IMAGE_UPLOAD_SITE_DEFAULT_LIST_ARIA_LABEL}
          >
            {renderPresetTile(siteDefaultPresetRow)}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
