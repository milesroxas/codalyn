import { Inbox } from "lucide-react";
import {
  CmsSlotsHeroEmptyState,
  CmsSlotsRouteHeroEmptyCenter,
} from "@/features/cms-slots/ui/cms-slots-hero-empty-state";
import {
  CMS_SLOTS_EDITOR_NO_SLOTS_DESCRIPTION,
  CMS_SLOTS_EDITOR_NO_SLOTS_TITLE,
} from "@/shared/lib/cms-slots-feature-copy";

export function CmsSlotsEditorNoSlotsEmptyState(props: { "data-slot": string }) {
  return (
    <CmsSlotsRouteHeroEmptyCenter data-slot={props["data-slot"]}>
      <CmsSlotsHeroEmptyState
        data-slot="cms_slots_editor_no_slots"
        icon={Inbox}
        title={CMS_SLOTS_EDITOR_NO_SLOTS_TITLE}
        description={CMS_SLOTS_EDITOR_NO_SLOTS_DESCRIPTION}
      />
    </CmsSlotsRouteHeroEmptyCenter>
  );
}
