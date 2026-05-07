import type { BeaconOnPage } from "@/features/beacons/model/beacon-page-targets";
import { BeaconPreInstallBlock } from "@/features/beacons/ui/beacon-pre-install-block";
import { OnThisPageSection } from "./on-this-page-section";

type BeaconHomePanelProps = {
  nameFieldId: string;
  beaconsWrapperInstalled: boolean;
  installPending: boolean;
  onInstallWrapper: () => void;
  pageBeacons: BeaconOnPage[];
  pageScanLoading: boolean;
  beaconName: string;
  setBeaconName: (v: string) => void;
  createPending: boolean;
  createFormOpen: boolean;
  setCreateFormOpen: (v: boolean) => void;
  onCreate: () => void;
  onOpenBeacon: (b: BeaconOnPage) => void;
  onRequestDelete: (b: BeaconOnPage) => void;
  openingBeaconKey: string | null;
  deletePendingKey: string | null;
};

export function BeaconHomePanel(props: BeaconHomePanelProps) {
  const {
    nameFieldId,
    beaconsWrapperInstalled,
    installPending,
    onInstallWrapper,
    pageBeacons,
    pageScanLoading,
    beaconName,
    setBeaconName,
    createPending,
    createFormOpen,
    setCreateFormOpen,
    onCreate,
    onOpenBeacon,
    onRequestDelete,
    openingBeaconKey,
    deletePendingKey,
  } = props;

  if (!beaconsWrapperInstalled) {
    return (
      <div className="flex min-h-[40vh] flex-col items-stretch justify-center py-4" data-slot="beacon_install_prompt">
        <BeaconPreInstallBlock
          installPending={installPending}
          pageScanLoading={pageScanLoading}
          onInstallWrapper={onInstallWrapper}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-slot="beacon_home_installed">
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
        openingBeaconKey={openingBeaconKey}
        deletePendingKey={deletePendingKey}
      />
    </div>
  );
}
