import { Layers } from "lucide-react";
import {
  CMS_SLOTS_ENGINE_COMPONENTS_EMPTY_DESCRIPTION,
  CMS_SLOTS_ENGINE_COMPONENTS_EMPTY_TITLE,
} from "@/shared/lib/cms-slots-feature-copy";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";

export function CmsSlotEngineComponentsEmptyState() {
  return (
    <Empty
      data-slot="cms_slots_engine_components_empty"
      className="min-h-28 gap-3 rounded-[10px] border-border bg-muted/10 py-8"
    >
      <EmptyHeader className="gap-2">
        <EmptyMedia variant="icon">
          <Layers aria-hidden strokeWidth={1.75} />
        </EmptyMedia>
        <EmptyTitle>{CMS_SLOTS_ENGINE_COMPONENTS_EMPTY_TITLE}</EmptyTitle>
        <EmptyDescription className="max-w-56 text-xs leading-relaxed">
          {CMS_SLOTS_ENGINE_COMPONENTS_EMPTY_DESCRIPTION}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
