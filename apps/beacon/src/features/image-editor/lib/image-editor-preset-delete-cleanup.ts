import type { BeaconPresetStorageEntry } from "@codalyn/webflow-kit";
import { clearBeaconDesignerExportAttrsOnPageTarget } from "@/features/image-editor/lib/apply-beacon-designer-export-attrs-to-target";
import {
  presetScopeWritesDesignerTags,
  readPresetExportDimensionWriteMode,
} from "@/features/image-editor/lib/image-editor-preset-form-commit";
import {
  findImagePageTargetForPresetOnCurrentPage,
  resolvePageIdForInstancePresetWork,
} from "@/features/image-editor/lib/locate-preset-target";
import { preparePageCanvasForWork } from "@/shared/lib/component-definition-scope";
import { runExclusiveDesignerOp } from "@/shared/lib/exclusive-designer-op";

async function cleanupPresetDesignerTags(input: {
  entry: BeaconPresetStorageEntry;
  pageIdHint: string | null;
}): Promise<void> {
  const { entry, pageIdHint } = input;
  const writeMode = readPresetExportDimensionWriteMode(entry.scope);
  if (writeMode == null) {
    return;
  }
  const pageId = resolvePageIdForInstancePresetWork(entry.row.targetKey, pageIdHint);
  await preparePageCanvasForWork(pageId);
  const target = await findImagePageTargetForPresetOnCurrentPage(entry.row.targetKey);
  if (target == null) {
    return;
  }
  await clearBeaconDesignerExportAttrsOnPageTarget(target, { writeMode, pageIdHint });
}

/**
 * Best-effort undo of Designer tags written when a preset was saved. Storage removal is handled separately.
 */
export async function cleanupDesignerTagsForPresetEntry(input: {
  entry: BeaconPresetStorageEntry;
  pageIdHint: string | null;
}): Promise<{ ok: true; cleaned: boolean } | { ok: false; error: string }> {
  const { entry, pageIdHint } = input;
  if (!presetScopeWritesDesignerTags(entry.scope)) {
    return { ok: true, cleaned: false };
  }

  try {
    return await runExclusiveDesignerOp(async () => {
      await cleanupPresetDesignerTags({ entry, pageIdHint });
      return { ok: true, cleaned: true } as const;
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not clear Designer tags for this preset.";
    return { ok: false, error: message };
  }
}
