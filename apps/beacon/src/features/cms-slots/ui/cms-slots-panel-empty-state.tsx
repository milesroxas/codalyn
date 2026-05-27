import type { LucideIcon } from "lucide-react";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";

export type CmsSlotsPanelEmptyStateProps = {
  "data-slot": string;
  icon: LucideIcon;
  title: string;
  description: string;
};

export function CmsSlotsPanelEmptyState(props: CmsSlotsPanelEmptyStateProps) {
  const { icon: Icon, title, description, "data-slot": dataSlot } = props;

  return (
    <Empty tone="insetPanel" data-slot={dataSlot}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon aria-hidden strokeWidth={1.75} />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription size="compact">{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
