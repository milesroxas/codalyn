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
  filterHydratedCmsSlotRowsByComponentIds,
  type HydratedCmsSlotRow,
  listInstancesInSlotListContainer,
  resolveCmsSlotDesignerConfiguredComponentIds,
} from "@/features/cms-slots/model/cms-slot-page-targets";
import { paletteForConfiguredComponentIds } from "@/features/cms-slots/model/palette-for-configured-component-ids";
import type { CmsSlotCompositionDraftRow } from "@/features/cms-slots/model/site-components";

export type ComposerSyncResult = {
  allowedPalette: Awaited<ReturnType<typeof paletteForConfiguredComponentIds>>;
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
  const rows = await listInstancesInSlotListContainer(slotList.container);
  if (shouldAbort()) return null;
  const configuredComponentIds = await resolveCmsSlotDesignerConfiguredComponentIds(slotList.container, rows);
  if (shouldAbort()) return null;
  const designerScopedRows = filterHydratedCmsSlotRowsByComponentIds(rows, configuredComponentIds);
  const allowedPalette = await paletteForConfiguredComponentIds(configuredComponentIds, rows);
  if (shouldAbort()) return null;
  const composerDesignerComposable = await listComposableMetaByInstanceKey(designerScopedRows);
  if (shouldAbort()) return null;
  const composerSlotProps = await readCmsSlotDesignerSlotPropsFile(slotList.container, designerScopedRows.length);
  if (shouldAbort()) return null;
  const { draft: rawDraft } = await resolveComposerTargetOrder({
    listContainer: slotList.container,
    designerScopedRows,
    currentCmsItemId,
  });
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
