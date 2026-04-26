import { BEACON_EMBED_SYNC_STRIP_DEFAULT_COPY } from "@/features/beacons/model/beacon-embed-sync";
import type { BeaconOnPage } from "@/features/beacons/model/beacon-page-targets";
import { BeaconEmbedSyncStrip } from "@/features/beacons/ui/beacon-embed-sync-strip";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Separator } from "@/shared/ui/separator";
import { BeaconPreInstallBlock } from "./beacon-pre-install-block";
import { OnThisPageSection } from "./on-this-page-section";

type BeaconHomePanelProps = {
  nameFieldId: string;
  beaconsWrapperInstalled: boolean;
  installPending: boolean;
  onInstallWrapper: () => void;
  legacyBeaconsOnBody: BeaconOnPage[];
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
  embedSyncPending: boolean;
  onSyncInstallEmbed: () => void;
  pageRuntimeStatusLoading: boolean;
  pageRuntimeSynced: boolean;
  pageRuntimeSyncReason?: string;
};

export function BeaconHomePanel(props: BeaconHomePanelProps) {
  const {
    nameFieldId,
    beaconsWrapperInstalled,
    installPending,
    onInstallWrapper,
    legacyBeaconsOnBody,
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
    embedSyncPending,
    onSyncInstallEmbed,
    pageRuntimeStatusLoading,
    pageRuntimeSynced,
    pageRuntimeSyncReason,
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
      {legacyBeaconsOnBody.length > 0 ? (
        <Alert variant="destructive" className="items-start">
          <AlertDescription className="text-balance">
            {legacyBeaconsOnBody.length} on body, not in wrapper. Move in Navigator or recreate.
          </AlertDescription>
        </Alert>
      ) : null}

      {legacyBeaconsOnBody.length > 0 ? <Separator /> : null}

      <BeaconEmbedSyncStrip
        dataSlot="beacon_embed_sync_home"
        embedSyncPending={embedSyncPending}
        disableButton={pageScanLoading}
        onSyncInstallEmbed={onSyncInstallEmbed}
        pageRuntimeStatusLoading={pageRuntimeStatusLoading}
        pageRuntimeSynced={pageRuntimeSynced}
        pageRuntimeSyncReason={pageRuntimeSyncReason}
        copy={BEACON_EMBED_SYNC_STRIP_DEFAULT_COPY}
      />

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
