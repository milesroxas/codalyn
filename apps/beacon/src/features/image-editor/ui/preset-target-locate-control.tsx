import type { PresetTargetKey } from "@codalyn/webflow-kit";

import { getPresetLocateAction } from "@/features/image-editor/lib/locate-preset-target";
import {
  IMAGE_UPLOAD_PRESET_LOCATE_COMPONENT_HINT,
  IMAGE_UPLOAD_PRESET_LOCATE_INSTANCE_HINT,
} from "@/shared/lib/beacon-feature-route-copy";
import { Button } from "@/shared/ui/button";
import {
  SurfaceSummaryCardActionCopy,
  SurfaceSummaryCardActionRow,
  SurfaceSummaryCardMeta,
} from "@/shared/ui/surface-summary-card";

type PresetTargetLocateControlProps = {
  targetKey: PresetTargetKey;
  locatePending: boolean;
  onLocate: () => void;
};

export function PresetTargetLocateControl(props: PresetTargetLocateControlProps) {
  const { targetKey, locatePending, onLocate } = props;
  const action = getPresetLocateAction(targetKey);
  if (action.kind === "none") {
    return null;
  }

  const hint =
    action.kind === "open-component"
      ? IMAGE_UPLOAD_PRESET_LOCATE_COMPONENT_HINT
      : IMAGE_UPLOAD_PRESET_LOCATE_INSTANCE_HINT;

  return (
    <SurfaceSummaryCardActionRow>
      <SurfaceSummaryCardActionCopy>
        <SurfaceSummaryCardMeta>{hint}</SurfaceSummaryCardMeta>
      </SurfaceSummaryCardActionCopy>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={locatePending}
        aria-busy={locatePending}
        onClick={onLocate}
      >
        {locatePending ? action.pendingLabel : action.label}
      </Button>
    </SurfaceSummaryCardActionRow>
  );
}
