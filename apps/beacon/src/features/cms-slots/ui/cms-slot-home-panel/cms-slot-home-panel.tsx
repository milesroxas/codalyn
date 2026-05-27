import type { CmsSlotListOnPage } from "@/features/cms-slots/model/cms-slot-page-targets";
import { shouldShowCmsSlotsPreInstall } from "@/features/cms-slots/model/cms-slots-access";
import { CmsSlotPreInstallBlock } from "@/features/cms-slots/ui/cms-slot-pre-install-block";
import { CmsSlotsRouteMainIntro } from "@/features/cms-slots/ui/cms-slots-route-main-intro";
import { OnThisPageSection } from "./on-this-page-section";

type CmsSlotHomePanelProps = {
  nameFieldId: string;
  beaconsWrapperInstalled: boolean;
  installPending: boolean;
  onInstallWrapper: () => void;
  pageBeacons: CmsSlotListOnPage[];
  pageScanLoading: boolean;
  routeStateKnown: boolean;
  beaconName: string;
  setBeaconName: (v: string) => void;
  createPending: boolean;
  createFormOpen: boolean;
  setCreateFormOpen: (v: boolean) => void;
  onCreate: () => void;
  onOpenBeacon: (b: CmsSlotListOnPage) => void;
  onRequestDelete: (b: CmsSlotListOnPage) => void;
  onRenameBeacon: (b: CmsSlotListOnPage, nextDisplayName: string) => boolean | Promise<boolean>;
  openingBeaconKey: string | null;
  deletePendingKey: string | null;
  renamePendingKey: string | null;
};

export function CmsSlotHomePanel(props: CmsSlotHomePanelProps) {
  const {
    nameFieldId,
    beaconsWrapperInstalled,
    installPending,
    onInstallWrapper,
    pageBeacons,
    pageScanLoading,
    routeStateKnown,
    beaconName,
    setBeaconName,
    createPending,
    createFormOpen,
    setCreateFormOpen,
    onCreate,
    onOpenBeacon,
    onRequestDelete,
    onRenameBeacon,
    openingBeaconKey,
    deletePendingKey,
    renamePendingKey,
  } = props;

  if (!routeStateKnown) {
    return null;
  }

  if (shouldShowCmsSlotsPreInstall({ routeStateKnown, beaconsWrapperInstalled })) {
    return (
      <div className="flex min-h-[40vh] flex-col items-stretch justify-center py-4" data-slot="beacon_install_prompt">
        <CmsSlotPreInstallBlock
          installPending={installPending}
          pageScanLoading={pageScanLoading}
          onInstallWrapper={onInstallWrapper}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-slot="beacon_home_installed">
      <CmsSlotsRouteMainIntro segment="engine" />
      <OnThisPageSection
        nameFieldId={nameFieldId}
        pageBeacons={pageBeacons}
        pageScanLoading={pageScanLoading}
        createFormOpen={createFormOpen}
        setCreateFormOpen={setCreateFormOpen}
        beaconName={beaconName}
        setBeaconName={setBeaconName}
        createPending={createPending}
        onCreate={onCreate}
        onOpenBeacon={onOpenBeacon}
        onRequestDelete={onRequestDelete}
        onRenameBeacon={onRenameBeacon}
        openingBeaconKey={openingBeaconKey}
        deletePendingKey={deletePendingKey}
        renamePendingKey={renamePendingKey}
      />
    </div>
  );
}
