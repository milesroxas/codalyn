import { hasBeaconListTargetInstanceOnPageByName } from "@/features/beacons/model/beacon-list-target-instances-on-page";
import { getBeaconPageRuntimeSyncStatus } from "@/features/beacons/model/beacon-page-inline-script";
import type { BeaconOnPage } from "@/features/beacons/model/beacon-page-targets";

export type ComposerEligibleList = BeaconOnPage;

export async function listComposerEligibleLists(pageBeacons: BeaconOnPage[]): Promise<{
  eligible: ComposerEligibleList[];
  runtimeOk: boolean;
  runtimeReason?: string;
  /** Same check as Engine: footer custom code matches this extension build. */
  pageRuntimeSynced: boolean;
}> {
  const runtime = await getBeaconPageRuntimeSyncStatus();
  if (!runtime.synced) {
    return {
      eligible: [],
      runtimeOk: false,
      runtimeReason: runtime.reason,
      pageRuntimeSynced: false,
    };
  }

  const eligible: ComposerEligibleList[] = [];

  for (const b of pageBeacons) {
    if (!(await hasBeaconListTargetInstanceOnPageByName(b.dataList, b.container))) {
      continue;
    }
    eligible.push(b);
  }

  return { eligible, runtimeOk: true, pageRuntimeSynced: true };
}
