import { hasCmsSlotListTargetInstanceOnPageByName } from "@/features/cms-slots/model/cms-slot-list-target-instances-on-page";
import {
  type CmsSlotPageRuntimeSyncStatus,
  getCmsSlotPageRuntimeSyncStatus,
} from "@/features/cms-slots/model/cms-slot-page-inline-script";
import type { CmsSlotListOnPage } from "@/features/cms-slots/model/cms-slot-page-targets";

export type ComposerEligibleList = CmsSlotListOnPage;

export async function listComposerEligibleLists(
  pageBeacons: CmsSlotListOnPage[],
  runtimeStatus?: CmsSlotPageRuntimeSyncStatus
): Promise<{
  eligible: ComposerEligibleList[];
  runtimeOk: boolean;
  runtimeReason?: string;
}> {
  const runtime = runtimeStatus ?? (await getCmsSlotPageRuntimeSyncStatus());
  if (!runtime.synced) {
    return {
      eligible: [],
      runtimeOk: false,
      runtimeReason: runtime.reason,
    };
  }

  const eligible: ComposerEligibleList[] = [];

  for (const b of pageBeacons) {
    if (!(await hasCmsSlotListTargetInstanceOnPageByName(b.dataList, b.container))) {
      continue;
    }
    eligible.push(b);
  }

  return { eligible, runtimeOk: true };
}
