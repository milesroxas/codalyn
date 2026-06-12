import { BeaconFeatureRouteDockBackButton } from "@/app/ui/beacon-feature-route-chrome";
import { CMS_SLOTS_ENGINE_BACK_TO_LIST_LABEL } from "@/shared/lib/cms-slots-feature-copy";

type CmsSlotEngineBackToListDockProps = {
  disabled?: boolean;
  onBackToList: () => void;
};

/** Full-width strip flush above the CMS Slots route footer (Engine list composition). */
export function CmsSlotEngineBackToListDock(props: CmsSlotEngineBackToListDockProps) {
  const { disabled = false, onBackToList } = props;

  return (
    <div
      className="w-full shrink-0 border-t border-border bg-background px-3 pt-2.5 pb-2.5"
      data-slot="cms_slots_engine_back_to_list_dock"
    >
      <BeaconFeatureRouteDockBackButton type="button" disabled={disabled} onClick={() => void onBackToList()}>
        {CMS_SLOTS_ENGINE_BACK_TO_LIST_LABEL}
      </BeaconFeatureRouteDockBackButton>
    </div>
  );
}
