import { PanelsTopLeft } from "lucide-react";
import {
  CmsSlotsHeroEmptyState,
  CmsSlotsRouteHeroEmptyCenter,
} from "@/features/cms-slots/ui/cms-slots-hero-empty-state";
import {
  CMS_SLOTS_COMPOSER_INSTALL_IN_ENGINE_DESCRIPTION,
  CMS_SLOTS_COMPOSER_INSTALL_IN_ENGINE_TITLE,
} from "@/shared/lib/cms-slots-feature-copy";

export function CmsSlotsComposerInstallInEngineEmptyState(props: { "data-slot": string }) {
  return (
    <CmsSlotsRouteHeroEmptyCenter data-slot={props["data-slot"]}>
      <CmsSlotsHeroEmptyState
        data-slot="cms_slots_composer_install_in_engine"
        icon={PanelsTopLeft}
        title={CMS_SLOTS_COMPOSER_INSTALL_IN_ENGINE_TITLE}
        description={CMS_SLOTS_COMPOSER_INSTALL_IN_ENGINE_DESCRIPTION}
      />
    </CmsSlotsRouteHeroEmptyCenter>
  );
}
