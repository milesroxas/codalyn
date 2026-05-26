"use client";

import { type TowerUsageMeterKind, towerUsageMeterLabel, towerUsageMeterTooltipContent } from "@codalyn/webflow-kit";
import {
  Tooltip,
  TooltipContent,
  TooltipDetailHeading,
  TooltipDetailList,
  TooltipDetailListItem,
  TooltipDetailNote,
  TooltipDetailSection,
  TooltipDetailSummary,
  TooltipHelpTrigger,
} from "@/shared/ui/tooltip";

export type UsageMeterLabelProps = {
  kind: TowerUsageMeterKind;
  label?: string;
};

function UsageMeterTooltipDetail({ kind }: { kind: TowerUsageMeterKind }) {
  const content = towerUsageMeterTooltipContent(kind);

  return (
    <>
      <TooltipDetailSummary>{content.summary}</TooltipDetailSummary>
      <TooltipDetailSection>
        <TooltipDetailHeading>{content.sectionHeading}</TooltipDetailHeading>
        <TooltipDetailList>
          {content.actions.map((action) => (
            <TooltipDetailListItem
              key={`${action.feature}:${action.detail}`}
              feature={action.feature}
              detail={action.detail}
            />
          ))}
        </TooltipDetailList>
      </TooltipDetailSection>
      <TooltipDetailNote>{content.footnote}</TooltipDetailNote>
    </>
  );
}

export function UsageMeterLabel({ kind, label }: UsageMeterLabelProps) {
  const displayLabel = label ?? towerUsageMeterLabel(kind);

  return (
    <span className="inline-flex items-center gap-1">
      <span>{displayLabel}</span>
      <Tooltip>
        <TooltipHelpTrigger label={`About ${displayLabel}`} />
        <TooltipContent side="top" variant="detail">
          <UsageMeterTooltipDetail kind={kind} />
        </TooltipContent>
      </Tooltip>
    </span>
  );
}
