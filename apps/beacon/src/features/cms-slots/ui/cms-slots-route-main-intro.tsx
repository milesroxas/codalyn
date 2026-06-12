import type { CmsSlotsRouteSegment } from "@/features/cms-slots/model/cms-slots-access";
import {
  CMS_SLOTS_COMPOSER_MAIN_DESCRIPTION,
  CMS_SLOTS_COMPOSER_MAIN_TITLE,
  CMS_SLOTS_DESIGNER_MAIN_DESCRIPTION,
  CMS_SLOTS_DESIGNER_MAIN_TITLE,
} from "@/shared/lib/cms-slots-feature-copy";
import { SurfaceSummaryCardPageIntro } from "@/shared/ui/surface-summary-card";

const MAIN_INTRO_COPY: Record<CmsSlotsRouteSegment, { title: string; description: string }> = {
  designer: {
    title: CMS_SLOTS_DESIGNER_MAIN_TITLE,
    description: CMS_SLOTS_DESIGNER_MAIN_DESCRIPTION,
  },
  composer: {
    title: CMS_SLOTS_COMPOSER_MAIN_TITLE,
    description: CMS_SLOTS_COMPOSER_MAIN_DESCRIPTION,
  },
};

type CmsSlotsRouteMainIntroProps = {
  segment: CmsSlotsRouteSegment;
};

export function CmsSlotsRouteMainIntro(props: CmsSlotsRouteMainIntroProps) {
  const { title, description } = MAIN_INTRO_COPY[props.segment];

  return <SurfaceSummaryCardPageIntro title={title} description={description} />;
}
