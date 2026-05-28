import {
  type CmsSlotEngineSlotPropsFile,
  readCmsSlotEngineSlotPropsFile,
} from "@/features/cms-slots/model/cms-slot-engine-slot-props";
import { hasCmsSlotListTargetInstanceOnPageByName } from "@/features/cms-slots/model/cms-slot-list-target-instances-on-page";
import {
  type CmsSlotPageRuntimeSyncStatus,
  getCmsSlotPageRuntimeSyncStatus,
} from "@/features/cms-slots/model/cms-slot-page-inline-script";
import {
  type CmsSlotListOnPage,
  filterHydratedCmsSlotRowsByComponentIds,
  listInstancesInSlotListContainer,
  readCmsSlotEngineConfiguredComponentIds,
} from "@/features/cms-slots/model/cms-slot-page-targets";

export type ComposerEligibleList = CmsSlotListOnPage;

/**
 * True when this CMS slot has at least one Engine component in the configured palette with exposed Composer props.
 * Page runtime sync is enforced separately in {@link listComposerEligibleLists}.
 */
export function cmsSlotHasComposerReadyEngineComponent(input: {
  configuredComponentIds: readonly string[] | null;
  scopedRowCount: number;
  slotProps: CmsSlotEngineSlotPropsFile;
}): boolean {
  if (input.configuredComponentIds == null || input.configuredComponentIds.length === 0) {
    return false;
  }
  if (input.scopedRowCount === 0) {
    return false;
  }
  return input.slotProps.slots.some((slot) => slot.exposed.length > 0);
}

export async function hasComposerReadyEngineSlot(container: BlockElement): Promise<boolean> {
  const configuredComponentIds = await readCmsSlotEngineConfiguredComponentIds(container);
  const rows = await listInstancesInSlotListContainer(container);
  const scopedRows = filterHydratedCmsSlotRowsByComponentIds(rows, configuredComponentIds ?? []);
  const slotProps = await readCmsSlotEngineSlotPropsFile(container, scopedRows.length);
  return cmsSlotHasComposerReadyEngineComponent({
    configuredComponentIds,
    scopedRowCount: scopedRows.length,
    slotProps,
  });
}

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
    if (!(await hasComposerReadyEngineSlot(b.container))) {
      continue;
    }
    eligible.push(b);
  }

  return { eligible, runtimeOk: true };
}
