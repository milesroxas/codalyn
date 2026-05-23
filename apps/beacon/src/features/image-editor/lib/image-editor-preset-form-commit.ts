import {
  type BeaconPresetRow,
  type BeaconPresetStorageEntry,
  buildPresetTargetKeyForScope,
  createBeaconPresetResolver,
  createSiteDefaultPresetTargetKey,
  draftToMaxBytes,
  type ImageExportFormat,
  type MaxSizeUnit,
  type PresetCrudScope,
  type ResolvedUploadTarget,
  serializePresetTargetKey,
} from "@codalyn/webflow-kit";
import type { MutableRefObject } from "react";
import { setBeaconDesignerExportAttrsOnPageTarget } from "@/features/image-editor/lib/apply-beacon-designer-export-attrs-to-target";
import { parseOutputDimension } from "@/features/image-editor/lib/apply-cropped-export";
import { clampExportDimensionsToMaxEdge } from "@/features/image-editor/lib/clamp-export-dimensions";
import {
  mapSelectedTargetToResolvedUploadTarget,
  toBeaconPresetSettingsSnapshot,
} from "@/features/image-editor/lib/image-editor-resolved-target";
import {
  getSelectedImageTargetHint,
  type ImagePageTarget,
} from "@/features/image-editor/lib/scan-image-targets-on-page";
import type {
  BeaconAppSettingsPatch,
  BeaconSettingsUpdateResult,
} from "@/features/settings/model/beacon-app-settings-provider";

async function resolvePresetTagTarget(
  picked: ImagePageTarget | null,
  scanned: ImagePageTarget[]
): Promise<ImagePageTarget | null> {
  if (picked) {
    return picked;
  }
  const hint = await getSelectedImageTargetHint(scanned);
  if (hint.kind === "image" || hint.kind === "component") {
    return hint.target;
  }
  return null;
}

export type ParsedPresetDraft = {
  name: string;
  width: number;
  height: number;
  exportFormat?: ImageExportFormat;
  maxFileSizeBytes: number;
};

export function parsePresetDraft(input: {
  nameDraft: string;
  wStr: string;
  hStr: string;
  formatEnabled: boolean;
  formatDraft: ImageExportFormat;
  maxSizeStr: string;
  maxSizeUnit: MaxSizeUnit;
}): ParsedPresetDraft | null {
  const { nameDraft, wStr, hStr, formatEnabled, formatDraft, maxSizeStr, maxSizeUnit } = input;
  const name = nameDraft.trim();
  if (!name) {
    return null;
  }
  const wRaw = parseOutputDimension(wStr, 1200);
  const hRaw = parseOutputDimension(hStr, 1200);
  const { width, height } = clampExportDimensionsToMaxEdge(wRaw, hRaw);
  return {
    name,
    width,
    height,
    exportFormat: formatEnabled ? formatDraft : undefined,
    maxFileSizeBytes: draftToMaxBytes(maxSizeStr, maxSizeUnit),
  };
}

async function resolveScopeTargetForSave(input: {
  scope: PresetCrudScope;
  siteId: string | null;
  pageId: string | null;
  tagTarget: ImagePageTarget | null;
}): Promise<Exclude<ResolvedUploadTarget, { kind: "cms-ambiguous" }> | null> {
  const { scope, siteId, pageId, tagTarget } = input;
  if (scope === "site-default") {
    return null;
  }
  if (siteId == null || pageId == null || tagTarget == null) {
    return null;
  }
  const resolvedTarget = await mapSelectedTargetToResolvedUploadTarget({
    siteId,
    pageId,
    autoPageTarget: tagTarget,
    selectedElement: null,
    selectedComponentImagePropId: tagTarget.kind === "component" ? (tagTarget.imagePropId ?? null) : null,
    elementCmsBinding: "none",
  });
  if (resolvedTarget == null || resolvedTarget.kind === "cms-ambiguous") {
    return null;
  }
  return resolvedTarget;
}

