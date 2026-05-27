import { BeaconRouteLoadingShell } from "@/app/ui/beacon-route-loading-shell";
import { CMS_SLOTS_SCAN_ARIA_LABEL, CMS_SLOTS_SCAN_MESSAGE } from "@/shared/lib/cms-slots-feature-copy";
import { cn } from "@/shared/lib/utils";

type CmsSlotsPageScanLoadingPanelProps = {
  className?: string;
  ariaLabel?: string;
  message?: string;
};

/** Centered route loader body (prefer `BeaconRouteLoadingOverlay` at the scroll shell for page boot). */
export function CmsSlotsPageScanLoadingPanel(props: CmsSlotsPageScanLoadingPanelProps) {
  const { className, ariaLabel = CMS_SLOTS_SCAN_ARIA_LABEL, message = CMS_SLOTS_SCAN_MESSAGE } = props;

  return (
    <BeaconRouteLoadingShell
      ariaLabel={ariaLabel}
      message={message}
      className={cn(className)}
      dataSlot="cms_slots_page_scan_loading"
    />
  );
}
