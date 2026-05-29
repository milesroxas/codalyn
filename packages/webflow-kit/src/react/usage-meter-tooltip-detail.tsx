import type { TowerUsageMeterKind } from "../tower/tower-usage-metering.js";
import { towerUsageMeterTooltipContent } from "../tower/tower-usage-metering-copy.js";
import { TooltipProductBadge } from "./tooltip-product-badge.js";
import {
  UsageMeterTooltipDetailFrame,
  UsageMeterTooltipFootnote,
  UsageMeterTooltipHeading,
  UsageMeterTooltipList,
  UsageMeterTooltipNote,
  UsageMeterTooltipProductGroup,
  UsageMeterTooltipProductGroupDetail,
  UsageMeterTooltipProductGroupDetailList,
  UsageMeterTooltipSection,
  UsageMeterTooltipSummary,
  UsageMeterTooltipTitle,
} from "./usage-meter-tooltip-detail-primitives.js";

type UsageMeterTooltipDetailProps = {
  kind: TowerUsageMeterKind;
};

export function UsageMeterTooltipDetail({ kind }: UsageMeterTooltipDetailProps) {
  const content = towerUsageMeterTooltipContent(kind);

  return (
    <UsageMeterTooltipDetailFrame>
      {content.title ? <UsageMeterTooltipTitle>{content.title}</UsageMeterTooltipTitle> : null}
      <UsageMeterTooltipSummary>{content.summary}</UsageMeterTooltipSummary>

      {content.actionGroups.length > 0 ? (
        <UsageMeterTooltipSection>
          <UsageMeterTooltipHeading>{content.sectionHeading}</UsageMeterTooltipHeading>
          <UsageMeterTooltipList>
            {content.actionGroups.map((group) => (
              <UsageMeterTooltipProductGroup key={group.product}>
                <TooltipProductBadge product={group.product} />
                <UsageMeterTooltipProductGroupDetailList>
                  {group.details.map((detail) => (
                    <UsageMeterTooltipProductGroupDetail key={detail}>{detail}</UsageMeterTooltipProductGroupDetail>
                  ))}
                </UsageMeterTooltipProductGroupDetailList>
              </UsageMeterTooltipProductGroup>
            ))}
          </UsageMeterTooltipList>
        </UsageMeterTooltipSection>
      ) : null}

      {content.footnoteHeading ? (
        <UsageMeterTooltipFootnote>
          <UsageMeterTooltipHeading>{content.footnoteHeading}</UsageMeterTooltipHeading>
          <UsageMeterTooltipNote>{content.footnote}</UsageMeterTooltipNote>
        </UsageMeterTooltipFootnote>
      ) : (
        <UsageMeterTooltipFootnote>
          <UsageMeterTooltipNote>{content.footnote}</UsageMeterTooltipNote>
        </UsageMeterTooltipFootnote>
      )}
    </UsageMeterTooltipDetailFrame>
  );
}
