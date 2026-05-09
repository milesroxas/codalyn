import { hasCmsSlotListTargetInstanceOnPageByName } from "@/features/cms-slots/model/cms-slot-list-target-instances-on-page";
import { getCmsSlotPageRuntimeSyncStatus } from "@/features/cms-slots/model/cms-slot-page-inline-script";
import type { CmsSlotListOnPage } from "@/features/cms-slots/model/cms-slot-page-targets";

export type ComposerEligibleList = CmsSlotListOnPage;

export async function listComposerEligibleLists(pageBeacons: CmsSlotListOnPage[]): Promise<{
  eligible: ComposerEligibleList[];
  runtimeOk: boolean;
  runtimeReason?: string;
  /** Same check as Engine: footer custom code matches this extension build. */
  pageRuntimeSynced: boolean;
}> {
  const runtime = await getCmsSlotPageRuntimeSyncStatus();
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
    if (!(await hasCmsSlotListTargetInstanceOnPageByName(b.dataList, b.container))) {
      continue;
    }
    eligible.push(b);
  }

  return { eligible, runtimeOk: true, pageRuntimeSynced: true };
}
