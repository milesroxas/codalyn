import type { ComposableInstancePropMeta } from "@/features/cms-slots/model/cms-slot-composable-props";
import { listComposableMetaByInstanceKey } from "@/features/cms-slots/model/cms-slot-composable-props";
import {
  cmsSlotCompositionSignature,
  draftToHiddenListIndices,
  normalizeComposerDraftPropValues,
  resolveComposerTargetOrder,
} from "@/features/cms-slots/model/cms-slot-composer-cms-draft";
import {
  type CmsSlotEngineSlotPropsFile,
  readCmsSlotEngineSlotPropsFile,
} from "@/features/cms-slots/model/cms-slot-engine-slot-props";
import {
  type CmsSlotListOnPage,
  filterHydratedCmsSlotRowsByComponentIds,
  type HydratedCmsSlotRow,
  listInstancesInSlotListContainer,
  resolveCmsSlotEngineConfiguredComponentIds,
} from "@/features/cms-slots/model/cms-slot-page-targets";
import { paletteForConfiguredComponentIds } from "@/features/cms-slots/model/palette-for-configured-component-ids";
import type { CmsSlotCompositionDraftRow } from "@/features/cms-slots/model/site-components";

export type ComposerSyncResult = {
  allowedPalette: Awaited<ReturnType<typeof paletteForConfiguredComponentIds>>;
  engineScopedRows: HydratedCmsSlotRow[];
  composerEngineComposable: Record<string, ComposableInstancePropMeta[]>;
  composerSlotProps: CmsSlotEngineSlotPropsFile;
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
  const configuredComponentIds = await resolveCmsSlotEngineConfiguredComponentIds(slotList.container, rows);
  if (shouldAbort()) return null;
  const engineScopedRows = filterHydratedCmsSlotRowsByComponentIds(rows, configuredComponentIds);
  const allowedPalette = await paletteForConfiguredComponentIds(configuredComponentIds, rows);
  if (shouldAbort()) return null;
  const composerEngineComposable = await listComposableMetaByInstanceKey(engineScopedRows);
  if (shouldAbort()) return null;
  const composerSlotProps = await readCmsSlotEngineSlotPropsFile(slotList.container, engineScopedRows.length);
  if (shouldAbort()) return null;
  const { draft: rawDraft } = await resolveComposerTargetOrder({
    listContainer: slotList.container,
    engineScopedRows,
    currentCmsItemId,
  });
  if (shouldAbort()) return null;
  const mapped = draftToHiddenListIndices(engineScopedRows, rawDraft);
  const draft = mapped.ok
    ? normalizeComposerDraftPropValues(
        rawDraft,
        mapped.indices,
        engineScopedRows,
        composerSlotProps,
        composerEngineComposable
      )
    : rawDraft;
  const initialSignature = cmsSlotCompositionSignature(draft);
  return {
    allowedPalette,
    engineScopedRows,
    composerEngineComposable,
    composerSlotProps,
    draft,
    initialSignature,
  };
}
