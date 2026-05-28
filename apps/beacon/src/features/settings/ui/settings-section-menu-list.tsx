import { IconChevronRight } from "@tabler/icons-react";
import { SETTINGS_SECTIONS, type SettingsSectionId } from "@/features/settings/lib/settings-sections";
import {
  SurfaceSummaryCardIconBox,
  SurfaceSummaryCardMeta,
  SurfaceSummaryCardOptionRow,
  SurfaceSummaryCardOptionRowChevron,
  SurfaceSummaryCardOptionRowCopy,
  SurfaceSummaryCardOptionRows,
  SurfaceSummaryCardTitle,
} from "@/shared/ui/surface-summary-card";

export type SettingsSectionMenuListProps = {
  onSelectSection: (id: SettingsSectionId) => void;
};

export function SettingsSectionMenuList(props: SettingsSectionMenuListProps) {
  const { onSelectSection } = props;

  return (
    <nav aria-label="Settings sections">
      <SurfaceSummaryCardOptionRows>
        {SETTINGS_SECTIONS.map((section) => {
          const Icon = section.icon;

          return (
            <SurfaceSummaryCardOptionRow
              key={section.id}
              type="button"
              onClick={() => {
                onSelectSection(section.id);
              }}
            >
              <SurfaceSummaryCardIconBox>
                <Icon aria-hidden strokeWidth={1.75} />
              </SurfaceSummaryCardIconBox>
              <SurfaceSummaryCardOptionRowCopy>
                <SurfaceSummaryCardTitle>{section.label}</SurfaceSummaryCardTitle>
                <SurfaceSummaryCardMeta emphasis="hint">{section.description}</SurfaceSummaryCardMeta>
              </SurfaceSummaryCardOptionRowCopy>
              <SurfaceSummaryCardOptionRowChevron aria-hidden>
                <IconChevronRight stroke={1.5} />
              </SurfaceSummaryCardOptionRowChevron>
            </SurfaceSummaryCardOptionRow>
          );
        })}
      </SurfaceSummaryCardOptionRows>
    </nav>
  );
}
