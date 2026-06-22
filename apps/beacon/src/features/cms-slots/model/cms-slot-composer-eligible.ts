import {
  type CmsSlotDesignerSlotPropsFile,
  readCmsSlotDesignerSlotPropsFile,
} from "@/features/cms-slots/model/cms-slot-designer-slot-props";
import { hasCmsSlotListTargetInstanceOnPageByName } from "@/features/cms-slots/model/cms-slot-list-target-instances-on-page";
import {
  type CmsSlotPageRuntimeSyncStatus,
  getCmsSlotPageRuntimeSyncStatus,
} from "@/features/cms-slots/model/cms-slot-page-inline-script";
import {
  type CmsSlotListOnPage,
  filterHydratedCmsSlotRowsByPoolKeys,
  listInstancesInSlotListContainer,
  readCmsSlotDesignerConfiguredPoolKeys,
} from "@/features/cms-slots/model/cms-slot-page-targets";

export type ComposerEligibleList = CmsSlotListOnPage;

/**
 * True when this CMS slot has at least one Designer component in the configured palette with exposed Composer props.
 * Page runtime sync is enforced separately in {@link listComposerEligibleLists}.
 */
export function cmsSlotHasComposerReadyDesignerComponent(input: {
  configuredPoolKeys: readonly string[] | null;
  scopedRowCount: number;
  slotProps: CmsSlotDesignerSlotPropsFile;
}): boolean {
  if (input.configuredPoolKeys == null || input.configuredPoolKeys.length === 0) {
    return false;
  }
  if (input.scopedRowCount === 0) {
    return false;
  }
  return input.slotProps.slots.some((slot) => slot.exposed.length > 0);
}

async function hasComposerReadyDesignerSlot(container: BlockElement): Promise<boolean> {
  const configuredPoolKeys = await readCmsSlotDesignerConfiguredPoolKeys(container);
  const rows = await listInstancesInSlotListContainer(container);
  const scopedRows = filterHydratedCmsSlotRowsByPoolKeys(rows, configuredPoolKeys ?? []);
  const slotProps = await readCmsSlotDesignerSlotPropsFile(container, scopedRows.length);
  return cmsSlotHasComposerReadyDesignerComponent({
    configuredPoolKeys,
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
    if (!(await hasComposerReadyDesignerSlot(b.container))) {
      continue;
    }
    eligible.push(b);
  }

  return { eligible, runtimeOk: true };
}
