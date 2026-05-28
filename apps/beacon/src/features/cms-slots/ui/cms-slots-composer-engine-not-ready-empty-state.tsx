import { ArrowLeft, Settings2 } from "lucide-react";
import { CmsSlotsRouteHeroEmptyCenter } from "@/features/cms-slots/ui/cms-slots-hero-empty-state";
import { CmsSlotsPanelEmptyState } from "@/features/cms-slots/ui/cms-slots-panel-empty-state";
import {
  CMS_SLOTS_COMPOSER_ENGINE_NOT_READY_DESCRIPTION,
  CMS_SLOTS_COMPOSER_ENGINE_NOT_READY_TITLE,
  CMS_SLOTS_EDITOR_NO_SLOTS_BACK_LABEL,
} from "@/shared/lib/cms-slots-feature-copy";
import { EmptyAction } from "@/shared/ui/empty";

type CmsSlotsComposerEngineNotReadyEmptyStateProps = {
  "data-slot": string;
  onBack: () => void;
};

export function CmsSlotsComposerEngineNotReadyEmptyState(props: CmsSlotsComposerEngineNotReadyEmptyStateProps) {
  const { onBack, "data-slot": dataSlot } = props;

  return (
    <CmsSlotsRouteHeroEmptyCenter data-slot={dataSlot}>
      <CmsSlotsPanelEmptyState
        data-slot="cms_slots_composer_engine_not_ready"
        icon={Settings2}
        title={CMS_SLOTS_COMPOSER_ENGINE_NOT_READY_TITLE}
        description={CMS_SLOTS_COMPOSER_ENGINE_NOT_READY_DESCRIPTION}
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
