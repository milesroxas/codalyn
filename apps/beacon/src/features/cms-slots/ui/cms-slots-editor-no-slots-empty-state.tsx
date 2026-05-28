import { ArrowLeft, Inbox } from "lucide-react";
import { CmsSlotsRouteHeroEmptyCenter } from "@/features/cms-slots/ui/cms-slots-hero-empty-state";
import { CmsSlotsPanelEmptyState } from "@/features/cms-slots/ui/cms-slots-panel-empty-state";
import {
  CMS_SLOTS_EDITOR_NO_SLOTS_BACK_LABEL,
  CMS_SLOTS_EDITOR_NO_SLOTS_DESCRIPTION,
  CMS_SLOTS_EDITOR_NO_SLOTS_TITLE,
} from "@/shared/lib/cms-slots-feature-copy";
import { EmptyAction } from "@/shared/ui/empty";

type CmsSlotsEditorNoSlotsEmptyStateProps = {
  "data-slot": string;
  onBack: () => void;
};

export function CmsSlotsEditorNoSlotsEmptyState(props: CmsSlotsEditorNoSlotsEmptyStateProps) {
  const { onBack, "data-slot": dataSlot } = props;

  return (
    <CmsSlotsRouteHeroEmptyCenter data-slot={dataSlot}>
      <CmsSlotsPanelEmptyState
        data-slot="cms_slots_editor_no_slots"
        icon={Inbox}
        title={CMS_SLOTS_EDITOR_NO_SLOTS_TITLE}
        description={CMS_SLOTS_EDITOR_NO_SLOTS_DESCRIPTION}
        footer={
          <EmptyAction width="fit" onClick={() => onBack()}>
            <ArrowLeft data-icon="inline-start" aria-hidden strokeWidth={1.75} />
            <span>{CMS_SLOTS_EDITOR_NO_SLOTS_BACK_LABEL}</span>
          </EmptyAction>
        }
      />
    </CmsSlotsRouteHeroEmptyCenter>
  );
}
