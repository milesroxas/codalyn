import { Loader2 } from "lucide-react";
import { CMS_SLOTS_SCAN_ARIA_LABEL } from "@/shared/lib/cms-slots-feature-copy";
import { cn } from "@/shared/lib/utils";

type CmsSlotsPageScanLoadingPanelProps = {
  className?: string;
  ariaLabel?: string;
};

/** In-scroll loading shell while CMS Slots page install state is still unknown. */
export function CmsSlotsPageScanLoadingPanel(props: CmsSlotsPageScanLoadingPanelProps) {
  const { className, ariaLabel = CMS_SLOTS_SCAN_ARIA_LABEL } = props;

  return (
    <div
      className={cn("flex min-h-[min(40vh,16rem)] flex-col items-center justify-center py-4", className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-slot="cms_slots_page_scan_loading"
    >
      <Loader2 aria-hidden className="size-6 shrink-0 animate-spin text-muted-foreground" />
      <span className="sr-only">{ariaLabel}</span>
    </div>
  );
}
