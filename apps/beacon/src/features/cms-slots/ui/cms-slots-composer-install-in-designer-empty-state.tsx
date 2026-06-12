import { PanelsTopLeft } from "lucide-react";
import {
  CmsSlotsHeroEmptyState,
  CmsSlotsRouteHeroEmptyCenter,
} from "@/features/cms-slots/ui/cms-slots-hero-empty-state";
import {
  CMS_SLOTS_COMPOSER_INSTALL_IN_DESIGNER_DESCRIPTION,
  CMS_SLOTS_COMPOSER_INSTALL_IN_DESIGNER_TITLE,
} from "@/shared/lib/cms-slots-feature-copy";

export function CmsSlotsComposerInstallInDesignerEmptyState(props: { "data-slot": string }) {
  return (
    <CmsSlotsRouteHeroEmptyCenter data-slot={props["data-slot"]}>
      <CmsSlotsHeroEmptyState
        data-slot="cms_slots_composer_install_in_designer"
        icon={PanelsTopLeft}
        title={CMS_SLOTS_COMPOSER_INSTALL_IN_DESIGNER_TITLE}
        description={CMS_SLOTS_COMPOSER_INSTALL_IN_DESIGNER_DESCRIPTION}
      />
    </CmsSlotsRouteHeroEmptyCenter>
  );
}
