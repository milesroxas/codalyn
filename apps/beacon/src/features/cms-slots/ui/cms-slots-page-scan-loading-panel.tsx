import { BeaconRouteLoadingShell } from "@/app/ui/beacon-route-loading-shell";
import { CMS_SLOTS_SCAN_ARIA_LABEL } from "@/shared/lib/cms-slots-feature-copy";
import { cn } from "@/shared/lib/utils";

type CmsSlotsPageScanLoadingPanelProps = {
  className?: string;
  ariaLabel?: string;
};

/** Centered route loader body (prefer `BeaconRouteLoadingOverlay` at the scroll shell for page boot). */
export function CmsSlotsPageScanLoadingPanel(props: CmsSlotsPageScanLoadingPanelProps) {
  const { className, ariaLabel = CMS_SLOTS_SCAN_ARIA_LABEL } = props;

  return (
    <BeaconRouteLoadingShell ariaLabel={ariaLabel} className={cn(className)} dataSlot="cms_slots_page_scan_loading" />
  );
}
