import { Layers } from "lucide-react";
import { CmsSlotsPanelEmptyState } from "@/features/cms-slots/ui/cms-slots-panel-empty-state";
import {
  CMS_SLOTS_DESIGNER_COMPONENTS_EMPTY_DESCRIPTION,
  CMS_SLOTS_DESIGNER_COMPONENTS_EMPTY_TITLE,
} from "@/shared/lib/cms-slots-feature-copy";

export function CmsSlotDesignerComponentsEmptyState() {
  return (
    <CmsSlotsPanelEmptyState
      data-slot="cms_slots_designer_components_empty"
      icon={Layers}
      title={CMS_SLOTS_DESIGNER_COMPONENTS_EMPTY_TITLE}
      description={CMS_SLOTS_DESIGNER_COMPONENTS_EMPTY_DESCRIPTION}
    />
  );
}
