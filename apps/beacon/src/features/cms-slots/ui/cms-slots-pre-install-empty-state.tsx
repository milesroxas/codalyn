import { Loader2, Radio } from "lucide-react";
import { CmsSlotsRouteHeroEmptyCenter } from "@/features/cms-slots/ui/cms-slots-hero-empty-state";
import { CmsSlotsPanelEmptyState } from "@/features/cms-slots/ui/cms-slots-panel-empty-state";
import {
  CMS_SLOTS_INSTALL_LABEL,
  CMS_SLOTS_INSTALL_PENDING_LABEL,
  CMS_SLOTS_PRE_INSTALL_DESCRIPTION,
  CMS_SLOTS_PRE_INSTALL_TITLE,
} from "@/shared/lib/cms-slots-feature-copy";
import { EmptyAction } from "@/shared/ui/empty";

type CmsSlotsPreInstallEmptyStateProps = {
  "data-slot": string;
  installPending: boolean;
  pageScanLoading: boolean;
  onInstallWrapper: () => void;
};

export function CmsSlotsPreInstallEmptyState(props: CmsSlotsPreInstallEmptyStateProps) {
  const { installPending, pageScanLoading, onInstallWrapper, "data-slot": dataSlot } = props;

  return (
    <CmsSlotsRouteHeroEmptyCenter data-slot={dataSlot}>
      <CmsSlotsPanelEmptyState
        data-slot="cms_slots_install"
        icon={Radio}
        title={CMS_SLOTS_PRE_INSTALL_TITLE}
        description={CMS_SLOTS_PRE_INSTALL_DESCRIPTION}
        footer={
          <EmptyAction
            disabled={installPending || pageScanLoading}
            aria-busy={installPending}
            onClick={() => void onInstallWrapper()}
          >
            {installPending ? (
              <Loader2 data-icon="inline-start" className="shrink-0 animate-spin" aria-hidden />
            ) : (
              <Radio data-icon="inline-start" aria-hidden strokeWidth={1.75} />
            )}
            <span>{installPending ? CMS_SLOTS_INSTALL_PENDING_LABEL : CMS_SLOTS_INSTALL_LABEL}</span>
          </EmptyAction>
        }
      />
    </CmsSlotsRouteHeroEmptyCenter>
  );
}
