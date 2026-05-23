import type { BeaconPresetStorageEntry, PresetTargetKey } from "@codalyn/webflow-kit";
import { readPageIdFromInstancePresetTargetKey } from "@codalyn/webflow-kit";
import {
  clearBeaconDesignerExportAttrsOnComponentDefinition,
  clearBeaconDesignerExportAttrsOnPageTarget,
} from "@/features/image-editor/lib/apply-beacon-designer-export-attrs-to-target";
import {
  shouldTagComponentDefinitionOnPresetSave,
  shouldTagPageTargetOnPresetSave,
} from "@/features/image-editor/lib/image-editor-preset-form-commit";
import { findImagePageTargetForPresetOnCurrentPage } from "@/features/image-editor/lib/locate-preset-target";
import { ensurePageCanvas } from "@/shared/lib/webflow-page-canvas-context";

export function presetDeleteRequiresDesignerCleanup(scope: BeaconPresetStorageEntry["scope"]): boolean {
  return shouldTagPageTargetOnPresetSave(scope) || shouldTagComponentDefinitionOnPresetSave(scope);
}

function readInstancePresetPageId(targetKey: PresetTargetKey): string | null {
  if (targetKey.kind === "bare-image-instance" || targetKey.kind === "component-image-instance") {
    return readPageIdFromInstancePresetTargetKey(targetKey);
  }
  return null;
}

async function cleanupInstancePresetDesignerTags(input: {
  targetKey: PresetTargetKey;
  pageIdHint: string | null;
}): Promise<void> {
  const pageId = readInstancePresetPageId(input.targetKey) ?? input.pageIdHint;
  if (pageId != null) {
    await ensurePageCanvas(pageId);
  }
  const target = await findImagePageTargetForPresetOnCurrentPage(input.targetKey);
  if (target == null) {
    return;
  }
  await clearBeaconDesignerExportAttrsOnPageTarget(target);
}

async function cleanupComponentPresetDesignerTags(input: {
  targetKey: PresetTargetKey;
  pageIdHint: string | null;
}): Promise<void> {
  if (input.targetKey.kind !== "component-image") {
    return;
  }
  await clearBeaconDesignerExportAttrsOnComponentDefinition({
    componentDefinitionId: input.targetKey.componentDefinitionId,
    pageIdHint: input.pageIdHint,
  });
}

/**
 * Best-effort undo of Designer tags written when a preset was saved. Storage removal is handled separately.
 */
export async function cleanupDesignerTagsForPresetEntry(input: {
  entry: BeaconPresetStorageEntry;
  pageIdHint: string | null;
}): Promise<{ ok: true; cleaned: boolean } | { ok: false; error: string }> {
  const { entry, pageIdHint } = input;
  if (!presetDeleteRequiresDesignerCleanup(entry.scope)) {
    return { ok: true, cleaned: false };
  }

  try {
    if (shouldTagPageTargetOnPresetSave(entry.scope)) {
      await cleanupInstancePresetDesignerTags({ targetKey: entry.row.targetKey, pageIdHint });
      return { ok: true, cleaned: true };
    }
    if (shouldTagComponentDefinitionOnPresetSave(entry.scope)) {
      await cleanupComponentPresetDesignerTags({ targetKey: entry.row.targetKey, pageIdHint });
      return { ok: true, cleaned: true };
    }
    return { ok: true, cleaned: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not clear Designer tags for this preset.";
    return { ok: false, error: message };
  }
}
