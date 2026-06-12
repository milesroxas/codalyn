import { BeaconFeatureRouteDockBackButton } from "@/app/ui/beacon-feature-route-chrome";
import { CMS_SLOTS_DESIGNER_BACK_TO_LIST_LABEL } from "@/shared/lib/cms-slots-feature-copy";

type CmsSlotDesignerBackToListDockProps = {
  disabled?: boolean;
  onBackToList: () => void;
};

/** Full-width strip flush above the CMS Slots route footer (Designer list composition). */
export function CmsSlotDesignerBackToListDock(props: CmsSlotDesignerBackToListDockProps) {
  const { disabled = false, onBackToList } = props;

  return (
    <div
      className="w-full shrink-0 border-t border-border bg-background px-3 pt-2.5 pb-2.5"
      data-slot="cms_slots_designer_back_to_list_dock"
    >
      <BeaconFeatureRouteDockBackButton type="button" disabled={disabled} onClick={() => void onBackToList()}>
        {CMS_SLOTS_DESIGNER_BACK_TO_LIST_LABEL}
      </BeaconFeatureRouteDockBackButton>
    </div>
  );
}
