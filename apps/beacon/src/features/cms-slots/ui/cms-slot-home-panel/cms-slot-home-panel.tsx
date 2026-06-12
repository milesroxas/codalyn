import type { CmsSlotListOnPage } from "@/features/cms-slots/model/cms-slot-page-targets";
import { cmsSlotsHomePanelContentKey } from "@/features/cms-slots/model/cms-slots-panel-content-key";
import type { CmsComposerEditingContextViewModel } from "@/features/cms-slots/model/use-cms-composer-editing-context-state";
import { CmsSlotsComposerEditingContextCard } from "@/features/cms-slots/ui/cms-slots-composer-editing-context-card";
import { CmsSlotsPreInstallEmptyState } from "@/features/cms-slots/ui/cms-slots-pre-install-empty-state";
import { CmsSlotsRouteMainIntro } from "@/features/cms-slots/ui/cms-slots-route-main-intro";
import { OnThisPageSection } from "./on-this-page-section";

type CmsSlotHomePanelProps = {
  composerEditingContext: CmsComposerEditingContextViewModel;
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
    composerEditingContext,
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

  const homeContentKey = cmsSlotsHomePanelContentKey({ routeStateKnown, beaconsWrapperInstalled });

  if (homeContentKey === "install") {
    return (
      <CmsSlotsPreInstallEmptyState
        data-slot="beacon_install_prompt"
        installPending={installPending}
        pageScanLoading={pageScanLoading}
        onInstallWrapper={onInstallWrapper}
      />
    );
  }

  return (
    <div className="space-y-4" data-slot="beacon_home_installed">
      <CmsSlotsRouteMainIntro segment="designer" />
      <CmsSlotsComposerEditingContextCard context={composerEditingContext} primaryField="collection" />
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
