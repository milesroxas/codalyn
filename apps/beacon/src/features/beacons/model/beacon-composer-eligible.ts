import { listBeaconListTargetInstancesOnPage } from "@/features/beacons/model/beacon-list-target-instances-on-page";
import { getBeaconPageRuntimeSyncStatus } from "@/features/beacons/model/beacon-page-inline-script";
import type { BeaconOnPage } from "@/features/beacons/model/beacon-page-targets";
import { listInstancesInBeaconTarget } from "@/features/beacons/model/beacon-page-targets";
import { getBeaconListTargetComponentOrNull } from "@/features/beacons/model/create-beacon-list-target-component";

export type ComposerEligibleList = BeaconOnPage;

export async function listComposerEligibleLists(
  pageBeacons: BeaconOnPage[]
): Promise<{ eligible: ComposerEligibleList[]; runtimeOk: boolean; runtimeReason?: string }> {
  const runtime = await getBeaconPageRuntimeSyncStatus();
  if (!runtime.synced) {
    return { eligible: [], runtimeOk: false, runtimeReason: runtime.reason };
  }

  const eligible: ComposerEligibleList[] = [];

  for (const b of pageBeacons) {
    const instances = await listInstancesInBeaconTarget(b.container);
    if (instances.length === 0) {
      continue;
    }
    const onCanvas = await listBeaconListTargetInstancesOnPage(b.dataList, b.container);
    if (onCanvas.length === 0) {
      continue;
    }
    const comp = await getBeaconListTargetComponentOrNull(b.dataList, b.container);
    if (comp == null) {
      continue;
    }
    eligible.push(b);
  }

  return { eligible, runtimeOk: true };
}
