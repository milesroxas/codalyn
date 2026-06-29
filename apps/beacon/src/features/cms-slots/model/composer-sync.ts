import { clearCmsSlotComponentDefCache } from "@/features/cms-slots/model/cms-slot-component-def-cache";
import type { ComposableInstancePropMeta } from "@/features/cms-slots/model/cms-slot-composable-props";
import { listComposableMetaByInstanceKey } from "@/features/cms-slots/model/cms-slot-composable-props";
import {
  cmsSlotCompositionSignature,
  draftToHiddenListIndices,
  normalizeComposerDraftPropValues,
  resolveComposerTargetOrder,
} from "@/features/cms-slots/model/cms-slot-composer-cms-draft";
import {
  type CmsSlotDesignerSlotPropsFile,
  readCmsSlotDesignerSlotPropsFile,
} from "@/features/cms-slots/model/cms-slot-designer-slot-props";
import {
  type CmsSlotListOnPage,
  filterHydratedCmsSlotRowsByPoolKeys,
  type HydratedCmsSlotRow,
  listInstancesInSlotListContainer,
  resolveCmsSlotDesignerConfiguredPoolKeys,
} from "@/features/cms-slots/model/cms-slot-page-targets";
import { paletteForConfiguredPoolKeys } from "@/features/cms-slots/model/palette-for-configured-component-ids";
import type { CmsSlotCompositionDraftRow } from "@/features/cms-slots/model/site-components";

export type ComposerSyncResult = {
  allowedPalette: Awaited<ReturnType<typeof paletteForConfiguredPoolKeys>>;
  designerScopedRows: HydratedCmsSlotRow[];
  composerDesignerComposable: Record<string, ComposableInstancePropMeta[]>;
  composerSlotProps: CmsSlotDesignerSlotPropsFile;
  draft: CmsSlotCompositionDraftRow[];
  initialSignature: string;
};

export async function loadComposerSynchronizedState(args: {
  slotList: CmsSlotListOnPage;
  currentCmsItemId: string | null;
  shouldAbort: () => boolean;
}): Promise<ComposerSyncResult | null> {
  const { slotList, currentCmsItemId, shouldAbort } = args;
  // Refresh semantics: drop cached component definitions so this sync reflects the current Designer state.
  clearCmsSlotComponentDefCache();
  const rows = await listInstancesInSlotListContainer(slotList.container);
  if (shouldAbort()) return null;
  const configuredPoolKeys = await resolveCmsSlotDesignerConfiguredPoolKeys(slotList.container, rows);
  if (shouldAbort()) return null;
  const designerScopedRows = filterHydratedCmsSlotRowsByPoolKeys(rows, configuredPoolKeys);
  // Palette, composable metas, slot-props file, and target order are independent reads off the same designer-scoped
  // rows — fan them out so the sync cost is the slowest call, not their sum.
  const [allowedPalette, composerDesignerComposable, composerSlotProps, { draft: rawDraft }] = await Promise.all([
    paletteForConfiguredPoolKeys(configuredPoolKeys, rows),
    listComposableMetaByInstanceKey(designerScopedRows),
    readCmsSlotDesignerSlotPropsFile(slotList.container, designerScopedRows.length),
    resolveComposerTargetOrder({
      listContainer: slotList.container,
      designerScopedRows,
      currentCmsItemId,
    }),
  ]);
  if (shouldAbort()) return null;
  const mapped = draftToHiddenListIndices(designerScopedRows, rawDraft);
  const draft = mapped.ok
    ? normalizeComposerDraftPropValues(
        rawDraft,
        mapped.indices,
        designerScopedRows,
        composerSlotProps,
        composerDesignerComposable
      )
    : rawDraft;
  const initialSignature = cmsSlotCompositionSignature(draft);
  return {
    allowedPalette,
    designerScopedRows,
    composerDesignerComposable,
    composerSlotProps,
    draft,
    initialSignature,
  };
}