async function savePreset(args: {
  siteId: string;
  editingEntry: BeaconPresetStorageEntry | null;
  presetScope: PresetCrudScope;
  resolvedTargetForScope: Exclude<ResolvedUploadTarget, { kind: "cms-ambiguous" }> | null;
  draft: ParsedPresetDraft;
  updateSettings: (patch: BeaconAppSettingsPatch) => Promise<BeaconSettingsUpdateResult>;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { siteId, editingEntry, presetScope, resolvedTargetForScope, draft, updateSettings } = args;
  const nextId = editingEntry?.row.id ?? crypto.randomUUID();
  const nextTargetKey =
    editingEntry?.row.targetKey ??
    (presetScope === "site-default"
      ? createSiteDefaultPresetTargetKey(siteId)
      : resolvedTargetForScope
        ? buildPresetTargetKeyForScope({ scope: presetScope, target: resolvedTargetForScope })
        : null);
  if (nextTargetKey == null) {
    return { ok: false, error: "This scope is unavailable for the selected surface." };
  }

  let validationResult: { ok: true } | { ok: false; error: string } = { ok: true };
  const nextRow: BeaconPresetRow = {
    id: nextId,
    name: draft.name,
    width: draft.width,
    height: draft.height,
    exportFormat: draft.exportFormat,
    maxFileSizeBytes: draft.maxFileSizeBytes,
    targetKey: nextTargetKey,
  };

  const syncResult = await updateSettings((prev) => {
    const duplicateResult = createBeaconPresetResolver().assertUniqueTarget(
      toBeaconPresetSettingsSnapshot(prev),
      nextTargetKey,
      editingEntry?.row.id
    );
    if (duplicateResult !== "ok") {
      validationResult = { ok: false, error: "A preset already exists for this target." };
      return {};
    }

    const filteredByTargetEntries = Object.entries(prev.imagePresetStorage.byTargetKey).filter(
      ([, row]) => row.id !== nextId
    );
    const byTargetKey = Object.fromEntries(filteredByTargetEntries);
    if (nextTargetKey.kind === "site-default") {
      return {
        imagePresetStorage: {
          siteDefault: nextRow,
          byTargetKey,
        },
      };
    }
    byTargetKey[serializePresetTargetKey(nextTargetKey)] = nextRow;
    return {
      imagePresetStorage: {
        siteDefault: prev.imagePresetStorage.siteDefault?.id === nextId ? null : prev.imagePresetStorage.siteDefault,
        byTargetKey,
      },
    };
  });

  if (!validationResult.ok) {
    return validationResult;
  }
  if (!syncResult.ok) {
    return syncResult;
  }
  return { ok: true };
}

function validationErrorForTagTarget(input: {
  editingId: string | null;
  presetScope: PresetCrudScope;
  tagTarget: ImagePageTarget | null;
}): string | null {
  const { editingId, presetScope, tagTarget } = input;
  if (!editingId && presetScope !== "site-default" && !tagTarget) {
    return "Select an Image on the canvas or pick a surface in the list, then save.";
  }
  return null;
}

async function commitPresetMutation(args: {
  siteId: string | null;
  editingEntry: BeaconPresetStorageEntry | null;
  presetScope: PresetCrudScope;
  resolvedTargetForScope: Exclude<ResolvedUploadTarget, { kind: "cms-ambiguous" }> | null;
  draft: ParsedPresetDraft;
  updateSettings: (patch: BeaconAppSettingsPatch) => Promise<BeaconSettingsUpdateResult>;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { siteId, editingEntry, presetScope, resolvedTargetForScope, draft, updateSettings } = args;
  if (siteId == null) {
    return { ok: false, error: "Could not resolve site context for this preset." };
  }
  return savePreset({
    siteId,
    editingEntry,
    presetScope,
    resolvedTargetForScope,
    draft,
    updateSettings,
  });
}

export type CommitImagePresetFormArgs = {
  saveInFlightRef: MutableRefObject<boolean>;
  setFormError: (v: string | null) => void;
  setSavePending: (v: boolean) => void;
  nameDraft: string;
  wStr: string;
  hStr: string;
  formatEnabled: boolean;
  formatDraft: ImageExportFormat;
  maxSizeStr: string;
  maxSizeUnit: MaxSizeUnit;
  presetScope: PresetCrudScope;
  siteId: string | null;
  pageId: string | null;
  editingEntry: BeaconPresetStorageEntry | null;
  formTarget: ImagePageTarget | null;
  formTargets: ImagePageTarget[];
  editingId: string | null;
  updateSettings: (patch: BeaconAppSettingsPatch) => Promise<BeaconSettingsUpdateResult>;
  backToList: () => void;
};

export async function commitImagePresetForm(args: CommitImagePresetFormArgs): Promise<void> {
  const {
    saveInFlightRef,
    setFormError,
    setSavePending,
    nameDraft,
    wStr,
    hStr,
    formatEnabled,
    formatDraft,
    maxSizeStr,
    maxSizeUnit,
    presetScope,
    siteId,
    pageId,
    editingEntry,
    formTarget,
    formTargets,
    editingId,
    updateSettings,
    backToList,
  } = args;

  if (saveInFlightRef.current) {
    return;
  }

  setFormError(null);
  const parsedDraft = parsePresetDraft({
    nameDraft,
    wStr,
    hStr,
    formatEnabled,
    formatDraft,
    maxSizeStr,
    maxSizeUnit,
  });
  if (parsedDraft == null) {
    setFormError("Enter a name for this preset.");
    return;
  }

  saveInFlightRef.current = true;
  setSavePending(true);
  try {
    const tagTarget = await resolvePresetTagTarget(formTarget, formTargets);
    const targetValidationError = validationErrorForTagTarget({
      editingId,
      presetScope,
      tagTarget,
    });
    if (targetValidationError) {
      setFormError(targetValidationError);
      return;
    }
    const resolvedTargetForScope = await resolveScopeTargetForSave({
      scope: presetScope,
      siteId,
      pageId,
      tagTarget,
    });
    if (presetScope !== "site-default" && resolvedTargetForScope == null && editingEntry == null) {
      setFormError("Could not resolve a valid preset target. Refresh and try again.");
      return;
    }

    const saved = await commitPresetMutation({
      siteId,
      editingEntry,
      presetScope,
      resolvedTargetForScope,
      draft: parsedDraft,
      updateSettings,
    });
    if (!saved.ok) {
      setFormError(saved.error);
      return;
    }

    if (tagTarget) {
      await setBeaconDesignerExportAttrsOnPageTarget(tagTarget, parsedDraft.width, parsedDraft.height);
    }

    void webflow.notify({
      type: "Success",
      message: tagTarget ? "Saved preset and tagged the Image surface." : "Saved preset.",
    });
    backToList();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not save";
    setFormError(msg);
    void webflow.notify({ type: "Error", message: msg });
  } finally {
    saveInFlightRef.current = false;
    setSavePending(false);
  }
}

export type PresetFormSubStep = 1 | 2;

export function tryHandlePresetFormBack(
  formSubStep: PresetFormSubStep,
  setFormError: (v: string | null) => void,
  backToList: () => void,
  goPrevSubStep: () => void
): void {
  setFormError(null);
  if (formSubStep === 1) {
    backToList();
    return;
  }
  goPrevSubStep();
}
