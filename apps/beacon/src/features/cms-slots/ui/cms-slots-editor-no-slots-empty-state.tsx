import { Inbox } from "lucide-react";
import { BEACON_HOME_TILE_CSS_VARS } from "@/shared/lib/beacon-app-backgrounds";
import {
  CMS_SLOTS_EDITOR_NO_SLOTS_DESCRIPTION,
  CMS_SLOTS_EDITOR_NO_SLOTS_TITLE,
} from "@/shared/lib/cms-slots-feature-copy";
import { cn } from "@/shared/lib/utils";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";

export function CmsSlotsEditorNoSlotsEmptyState(props: { className?: string }) {
  return (
    <Empty
      data-slot="cms_slots_editor_no_slots"
      className={cn(
        "relative isolate min-h-[min(40vh,14rem)] gap-3 overflow-hidden rounded-lg border-dashed border-border/60 px-6 py-10",
        props.className
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `var(${BEACON_HOME_TILE_CSS_VARS.cmsSlot})` }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-linear-to-t from-background/92 via-background/40 to-background/55"
      />
      <EmptyHeader className="relative z-1 gap-2.5">
        <EmptyMedia
          variant="icon"
          className="mb-0 size-10 rounded-md border border-border/40 bg-background/85 dark:bg-black/55 [&_svg:not([class*='size-'])]:size-5"
        >
          <Inbox aria-hidden strokeWidth={1.75} />
        </EmptyMedia>
        <EmptyTitle className="text-base text-foreground">{CMS_SLOTS_EDITOR_NO_SLOTS_TITLE}</EmptyTitle>
        <EmptyDescription className="max-w-66 text-xs leading-relaxed">
          {CMS_SLOTS_EDITOR_NO_SLOTS_DESCRIPTION}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
