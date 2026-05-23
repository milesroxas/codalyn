import {
  BEACON_PRESET_DEFAULT_MAX_FILE_BYTES,
  type BeaconAppSettings,
  type BeaconImagePresetRow,
  type BeaconPresetRowV2,
  buildPresetTargetKeyForScope,
  createBeaconPresetResolver,
  createSiteDefaultPresetTargetKey,
  type PresetCrudScope,
  type ResolvedUploadTarget,
  serializePresetTargetKey,
} from "@codalyn/webflow-kit";
import { Loader2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { setBeaconDesignerExportAttrsOnPageTarget } from "@/features/image-editor/lib/apply-beacon-designer-export-attrs-to-target";
import { parseOutputDimension } from "@/features/image-editor/lib/apply-cropped-export";
import { readBeaconPresetV2ReadEnabled } from "@/features/image-editor/lib/beacon-preset-v2-flags";
import { clampExportDimensionsToMaxEdge } from "@/features/image-editor/lib/clamp-export-dimensions";
import {
  mapSelectedTargetToResolvedUploadTarget,
  toBeaconPresetSettingsSnapshot,
} from "@/features/image-editor/lib/image-editor-resolved-target";
import {
  getSelectedImageTargetHint,
  type ImagePageTarget,
  type SelectedImageTargetHint,
} from "@/features/image-editor/lib/scan-image-targets-on-page";
import { usePresetFormTargets } from "@/features/image-editor/model/use-image-editor-auto-targets";
import {
  type BeaconAppSettingsPatch,
  useBeaconAppSettings,
} from "@/features/settings/model/beacon-app-settings-provider";
import { cn } from "@/shared/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { Separator } from "@/shared/ui/separator";

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

function formatPageTargetLine(t: ImagePageTarget | null, isEdit: boolean): string {
  if (t) {
    return t.kind === "component" && t.imagePropLabel != null ? `${t.label} — ${t.imagePropLabel}` : t.label;
  }
  if (isEdit) {
    return "Unchanged (save updates the preset; tagging if a surface resolves on save).";
  }
  return "—";
}

function targetFromFormSelectionHint(hint: SelectedImageTargetHint): ImagePageTarget | null {
  if (hint.kind === "image" || hint.kind === "component") {
    return hint.target;
  }
  return null;
}

type View = "list" | "form";

/** Add/edit preset form: 1) surface, 2) name + dimensions, 3) save + tag */
type FormSubStep = 1 | 2 | 3;

type ScopeOption = {
  scope: PresetCrudScope;
  label: string;
  enabled: boolean;
  reason?: string;
};

type PresetV2Meta = {
  row: BeaconPresetRowV2;
  scope: PresetCrudScope;
  storageKey: string | null;
};

function labelForScope(scope: PresetCrudScope): string {
  if (scope === "site-default") {
    return "Site default";
  }
  if (scope === "element") {
    return "Element";
  }
  if (scope === "component") {
    return "Component";
  }
  return "Instance";
}

function inferScopeFromTargetKey(row: BeaconPresetRowV2): PresetCrudScope {
  if (row.targetKey.kind === "site-default") {
    return "site-default";
  }
  if (row.targetKey.kind === "component-image") {
    return "component";
  }
  if (row.targetKey.kind === "bare-image-element" || row.targetKey.kind === "component-image-element") {
    return "element";
  }
  return "instance";
}

function scopeOptionReason(args: {
  hasSiteContext: boolean;
  hasPermission?: boolean;
  targetKind: ImagePageTarget["kind"] | null;
  scope: PresetCrudScope;
}): string | undefined {
  const { hasSiteContext, hasPermission = true, targetKind, scope } = args;
  if (!hasSiteContext) {
    return "Site context unavailable.";
  }
  if (scope === "site-default" && !hasPermission) {
    return "Requires team preset management permission.";
  }
  if (scope === "element" && targetKind !== "image") {
    return "Available for standalone images.";
  }
  if (scope === "component" && targetKind !== "component") {
    return "Available for component image props.";
  }
  return undefined;
}

function buildScopeOptions(input: {
  presetV2Enabled: boolean;
  canManageTeamBeaconSettings: boolean;
  siteId: string | null;
  targetKind: ImagePageTarget["kind"] | null;
}): ScopeOption[] {
  const { presetV2Enabled, canManageTeamBeaconSettings, siteId, targetKind } = input;
  if (!presetV2Enabled) {
    return [];
  }
  const hasSiteContext = siteId != null;
  const imageTarget = targetKind === "image";
  const componentTarget = targetKind === "component";
  return [
    {
      scope: "site-default",
      label: "Site default preset",
      enabled: hasSiteContext && canManageTeamBeaconSettings,
      reason: scopeOptionReason({
        hasSiteContext,
        hasPermission: canManageTeamBeaconSettings,
        targetKind,
        scope: "site-default",
      }),
    },
    {
      scope: "element",
      label: "Element preset",
      enabled: hasSiteContext && imageTarget,
      reason: scopeOptionReason({
        hasSiteContext,
        targetKind,
        scope: "element",
      }),
    },
    {
      scope: "component",
      label: "Component preset",
      enabled: hasSiteContext && componentTarget,
      reason: scopeOptionReason({
        hasSiteContext,
        targetKind,
        scope: "component",
      }),
    },
    {
      scope: "instance",
      label: "Instance preset",
      enabled: hasSiteContext && (imageTarget || componentTarget),
      reason: scopeOptionReason({
        hasSiteContext,
        targetKind,
        scope: "instance",
      }),
    },
  ];
}

type ImageEditorConfigurationPresetsStepProps = {
  isGuest: boolean;
  /** Return to the designer start screen (from the preset list). */
  onDone: () => void;
  className?: string;
};

type CommitImagePresetFormArgs = {
  setFormError: (v: string | null) => void;
  setSavePending: (v: boolean) => void;
  nameDraft: string;
  wStr: string;
  hStr: string;
  presetV2Enabled: boolean;
  presetScope: PresetCrudScope;
  shouldWriteTag: boolean;
  siteId: string | null;
  pageId: string | null;
  settings: BeaconAppSettings;
  editingV2Meta: PresetV2Meta | null;
  formTarget: ImagePageTarget | null;
  formTargets: ImagePageTarget[];
  editingId: string | null;
  defaultExportFormat: BeaconAppSettings["defaultExportFormat"];
  updateSettings: (patch: BeaconAppSettingsPatch) => void;
  backToList: () => void;
};

type ParsedPresetDraft = {
  name: string;
  width: number;
  height: number;
};

function parsePresetDraft(nameDraft: string, wStr: string, hStr: string): ParsedPresetDraft | null {
  const name = nameDraft.trim();
  if (!name) {
    return null;
  }
  const wRaw = parseOutputDimension(wStr, 1200);
  const hRaw = parseOutputDimension(hStr, 1200);
  const { width, height } = clampExportDimensionsToMaxEdge(wRaw, hRaw);
  return { name, width, height };
}

async function resolveScopeTargetForSave(input: {
  enabled: boolean;
  scope: PresetCrudScope;
  siteId: string | null;
  pageId: string | null;
  tagTarget: ImagePageTarget | null;
}): Promise<Exclude<ResolvedUploadTarget, { kind: "cms-ambiguous" }> | null> {
  const { enabled, scope, siteId, pageId, tagTarget } = input;
  if (!enabled || scope === "site-default") {
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

function saveLegacyPreset(args: {
  editingId: string | null;
  name: string;
  width: number;
  height: number;
  defaultExportFormat: BeaconAppSettings["defaultExportFormat"];
  updateSettings: (patch: BeaconAppSettingsPatch) => void;
}) {
  const { editingId, name, width, height, defaultExportFormat, updateSettings } = args;
  if (editingId) {
    updateSettings((prev) => ({
      imagePresets: prev.imagePresets.map((p) => (p.id === editingId ? { ...p, name, width, height } : p)),
    }));
    return;
  }
  const row: BeaconImagePresetRow = {
    id: crypto.randomUUID(),
    name,
    width,
    height,
    exportFormat: defaultExportFormat,
    maxFileSizeBytes: BEACON_PRESET_DEFAULT_MAX_FILE_BYTES,
  };
  updateSettings((prev) => ({ imagePresets: [...prev.imagePresets, row] }));
}

function saveV2Preset(args: {
  siteId: string;
  settings: BeaconAppSettings;
  editingV2Meta: PresetV2Meta | null;
  presetScope: PresetCrudScope;
  resolvedTargetForScope: Exclude<ResolvedUploadTarget, { kind: "cms-ambiguous" }> | null;
  draft: ParsedPresetDraft;
  defaultExportFormat: BeaconAppSettings["defaultExportFormat"];
  updateSettings: (patch: BeaconAppSettingsPatch) => void;
  setFormError: (v: string | null) => void;
}): boolean {
  const {
    siteId,
    settings,
    editingV2Meta,
    presetScope,
    resolvedTargetForScope,
    draft,
    defaultExportFormat,
    updateSettings,
    setFormError,
  } = args;
  const nextId = editingV2Meta?.row.id ?? crypto.randomUUID();
  const nextTargetKey =
    editingV2Meta?.row.targetKey ??
    (presetScope === "site-default"
      ? createSiteDefaultPresetTargetKey(siteId)
      : resolvedTargetForScope
        ? buildPresetTargetKeyForScope({ scope: presetScope, target: resolvedTargetForScope })
        : null);
  if (nextTargetKey == null) {
    setFormError("This scope is unavailable for the selected surface.");
    return false;
  }
  const duplicateResult = createBeaconPresetResolver().assertUniqueTarget(
    toBeaconPresetSettingsSnapshot(settings),
    nextTargetKey,
    editingV2Meta?.row.id
  );
  if (duplicateResult !== "ok") {
    setFormError("A preset already exists for this target.");
    return false;
  }
  const nextRow: BeaconPresetRowV2 = {
    id: nextId,
    name: draft.name,
    width: draft.width,
    height: draft.height,
    exportFormat: editingV2Meta?.row.exportFormat ?? defaultExportFormat,
    maxFileSizeBytes: editingV2Meta?.row.maxFileSizeBytes ?? BEACON_PRESET_DEFAULT_MAX_FILE_BYTES,
    targetKey: nextTargetKey,
  };
  updateSettings((prev) => {
    const filteredByTargetEntries = Object.entries(prev.imagePresetStorageV2.byTargetKey).filter(
      ([, row]) => row.id !== nextId
    );
    const byTargetKey = Object.fromEntries(filteredByTargetEntries);
    if (nextTargetKey.kind === "site-default") {
      return {
        imagePresetStorageV2: {
          siteDefault: nextRow,
          byTargetKey,
        },
      };
    }
    byTargetKey[serializePresetTargetKey(nextTargetKey)] = nextRow;
    return {
      imagePresetStorageV2: {
        siteDefault:
          prev.imagePresetStorageV2.siteDefault?.id === nextId ? null : prev.imagePresetStorageV2.siteDefault,
        byTargetKey,
      },
    };
  });
  return true;
}

function validationErrorForTagTarget(input: {
  editingId: string | null;
  presetScope: PresetCrudScope;
  shouldWriteTag: boolean;
  tagTarget: ImagePageTarget | null;
}): string | null {
  const { editingId, presetScope, shouldWriteTag, tagTarget } = input;
  if (!editingId && presetScope !== "site-default" && !tagTarget) {
    return "Select an Image on the canvas or pick a surface in the list, then save.";
  }
  if (shouldWriteTag && !tagTarget) {
    return "Select an Image surface before writing export tags.";
  }
  return null;
}

function commitPresetMutation(args: {
  presetV2Enabled: boolean;
  siteId: string | null;
  settings: BeaconAppSettings;
  editingV2Meta: PresetV2Meta | null;
  presetScope: PresetCrudScope;
  resolvedTargetForScope: Exclude<ResolvedUploadTarget, { kind: "cms-ambiguous" }> | null;
  draft: ParsedPresetDraft;
  defaultExportFormat: BeaconAppSettings["defaultExportFormat"];
  updateSettings: (patch: BeaconAppSettingsPatch) => void;
  setFormError: (v: string | null) => void;
  editingId: string | null;
}): boolean {
  const {
    presetV2Enabled,
    siteId,
    settings,
    editingV2Meta,
    presetScope,
    resolvedTargetForScope,
    draft,
    defaultExportFormat,
    updateSettings,
    setFormError,
    editingId,
  } = args;
  if (presetV2Enabled) {
    if (siteId == null) {
      setFormError("Could not resolve site context for this preset.");
      return false;
    }
    return saveV2Preset({
      siteId,
      settings,
      editingV2Meta,
      presetScope,
      resolvedTargetForScope,
      draft,
      defaultExportFormat,
      updateSettings,
      setFormError,
    });
  }
  saveLegacyPreset({
    editingId,
    name: draft.name,
    width: draft.width,
    height: draft.height,
    defaultExportFormat,
    updateSettings,
  });
  return true;
}

async function commitImagePresetForm(args: CommitImagePresetFormArgs): Promise<void> {
  const {
    setFormError,
    setSavePending,
    nameDraft,
    wStr,
    hStr,
    presetV2Enabled,
    presetScope,
    shouldWriteTag,
    siteId,
    pageId,
    settings,
    editingV2Meta,
    formTarget,
    formTargets,
    editingId,
    defaultExportFormat,
    updateSettings,
    backToList,
  } = args;
  setFormError(null);
  const parsedDraft = parsePresetDraft(nameDraft, wStr, hStr);
  if (parsedDraft == null) {
    setFormError("Enter a name for this preset.");
    return;
  }
  const tagTarget = await resolvePresetTagTarget(formTarget, formTargets);
  const targetValidationError = validationErrorForTagTarget({
    editingId,
    presetScope,
    shouldWriteTag,
    tagTarget,
  });
  if (targetValidationError) {
    setFormError(targetValidationError);
    return;
  }
  const resolvedTargetForScope = await resolveScopeTargetForSave({
    enabled: presetV2Enabled,
    scope: presetScope,
    siteId,
    pageId,
    tagTarget,
  });
  if (presetV2Enabled && presetScope !== "site-default" && resolvedTargetForScope == null) {
    setFormError("Could not resolve a valid preset target. Refresh and try again.");
    return;
  }
  setSavePending(true);
  try {
    if (shouldWriteTag && tagTarget) {
      await setBeaconDesignerExportAttrsOnPageTarget(tagTarget, parsedDraft.width, parsedDraft.height);
    }
    const saved = commitPresetMutation({
      presetV2Enabled,
      siteId,
      settings,
      editingV2Meta,
      presetScope,
      resolvedTargetForScope,
      draft: parsedDraft,
      defaultExportFormat,
      updateSettings,
      setFormError,
      editingId,
    });
    if (!saved) {
      return;
    }
    void webflow.notify({
      type: "Success",
      message: shouldWriteTag ? "Saved preset and tagged the Image surface." : "Saved preset.",
    });
    backToList();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not save";
    setFormError(msg);
    void webflow.notify({ type: "Error", message: msg });
  } finally {
    setSavePending(false);
  }
}

function tryAdvanceFromPresetFormStep1(
  isNewPreset: boolean,
  formTarget: ImagePageTarget | null,
  presetScope: PresetCrudScope,
  setFormError: (v: string | null) => void,
  goStep2: () => void
): void {
  setFormError(null);
  if (isNewPreset && presetScope !== "site-default" && !formTarget) {
    setFormError("Select a surface: use the current selection or pick an Image on the page.");
    return;
  }
  goStep2();
}

function tryAdvanceFromPresetFormStep2(
  nameDraft: string,
  wStr: string,
  hStr: string,
  setFormError: (v: string | null) => void,
  goStep3: () => void
): void {
  setFormError(null);
  const name = nameDraft.trim();
  if (!name) {
    setFormError("Enter a name for this preset.");
    return;
  }
  const wRaw = parseOutputDimension(wStr, 1200);
  const hRaw = parseOutputDimension(hStr, 1200);
  if (wRaw < 1 || hRaw < 1) {
    setFormError("Width and height must be positive numbers.");
    return;
  }
  goStep3();
}

function tryHandlePresetFormBack(
  formSubStep: FormSubStep,
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

function formatPresetFormStepDescription(formSubStep: FormSubStep): string {
  if (formSubStep === 1) {
    return "Image";
  }
  if (formSubStep === 2) {
    return "Size";
  }
  return "Save";
}

function PresetFormTargetSelectionChoice(props: {
  selectionHint: Extract<SelectedImageTargetHint, { kind: "image" } | { kind: "component" }>;
  isCurrentSelectionPicked: boolean;
  onUseCanvasSelection: () => void;
  onChooseAnotherOnPage: () => void;
}) {
  const { selectionHint, isCurrentSelectionPicked, onUseCanvasSelection, onChooseAnotherOnPage } = props;
  return (
    <div className="grid gap-2">
      <Button
        type="button"
        variant={isCurrentSelectionPicked ? "secondary" : "outline"}
        className="h-auto w-full justify-start px-3 py-3 text-left"
        onClick={onUseCanvasSelection}
      >
        <span className="grid gap-0.5">
          <span className="text-sm font-medium">Current selection</span>
          <span className="text-muted-foreground text-[11px]">
            {selectionHint.kind === "image" ? "Image element" : "Component image field"}
          </span>
        </span>
      </Button>
      <Button
        type="button"
        variant="outline"
        className="h-auto w-full justify-start px-3 py-3 text-left"
        onClick={onChooseAnotherOnPage}
      >
        <span className="grid gap-0.5">
          <span className="text-sm font-medium">Pick from page</span>
          <span className="text-muted-foreground text-[11px]">Show available images</span>
        </span>
      </Button>
    </div>
  );
}

function PresetFormTargetPageList(props: {
  targets: ImagePageTarget[];
  scanPending: boolean;
  scanError: string | null;
  pageScanned: boolean;
  onRescan: () => void;
  selectedTarget: ImagePageTarget | null;
  onSelectTarget: (t: ImagePageTarget) => void;
}) {
  const { targets, scanPending, scanError, pageScanned, onRescan, selectedTarget, onSelectTarget } = props;
  const hasListRows = targets.length > 0;
  return (
    <div className={cn("flex w-full min-w-0 flex-col gap-2", hasListRows && "max-h-48 min-h-0 overflow-hidden")}>
      <div className="flex min-w-0 shrink-0 items-center justify-between gap-2">
        <p className="text-muted-foreground text-[11px]">Images on this page</p>
        {pageScanned ? (
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="shrink-0"
            disabled={scanPending}
            onClick={onRescan}
            aria-label="Refresh list"
          >
            {scanPending ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          </Button>
        ) : null}
      </div>
      {scanError ? <p className="shrink-0 text-destructive text-xs">{scanError}</p> : null}
      {scanPending && targets.length === 0 ? (
        <p className="text-muted-foreground flex shrink-0 items-center gap-2 text-xs">
          <Loader2 className="size-3.5 shrink-0 animate-spin" />
          Scanning the page…
        </p>
      ) : null}
      {!pageScanned && !scanPending ? (
        <div className="flex shrink-0 flex-col gap-2">
          <p className="text-muted-foreground text-xs">Scan the page to list image surfaces you can target.</p>
          <Button type="button" size="sm" className="self-start" onClick={onRescan}>
            Scan page
          </Button>
        </div>
      ) : null}
      {pageScanned && targets.length === 0 && !scanPending ? (
        <p className="text-muted-foreground shrink-0 text-xs">
          No Image surfaces found. Add an Image to the page or select one on the canvas.
        </p>
      ) : null}
      {hasListRows ? (
        <ScrollArea className="h-44 w-full min-w-0 pr-2">
          <RadioGroup
            className="grid min-w-0 gap-0"
            value={selectedTarget?.id ?? ""}
            onValueChange={(id) => {
              const t = targets.find((x) => x.id === id);
              if (t) {
                onSelectTarget(t);
              }
            }}
          >
            {targets.map((t, i) => {
              const sub =
                t.kind === "component" && t.imagePropLabel != null ? `${t.label} — ${t.imagePropLabel}` : t.label;
              return (
                <div key={t.id} className="min-w-0">
                  {i > 0 ? <Separator className="my-0" /> : null}
                  <label
                    htmlFor={`preset-form-tgt-${t.id}`}
                    className={cn(
                      "flex min-w-0 cursor-pointer items-center gap-3 py-2 pr-1",
                      selectedTarget?.id === t.id && "bg-accent/40"
                    )}
                  >
                    <RadioGroupItem id={`preset-form-tgt-${t.id}`} value={t.id} className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug">{sub}</p>
                      <p className="text-muted-foreground text-[10px]">
                        {t.kind === "image" ? "Image element" : "Component image field"}
                      </p>
                    </div>
                  </label>
                </div>
              );
            })}
          </RadioGroup>
        </ScrollArea>
      ) : null}
    </div>
  );
}

function TargetPickSection(props: {
  discoverySettled: boolean;
  targets: ImagePageTarget[];
  scanPending: boolean;
  scanError: string | null;
  pageScanned: boolean;
  onRescan: () => void;
  selectionHint: SelectedImageTargetHint;
  selectedTarget: ImagePageTarget | null;
  onSelectTarget: (t: ImagePageTarget) => void;
  onUseCanvasSelection: () => void;
  onChooseAnotherOnPage: () => void;
  showSelectionChoice: boolean;
  showPageTargetList: boolean;
}) {
  const {
    discoverySettled,
    targets,
    scanPending,
    scanError,
    pageScanned,
    onRescan,
    selectionHint,
    selectedTarget,
    onSelectTarget,
    onUseCanvasSelection,
    onChooseAnotherOnPage,
    showSelectionChoice,
    showPageTargetList,
  } = props;

  const currentSelectionTarget = targetFromFormSelectionHint(selectionHint);
  const isCurrentSelectionPicked = currentSelectionTarget != null && selectedTarget?.id === currentSelectionTarget.id;
  const showSelection = showSelectionChoice && (selectionHint.kind === "image" || selectionHint.kind === "component");

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="space-y-1">
        <Label className="text-xs font-medium">Select image</Label>
      </div>

      {!discoverySettled ? (
        <p className="text-muted-foreground flex shrink-0 items-center gap-2 text-xs">
          <Loader2 className="size-3.5 shrink-0 animate-spin" />
          Checking the canvas…
        </p>
      ) : null}

      {showSelection ? (
        <PresetFormTargetSelectionChoice
          isCurrentSelectionPicked={isCurrentSelectionPicked}
          onChooseAnotherOnPage={onChooseAnotherOnPage}
          onUseCanvasSelection={onUseCanvasSelection}
          selectionHint={selectionHint}
        />
      ) : null}

      {showPageTargetList ? (
        <PresetFormTargetPageList
          onRescan={onRescan}
          onSelectTarget={onSelectTarget}
          pageScanned={pageScanned}
          scanError={scanError}
          scanPending={scanPending}
          selectedTarget={selectedTarget}
          targets={targets}
        />
      ) : null}
    </div>
  );
}

function ImageEditorConfigurationPresetsListView(props: {
  isGuest: boolean;
  onDone: () => void;
  workspaceRows: BeaconImagePresetRow[];
  designerRows: BeaconImagePresetRow[];
  openAdd: () => void;
  openEdit: (p: BeaconImagePresetRow) => void;
  presetPendingDelete: BeaconImagePresetRow | null;
  onPresetDeleteDialogOpenChange: (open: boolean) => void;
  onConfirmDeletePendingPreset: () => void;
  onRequestDelete: (p: BeaconImagePresetRow) => void;
}) {
  const {
    isGuest,
    onDone,
    workspaceRows,
    designerRows,
    openAdd,
    openEdit,
    presetPendingDelete,
    onPresetDeleteDialogOpenChange,
    onConfirmDeletePendingPreset,
    onRequestDelete,
  } = props;
  return (
    <>
      <Card size="sm" className="border-border/80">
        <CardHeader className="space-y-1 pb-2">
          <CardTitle className="text-sm font-medium">Export presets</CardTitle>
          <CardDescription className="text-xs leading-relaxed">
            Name a size, tag a surface—Beacon matches that export when the user adds an image.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 pt-0">
          {isGuest ? (
            <p className="text-muted-foreground text-xs leading-relaxed">
              Sign in to Tower to create and edit workspace presets.
            </p>
          ) : null}

          {workspaceRows.length === 0 && !isGuest ? (
            <p className="text-muted-foreground text-xs">No workspace presets yet.</p>
          ) : null}

          <ul className="grid gap-2">
            {workspaceRows.map((p) => (
              <li
                key={p.id}
                className="flex min-w-0 items-center gap-2 rounded-sm border border-border/80 bg-muted/20 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug">{p.name}</p>
                  <p className="text-muted-foreground text-[10px] tabular-nums">
                    {p.width}×{p.height}px
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    disabled={isGuest}
                    onClick={() => openEdit(p)}
                  >
                    <Pencil className="size-3.5" aria-hidden />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    disabled={isGuest}
                    onClick={() => onRequestDelete(p)}
                    aria-label={`Delete preset “${p.name}”`}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ul>

          {designerRows.length > 0 ? (
            <div className="space-y-2">
              <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">Designers only</p>
              <ul className="grid gap-2">
                {designerRows.map((p) => (
                  <li
                    key={p.id}
                    className="text-muted-foreground flex min-w-0 items-center justify-between gap-2 rounded-sm border border-border/60 px-3 py-2 text-xs"
                  >
                    <span className="min-w-0 font-medium text-foreground">{p.name}</span>
                    <span className="tabular-nums">
                      {p.width}×{p.height}px
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-muted-foreground text-[10px] leading-snug">
                Managed in Settings; used when export size matches.
              </p>
            </div>
          ) : null}

          <Button
            type="button"
            className="inline-flex w-full items-center justify-center gap-2"
            variant="secondary"
            disabled={isGuest}
            onClick={openAdd}
          >
            <Plus className="size-3.5" aria-hidden />
            Add preset
          </Button>
        </CardContent>
      </Card>
      <Button type="button" className="w-full" variant="secondary" onClick={onDone}>
        Done
      </Button>
      <AlertDialog open={presetPendingDelete != null} onOpenChange={onPresetDeleteDialogOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this preset?</AlertDialogTitle>
            <AlertDialogDescription>
              {presetPendingDelete ? (
                <>
                  <span className="font-medium text-foreground">“{presetPendingDelete.name}”</span> will be removed from
                  your workspace export presets. This cannot be undone.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <AlertDialogAction type="button" variant="destructive" onClick={onConfirmDeletePendingPreset}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ImageEditorConfigurationPresetsFormView(props: {
  baseId: string;
  editingId: string | null;
  presetV2Enabled: boolean;
  presetScope: PresetCrudScope;
  setPresetScope: (v: PresetCrudScope) => void;
  scopeOptions: ScopeOption[];
  shouldWriteTag: boolean;
  setShouldWriteTag: (v: boolean) => void;
  formSubStep: FormSubStep;
  formError: string | null;
  savePending: boolean;
  nameDraft: string;
  setNameDraft: (v: string) => void;
  wStr: string;
  setWStr: (v: string) => void;
  hStr: string;
  setHStr: (v: string) => void;
  formTarget: ImagePageTarget | null;
  formScanPending: boolean;
  formScanError: string | null;
  formPageScanned: boolean;
  formRescan: () => void;
  formTargetSelect: (t: ImagePageTarget) => void;
  onFormUseCanvasSelection: () => void;
  onFormChooseAnotherOnPage: () => void;
  formSelectionHint: SelectedImageTargetHint;
  formShowPageTargetList: boolean;
  formShowSelectionChoice: boolean;
  formTargets: ImagePageTarget[];
  formDiscoverySettled: boolean;
  canContinueFromStep1: boolean;
  onContinueToDimensions: () => void;
  onContinueToSaveStep: () => void;
  onFormBack: () => void;
  onSave: () => void;
  step3ExportSize: { width: number; height: number } | null;
}) {
  const {
    baseId,
    editingId,
    presetV2Enabled,
    presetScope,
    setPresetScope,
    scopeOptions,
    shouldWriteTag,
    setShouldWriteTag,
    formSubStep,
    formError,
    savePending,
    nameDraft,
    setNameDraft,
    wStr,
    setWStr,
    hStr,
    setHStr,
    formTarget,
    formScanPending,
    formScanError,
    formPageScanned,
    formRescan,
    formTargetSelect,
    onFormUseCanvasSelection,
    onFormChooseAnotherOnPage,
    formSelectionHint,
    formShowPageTargetList,
    formShowSelectionChoice,
    formTargets,
    formDiscoverySettled,
    canContinueFromStep1,
    onContinueToDimensions,
    onContinueToSaveStep,
    onFormBack,
    onSave,
    step3ExportSize,
  } = props;
  return (
    <Card size="sm" className="border-border/80">
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="text-sm font-medium">{editingId ? "Edit preset" : "Add preset"}</CardTitle>
        <CardDescription className="text-xs">
          Step {formSubStep} of 3: {formatPresetFormStepDescription(formSubStep)}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-0">
        <Button type="button" variant="ghost" size="sm" className="h-8 self-start px-2" onClick={onFormBack}>
          ← Back
        </Button>

        {formError ? <p className="text-destructive text-xs">{formError}</p> : null}

        {formSubStep === 1 ? (
          <>
            {presetV2Enabled ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Preset scope</Label>
                <RadioGroup
                  value={presetScope}
                  onValueChange={(v) => {
                    if (v === "site-default" || v === "element" || v === "component" || v === "instance") {
                      setPresetScope(v);
                    }
                  }}
                  className="grid gap-2"
                >
                  {scopeOptions.map((opt) => (
                    <div
                      key={opt.scope}
                      className={cn(
                        "rounded-sm border border-border/80 px-3 py-2",
                        !opt.enabled && "cursor-not-allowed opacity-60"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value={opt.scope} disabled={!opt.enabled || Boolean(editingId)} />
                        <div>
                          <p className="text-sm leading-tight">{opt.label}</p>
                          {!opt.enabled && opt.reason ? (
                            <p className="text-muted-foreground text-[10px] leading-snug">{opt.reason}</p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            ) : null}
            <TargetPickSection
              discoverySettled={formDiscoverySettled}
              onChooseAnotherOnPage={onFormChooseAnotherOnPage}
              onRescan={formRescan}
              onSelectTarget={formTargetSelect}
              onUseCanvasSelection={onFormUseCanvasSelection}
              pageScanned={formPageScanned}
              scanError={formScanError}
              scanPending={formScanPending}
              selectedTarget={formTarget}
              selectionHint={formSelectionHint}
              showPageTargetList={formShowPageTargetList}
              showSelectionChoice={formShowSelectionChoice}
              targets={formTargets}
            />
            <Button type="button" className="w-full" disabled={!canContinueFromStep1} onClick={onContinueToDimensions}>
              Next: size
            </Button>
          </>
        ) : null}

        {formSubStep === 2 ? (
          <>
            <div className="space-y-1.5">
              <Label htmlFor={`${baseId}-preset-name`} className="text-xs">
                Name
              </Label>
              <Input
                id={`${baseId}-preset-name`}
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                placeholder="e.g. Hero"
                className="min-w-0"
                disabled={savePending}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor={`${baseId}-preset-w`} className="text-xs">
                  Width (px)
                </Label>
                <Input
                  id={`${baseId}-preset-w`}
                  inputMode="numeric"
                  value={wStr}
                  onChange={(e) => setWStr(e.target.value)}
                  className="min-w-0 tabular-nums"
                  disabled={savePending}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${baseId}-preset-h`} className="text-xs">
                  Height (px)
                </Label>
                <Input
                  id={`${baseId}-preset-h`}
                  inputMode="numeric"
                  value={hStr}
                  onChange={(e) => setHStr(e.target.value)}
                  className="min-w-0 tabular-nums"
                  disabled={savePending}
                />
              </div>
            </div>
            <Button type="button" className="w-full" disabled={savePending} onClick={onContinueToSaveStep}>
              Continue
            </Button>
          </>
        ) : null}

        {formSubStep === 3 ? (
          <>
            <div className="space-y-3 rounded-sm border border-border/80 bg-muted/20 p-3 text-sm">
              {presetV2Enabled ? (
                <div className="space-y-0.5">
                  <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">Scope</p>
                  <p className="leading-snug">{labelForScope(presetScope)}</p>
                </div>
              ) : null}
              <div className="space-y-0.5">
                <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">Surface</p>
                <p className="min-w-0 wrap-break-word leading-snug">
                  {formatPageTargetLine(formTarget, Boolean(editingId))}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">Preset</p>
                <p className="min-w-0 wrap-break-word font-medium leading-snug">{nameDraft.trim()}</p>
                <p className="text-muted-foreground text-xs tabular-nums">
                  {step3ExportSize ? `${step3ExportSize.width}×${step3ExportSize.height}px` : "—"}
                </p>
              </div>
            </div>
            <label className="flex items-center gap-2 rounded-sm border border-border/80 px-3 py-2 text-xs">
              <input
                type="checkbox"
                checked={shouldWriteTag}
                onChange={(e) => setShouldWriteTag(e.target.checked)}
                className="accent-primary"
              />
              <span>Also write `data-beacon-export-width/height` tags to the selected surface</span>
            </label>
            <Button
              type="button"
              className="inline-flex w-full items-center justify-center gap-2"
              disabled={savePending}
              onClick={onSave}
            >
              {savePending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
              {savePending ? "Saving…" : "Save preset"}
            </Button>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function ImageEditorConfigurationPresetsStep(props: ImageEditorConfigurationPresetsStepProps) {
  const { isGuest, onDone, className } = props;
  const baseId = useId();
  const { settings, updateSettings, canManageTeamBeaconSettings } = useBeaconAppSettings();
  const presetV2Enabled = useMemo(() => readBeaconPresetV2ReadEnabled(), []);
  const [view, setView] = useState<View>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [wStr, setWStr] = useState("1200");
  const [hStr, setHStr] = useState("1200");
  const [presetScope, setPresetScope] = useState<PresetCrudScope>("instance");
  const [shouldWriteTag, setShouldWriteTag] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [savePending, setSavePending] = useState(false);
  const [formTarget, setFormTarget] = useState<ImagePageTarget | null>(null);
  const [formSubStep, setFormSubStep] = useState<FormSubStep>(1);
  const [presetPendingDelete, setPresetPendingDelete] = useState<BeaconImagePresetRow | null>(null);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [pageId, setPageId] = useState<string | null>(null);

  const isForm = view === "form";
  const {
    targets: formTargets,
    scanPending: formScanPending,
    scanError: formScanError,
    pageScanned: formPageScanned,
    rescan: formRescan,
    selectionHint: formSelectionHint,
    discoverySettled: formDiscoverySettled,
    dismissedCanvasSelectionPrompt: formDismissedSelection,
    setDismissedCanvasSelectionPrompt: setFormDismissedSelection,
  } = usePresetFormTargets(isForm);

  const presetRowsV2ById = useMemo(() => {
    const rows = new Map<string, PresetV2Meta>();
    const siteDefault = settings.imagePresetStorageV2.siteDefault;
    if (siteDefault != null) {
      rows.set(siteDefault.id, {
        row: siteDefault,
        scope: inferScopeFromTargetKey(siteDefault),
        storageKey: null,
      });
    }
    for (const [storageKey, row] of Object.entries(settings.imagePresetStorageV2.byTargetKey)) {
      rows.set(row.id, {
        row,
        scope: inferScopeFromTargetKey(row),
        storageKey,
      });
    }
    return rows;
  }, [settings.imagePresetStorageV2]);

  useEffect(() => {
    if (!presetV2Enabled) {
      setSiteId(null);
      setPageId(null);
      return;
    }
    let cancelled = false;
    void webflow
      .getSiteInfo()
      .then((site) => {
        if (!cancelled) {
          setSiteId(site.siteId);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSiteId(null);
        }
      });
    void webflow
      .getCurrentPage()
      .then((page) => {
        if (!cancelled) {
          setPageId(page.id);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPageId(null);
        }
      });
    const unsub = webflow.subscribe("currentpage", (page) => {
      setPageId(page.id);
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [presetV2Enabled]);

  useEffect(() => {
    if (!isForm) {
      setFormTarget(null);
    }
  }, [isForm]);

  useEffect(() => {
    if (view !== "list") {
      setPresetPendingDelete(null);
    }
  }, [view]);

  useEffect(() => {
    if (editingId == null) {
      return;
    }
    const exists = presetV2Enabled
      ? presetRowsV2ById.has(editingId)
      : settings.imagePresets.some((p) => p.id === editingId);
    if (!exists) {
      setEditingId(null);
      setView("list");
      setFormError(null);
      setFormSubStep(1);
    }
  }, [editingId, presetV2Enabled, presetRowsV2ById, settings.imagePresets]);

  useEffect(() => {
    if (presetPendingDelete == null) {
      return;
    }
    const exists = presetV2Enabled
      ? presetRowsV2ById.has(presetPendingDelete.id)
      : settings.imagePresets.some((p) => p.id === presetPendingDelete.id);
    if (!exists) {
      setPresetPendingDelete(null);
    }
  }, [presetPendingDelete, presetRowsV2ById, presetV2Enabled, settings.imagePresets]);

  const formShowSelectionChoice =
    isForm &&
    formDiscoverySettled &&
    !formDismissedSelection &&
    (formSelectionHint.kind === "image" || formSelectionHint.kind === "component");

  const formShowPageTargetList = isForm && formDiscoverySettled && !formShowSelectionChoice;

  const openAdd = () => {
    setEditingId(null);
    setNameDraft("");
    setWStr("1200");
    setHStr("1200");
    setPresetScope("instance");
    setShouldWriteTag(false);
    setFormError(null);
    setFormSubStep(1);
    setView("form");
  };

  const openEdit = (p: BeaconImagePresetRow) => {
    const v2Meta = presetRowsV2ById.get(p.id) ?? null;
    setEditingId(p.id);
    setNameDraft(p.name);
    setWStr(String(p.width));
    setHStr(String(p.height));
    setPresetScope(v2Meta?.scope ?? "instance");
    setShouldWriteTag(false);
    setFormError(null);
    setFormSubStep(1);
    setView("form");
  };

  const onDeletePreset = useCallback(
    (id: string) => {
      if (presetV2Enabled) {
        updateSettings((prev) => {
          const nextByTargetKey = Object.fromEntries(
            Object.entries(prev.imagePresetStorageV2.byTargetKey).filter(([, row]) => row.id !== id)
          );
          return {
            imagePresetStorageV2: {
              siteDefault:
                prev.imagePresetStorageV2.siteDefault?.id === id ? null : prev.imagePresetStorageV2.siteDefault,
              byTargetKey: nextByTargetKey,
            },
          };
        });
      } else {
        updateSettings((prev) => ({ imagePresets: prev.imagePresets.filter((p) => p.id !== id) }));
      }
      void webflow.notify({ type: "Success", message: "Preset removed." });
    },
    [presetV2Enabled, updateSettings]
  );

  const backToList = useCallback(() => {
    setView("list");
    setEditingId(null);
    setFormError(null);
    setFormTarget(null);
    setShouldWriteTag(false);
    setFormSubStep(1);
  }, []);

  const applyFormTarget = useCallback(async (t: ImagePageTarget) => {
    setFormTarget(t);
    try {
      await webflow.setSelectedElement(t.element);
    } catch {
      /* selection may fail in edge cases */
    }
  }, []);

  const onFormUseCanvasSelection = useCallback(() => {
    const t = targetFromFormSelectionHint(formSelectionHint);
    if (!t) {
      return;
    }
    void applyFormTarget(t);
    setFormSubStep(2);
  }, [formSelectionHint, applyFormTarget]);

  const onFormChooseAnotherOnPage = useCallback(() => {
    setFormDismissedSelection(true);
    setFormTarget(null);
  }, [setFormDismissedSelection]);

  const isNewPreset = editingId == null;
  const canContinueFromStep1 =
    formDiscoverySettled && (Boolean(editingId) || presetScope === "site-default" || formTarget !== null);

  const onContinueToDimensions = useCallback(() => {
    tryAdvanceFromPresetFormStep1(isNewPreset, formTarget, presetScope, setFormError, () => setFormSubStep(2));
  }, [isNewPreset, formTarget, presetScope]);

  const onContinueToSaveStep = useCallback(() => {
    tryAdvanceFromPresetFormStep2(nameDraft, wStr, hStr, setFormError, () => setFormSubStep(3));
  }, [nameDraft, wStr, hStr]);

  const onFormBack = useCallback(() => {
    tryHandlePresetFormBack(formSubStep, setFormError, backToList, () => setFormSubStep((s) => (s - 1) as FormSubStep));
  }, [formSubStep, backToList]);

  const onSave = useCallback(() => {
    const editingV2Meta = editingId ? (presetRowsV2ById.get(editingId) ?? null) : null;
    void commitImagePresetForm({
      setFormError,
      setSavePending,
      nameDraft,
      wStr,
      hStr,
      presetV2Enabled,
      presetScope,
      shouldWriteTag,
      siteId,
      pageId,
      settings,
      editingV2Meta,
      formTarget,
      formTargets,
      editingId,
      defaultExportFormat: settings.defaultExportFormat,
      updateSettings,
      backToList,
    });
  }, [
    nameDraft,
    wStr,
    hStr,
    editingId,
    presetV2Enabled,
    presetScope,
    shouldWriteTag,
    siteId,
    pageId,
    settings,
    formTarget,
    formTargets,
    presetRowsV2ById,
    updateSettings,
    settings.defaultExportFormat,
    backToList,
  ]);

  const scopeOptions = useMemo(
    () =>
      buildScopeOptions({
        presetV2Enabled,
        canManageTeamBeaconSettings,
        siteId,
        targetKind: formTarget?.kind ?? null,
      }),
    [canManageTeamBeaconSettings, formTarget?.kind, presetV2Enabled, siteId]
  );

  useEffect(() => {
    if (!presetV2Enabled || editingId != null) {
      return;
    }
    const selected = scopeOptions.find((opt) => opt.scope === presetScope);
    if (selected?.enabled) {
      return;
    }
    const fallback = scopeOptions.find((opt) => opt.enabled);
    if (fallback) {
      setPresetScope(fallback.scope);
    }
  }, [editingId, presetScope, presetV2Enabled, scopeOptions]);

  const workspaceRows = useMemo<BeaconImagePresetRow[]>(() => {
    if (!presetV2Enabled) {
      return settings.imagePresets;
    }
    return Array.from(presetRowsV2ById.values()).map(({ row, scope }) => ({
      id: row.id,
      name: `${row.name} (${labelForScope(scope)})`,
      width: row.width,
      height: row.height,
      exportFormat: row.exportFormat,
      maxFileSizeBytes: row.maxFileSizeBytes,
    }));
  }, [presetRowsV2ById, presetV2Enabled, settings.imagePresets]);
  const designerRows = presetV2Enabled ? [] : settings.designerOnlyImagePresets;

  const step3ExportSize =
    formSubStep === 3
      ? clampExportDimensionsToMaxEdge(parseOutputDimension(wStr, 1200), parseOutputDimension(hStr, 1200))
      : null;

  return (
    <div className={cn("flex min-w-0 flex-col gap-4", className)}>
      {view === "list" ? (
        <ImageEditorConfigurationPresetsListView
          designerRows={designerRows}
          isGuest={isGuest}
          onConfirmDeletePendingPreset={() => {
            if (presetPendingDelete) {
              onDeletePreset(presetPendingDelete.id);
            }
            setPresetPendingDelete(null);
          }}
          onDone={onDone}
          onPresetDeleteDialogOpenChange={(open) => {
            if (!open) {
              setPresetPendingDelete(null);
            }
          }}
          onRequestDelete={setPresetPendingDelete}
          openAdd={openAdd}
          openEdit={openEdit}
          presetPendingDelete={presetPendingDelete}
          workspaceRows={workspaceRows}
        />
      ) : (
        <ImageEditorConfigurationPresetsFormView
          baseId={baseId}
          canContinueFromStep1={canContinueFromStep1}
          editingId={editingId}
          presetV2Enabled={presetV2Enabled}
          presetScope={presetScope}
          setPresetScope={setPresetScope}
          scopeOptions={scopeOptions}
          shouldWriteTag={shouldWriteTag}
          setShouldWriteTag={setShouldWriteTag}
          formDiscoverySettled={formDiscoverySettled}
          formError={formError}
          formPageScanned={formPageScanned}
          formRescan={formRescan}
          formScanError={formScanError}
          formScanPending={formScanPending}
          formSelectionHint={formSelectionHint}
          formShowPageTargetList={formShowPageTargetList}
          formShowSelectionChoice={formShowSelectionChoice}
          formSubStep={formSubStep}
          formTarget={formTarget}
          formTargetSelect={(t) => {
            void applyFormTarget(t);
          }}
          formTargets={formTargets}
          hStr={hStr}
          nameDraft={nameDraft}
          onContinueToDimensions={onContinueToDimensions}
          onContinueToSaveStep={onContinueToSaveStep}
          onFormBack={onFormBack}
          onFormChooseAnotherOnPage={onFormChooseAnotherOnPage}
          onFormUseCanvasSelection={onFormUseCanvasSelection}
          onSave={onSave}
          savePending={savePending}
          setHStr={setHStr}
          setNameDraft={setNameDraft}
          setWStr={setWStr}
          step3ExportSize={step3ExportSize}
          wStr={wStr}
        />
      )}
    </div>
  );
}
