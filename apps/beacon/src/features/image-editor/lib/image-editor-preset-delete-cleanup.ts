import { type BeaconPresetStorageEntry, resolveRemovableComponentExportProps } from "@codalyn/webflow-kit";
import {
  clearBeaconDesignerExportAttrsOnComponentDefinition,
  clearBeaconDesignerExportAttrsOnPageTarget,
  removeBeaconDesignerExportPropsFromComponentDefinition,
} from "@/features/image-editor/lib/apply-beacon-designer-export-attrs-to-target";
import {
  presetScopeWritesDesignerTags,
  readPresetExportDimensionWriteMode,
} from "@/features/image-editor/lib/image-editor-preset-form-commit";
import { isComponentImagePresetTargetKey } from "@/features/image-editor/lib/image-editor-resolved-target";
import {
  findImagePageTargetForPresetOnCurrentPage,
  resolvePageIdForInstancePresetWork,
} from "@/features/image-editor/lib/locate-preset-target";
import { preparePageCanvasForWork } from "@/shared/lib/component-definition-scope";
import { runExclusiveDesignerOp } from "@/shared/lib/exclusive-designer-op";
import { ensurePageCanvas } from "@/shared/lib/webflow-page-canvas-context";

async function cleanupPresetDesignerTags(input: {
  entry: BeaconPresetStorageEntry;
  remaining: readonly BeaconPresetStorageEntry[];
  pageIdHint: string | null;
  componentInstance?: ComponentElement | null;
}): Promise<void> {
  const { entry, remaining, pageIdHint, componentInstance } = input;
  const writeMode = readPresetExportDimensionWriteMode(entry.scope);
  if (writeMode == null) {
    return;
  }
  if (writeMode === "definition-defaults" && isComponentImagePresetTargetKey(entry.row.targetKey)) {
    const activePageId = (await ensurePageCanvas(pageIdHint)) ?? pageIdHint;
    if (activePageId == null) {
      throw new Error("Return to a page in the Designer, then delete again.");
    }
    // When no remaining preset still references this definition's shared export props, remove them
    // outright (props + image bindings) instead of only clearing values — no orphaned props left.
    const removable = resolveRemovableComponentExportProps({ deleted: entry, remaining });
    if (removable != null) {
      await removeBeaconDesignerExportPropsFromComponentDefinition(removable.componentDefinitionId, {
        pageIdHint: activePageId,
        instance: componentInstance ?? null,
      });
      return;
    }
    await clearBeaconDesignerExportAttrsOnComponentDefinition(entry.row.targetKey.componentDefinitionId, {
      pageIdHint: activePageId,
      instance: componentInstance ?? null,
    });
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
  /** Presets that remain after `entry` is removed — drives safe removal of shared component props. */
  remaining: readonly BeaconPresetStorageEntry[];
  pageIdHint: string | null;
  /** Reuses a page instance already placed for preset edit/locate work. */
  componentInstance?: ComponentElement | null;
}): Promise<{ ok: true; cleaned: boolean } | { ok: false; error: string }> {
  const { entry, remaining, pageIdHint, componentInstance } = input;
  if (!presetScopeWritesDesignerTags(entry.scope)) {
    return { ok: true, cleaned: false };
  }

  try {
    return await runExclusiveDesignerOp(async () => {
      await cleanupPresetDesignerTags({ entry, remaining, pageIdHint, componentInstance });
      return { ok: true, cleaned: true } as const;
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not clear Designer tags for this preset.";
    return { ok: false, error: message };
  }
}
