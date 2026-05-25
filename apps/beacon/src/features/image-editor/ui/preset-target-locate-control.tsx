import type { PresetTargetKey } from "@codalyn/webflow-kit";

import { getPresetLocateAction } from "@/features/image-editor/lib/locate-preset-target";
import { IMAGE_UPLOAD_PRESET_LOCATE_INSTANCE_HINT } from "@/shared/lib/beacon-feature-route-copy";
import { SurfaceSummaryCardCanvasActionRow } from "@/shared/ui/surface-summary-card";

type PresetTargetLocateControlProps = {
  targetKey: PresetTargetKey;
  instanceLocationLabel: string | null;
  locatePending: boolean;
  onLocate: () => void;
};

export function PresetTargetLocateControl(props: PresetTargetLocateControlProps) {
  const { targetKey, instanceLocationLabel, locatePending, onLocate } = props;
  const action = getPresetLocateAction(targetKey);
  if (action.kind === "none") {
    return null;
  }

  const label = instanceLocationLabel ?? IMAGE_UPLOAD_PRESET_LOCATE_INSTANCE_HINT;

  return (
    <SurfaceSummaryCardCanvasActionRow
      actionLabel={action.label}
      actionPendingLabel={action.pendingLabel}
      disabled={locatePending}
      label={label}
      labelEmphasis={instanceLocationLabel != null ? "prominent" : "hint"}
      onAction={onLocate}
      pending={locatePending}
    />
  );
}
