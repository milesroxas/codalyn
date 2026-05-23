import {
  BEACON_PRESET_DEFAULT_MAX_FILE_BYTES,
  formatBeaconPresetDisplayName,
  type ImageExportFormat,
  listBeaconPresetStorageEntries,
  type MaxSizeUnit,
  maxBytesToDraft,
  type PresetCrudScope,
} from "@codalyn/webflow-kit";
import { type ReactNode, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  resolveDisplayedSurfaceTarget,
  targetFromSelectionHint,
} from "@/features/image-editor/lib/image-editor-display-surface-target";
import {
  commitImagePresetForm,
  type PresetFormSubStep,
  tryHandlePresetFormBack,
} from "@/features/image-editor/lib/image-editor-preset-form-commit";
import {
  listAddablePresetScopesForFormTarget,
  listExistingPresetsForFormTarget,
  type PresetFormExistingMatch,
  presetFormExistingMatchToListRow,
} from "@/features/image-editor/lib/image-editor-preset-form-existing";
import { buildPresetScopeOptions } from "@/features/image-editor/lib/image-editor-preset-scope-options";
import type { ImagePageTarget } from "@/features/image-editor/lib/scan-image-targets-on-page";
import { usePresetFormTargets } from "@/features/image-editor/model/use-image-editor-auto-targets";
import { useResolvedImagePageTarget } from "@/features/image-editor/model/use-resolved-image-page-target";
import { ImageEditorConfigurationPresetsFormView } from "@/features/image-editor/ui/image-editor-preset-form-view";
import {
  buildPresetConfigurationFooter,
  ImageEditorConfigurationPresetsListView,
  type PresetListRow,
} from "@/features/image-editor/ui/image-editor-preset-list-view";
import { useBeaconAppSettings } from "@/features/settings/model/beacon-app-settings-provider";
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
import { StepNav } from "@/shared/ui/step-nav";

type View = "list" | "form";

const PRESET_FORM_STEP_NAV = [
  { id: "1", label: "Image" },
  { id: "2", label: "Preset" },
] as const;

type ImageEditorConfigurationPresetsStepProps = {
  isGuest: boolean;
  /** Return to the designer start screen (from the preset list). */
  onDone: () => void;
  onFooterChange?: (footer: ReactNode | null) => void;
  onSubheaderChange?: (subheader: ReactNode | null) => void;
  onScrollResetKeyChange?: (key: string | null) => void;
  className?: string;
};

export function ImageEditorConfigurationPresetsStep(props: ImageEditorConfigurationPresetsStepProps) {
  const { isGuest, onDone, onFooterChange, onSubheaderChange, onScrollResetKeyChange, className } = props;
  const baseId = useId();
  const { settings, updateSettings, canManageTeamBeaconSettings } = useBeaconAppSettings();
  const [view, setView] = useState<View>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [wStr, setWStr] = useState("1200");
  const [hStr, setHStr] = useState("1200");
  const [formatEnabled, setFormatEnabled] = useState(true);
  const [formatDraft, setFormatDraft] = useState<ImageExportFormat>(settings.defaultExportFormat);
  const [maxSizeStr, setMaxSizeStr] = useState(() => maxBytesToDraft(BEACON_PRESET_DEFAULT_MAX_FILE_BYTES).value);
  const [maxSizeUnit, setMaxSizeUnit] = useState<MaxSizeUnit>(
    () => maxBytesToDraft(BEACON_PRESET_DEFAULT_MAX_FILE_BYTES).unit
  );
  const [presetScope, setPresetScope] = useState<PresetCrudScope>("instance");
  const [formError, setFormError] = useState<string | null>(null);
  const [savePending, setSavePending] = useState(false);
  const saveInFlightRef = useRef(false);
  const [formTarget, setFormTarget] = useState<ImagePageTarget | null>(null);
  const [formSubStep, setFormSubStep] = useState<PresetFormSubStep>(1);
  const [presetPendingDelete, setPresetPendingDelete] = useState<PresetListRow | null>(null);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [pageId, setPageId] = useState<string | null>(null);

  const isForm = view === "form";
  const isEditing = editingId != null;
  const {
    targets: formTargets,
    scanPending: formScanPending,
    scanError: formScanError,
    pageScanned: formPageScanned,
    rescan: formRescan,
    selectionHint: formSelectionHint,
    discoverySettled: formDiscoverySettled,
  } = usePresetFormTargets(isForm);

  const presetEntriesById = useMemo(() => {
    const entries = listBeaconPresetStorageEntries(settings.imagePresetStorage);
    return new Map(entries.map((entry) => [entry.row.id, entry]));
  }, [settings.imagePresetStorage]);

  useEffect(() => {
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
  }, []);

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
    const exists = presetEntriesById.has(editingId);
    if (!exists) {
      setEditingId(null);
      setView("list");
      setFormError(null);
      setFormSubStep(1);
    }
  }, [editingId, presetEntriesById]);

  useEffect(() => {
    if (presetPendingDelete == null) {
      return;
    }
    const exists = presetEntriesById.has(presetPendingDelete.id);
    if (!exists) {
      setPresetPendingDelete(null);
    }
  }, [presetPendingDelete, presetEntriesById]);

  const openAdd = useCallback(() => {
    setEditingId(null);
    setNameDraft("");
    setWStr("1200");
    setHStr("1200");
    setFormatEnabled(true);
    setFormatDraft(settings.defaultExportFormat);
    const maxDraft = maxBytesToDraft(BEACON_PRESET_DEFAULT_MAX_FILE_BYTES);
    setMaxSizeStr(maxDraft.value);
    setMaxSizeUnit(maxDraft.unit);
    setPresetScope("instance");
    setFormError(null);
    setFormSubStep(1);
    setView("form");
  }, [settings.defaultExportFormat]);

  const openEdit = useCallback(
    (p: PresetListRow, options?: { pageTarget?: ImagePageTarget | null }) => {
      setEditingId(p.id);
      setNameDraft(p.name);
      setWStr(String(p.width));
      setHStr(String(p.height));
      setFormatEnabled(p.exportFormat !== undefined);
      setFormatDraft(p.exportFormat ?? settings.defaultExportFormat);
      const maxDraft = maxBytesToDraft(p.maxFileSizeBytes);
      setMaxSizeStr(maxDraft.value);
      setMaxSizeUnit(maxDraft.unit);
      setPresetScope(p.scope);
      setFormError(null);
      setFormTarget(options?.pageTarget ?? null);
      setView("form");
    },
    [settings.defaultExportFormat]
  );

  const onDeletePreset = useCallback(
    async (id: string) => {
      const result = await updateSettings((prev) => {
        const nextByTargetKey = Object.fromEntries(
          Object.entries(prev.imagePresetStorage.byTargetKey).filter(([, row]) => row.id !== id)
        );
        return {
          imagePresetStorage: {
            siteDefault: prev.imagePresetStorage.siteDefault?.id === id ? null : prev.imagePresetStorage.siteDefault,
            byTargetKey: nextByTargetKey,
          },
        };
      });
      if (result.ok) {
        void webflow.notify({ type: "Success", message: "Preset removed." });
      } else {
        void webflow.notify({ type: "Error", message: result.error });
      }
    },
    [updateSettings]
  );

  const backToList = useCallback(() => {
    setView("list");
    setEditingId(null);
    setFormError(null);
    setFormTarget(null);
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

  const displaySurfaceTarget = useMemo(
    () => resolveDisplayedSurfaceTarget(formSelectionHint, formTarget),
    [formSelectionHint, formTarget]
  );

  const presetFormSurfaceTarget = useMemo(() => {
    if (presetScope === "site-default") {
      return null;
    }
    return formTarget ?? displaySurfaceTarget;
  }, [displaySurfaceTarget, formTarget, presetScope]);

  const resolvedDisplaySurfaceTarget = useResolvedImagePageTarget({
    enabled: isForm && !isEditing,
    siteId,
    pageId,
    pageTarget: displaySurfaceTarget,
    resolveTaggedDimensions: false,
  });

  const onFormBack = useCallback(() => {
    tryHandlePresetFormBack(formSubStep, setFormError, backToList, () =>
      setFormSubStep((s) => (s - 1) as PresetFormSubStep)
    );
  }, [formSubStep, backToList]);

  const onPresetFormStepSelect = useCallback((stepId: string) => {
    if (stepId !== "1" && stepId !== "2") {
      return;
    }
    setFormError(null);
    setFormSubStep(Number(stepId) as PresetFormSubStep);
  }, []);

  const onSave = useCallback(() => {
    const editingEntry = editingId ? (presetEntriesById.get(editingId) ?? null) : null;
    void commitImagePresetForm({
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
    });
  }, [
    nameDraft,
    wStr,
    hStr,
    formatEnabled,
    formatDraft,
    maxSizeStr,
    maxSizeUnit,
    editingId,
    presetScope,
    siteId,
    pageId,
    formTarget,
    formTargets,
    presetEntriesById,
    updateSettings,
    backToList,
  ]);

  const displayScopeOptions = useMemo(
    () =>
      buildPresetScopeOptions({
        canManageTeamBeaconSettings,
        siteId,
        targetKind: displaySurfaceTarget?.kind ?? null,
      }),
    [canManageTeamBeaconSettings, displaySurfaceTarget?.kind, siteId]
  );

  const existingPresetsForDisplaySurface = useMemo(
    () =>
      listExistingPresetsForFormTarget({
        settings,
        siteId,
        resolvedTarget: resolvedDisplaySurfaceTarget,
        scopeOptions: displayScopeOptions,
      }),
    [displayScopeOptions, resolvedDisplaySurfaceTarget, settings, siteId]
  );

  const addablePresetScopesForDisplay = useMemo(
    () =>
      listAddablePresetScopesForFormTarget({
        scopeOptions: displayScopeOptions,
        existingPresets: existingPresetsForDisplaySurface,
      }),
    [displayScopeOptions, existingPresetsForDisplaySurface]
  );

  const onEditPresetFromMatch = useCallback(
    (match: PresetFormExistingMatch) => {
      openEdit(presetFormExistingMatchToListRow(match), { pageTarget: displaySurfaceTarget });
    },
    [displaySurfaceTarget, openEdit]
  );

  const onAddPresetScope = useCallback(
    (scope: PresetCrudScope) => {
      setPresetScope(scope);
      if (scope !== "site-default") {
        const nextTarget = formTarget ?? targetFromSelectionHint(formSelectionHint);
        if (nextTarget != null) {
          setFormTarget(nextTarget);
        }
      }
      setFormError(null);
      setFormSubStep(2);
    },
    [formSelectionHint, formTarget]
  );

  useEffect(() => {
    if (editingId != null) {
      return;
    }
    const selected = displayScopeOptions.find((opt) => opt.scope === presetScope);
    if (selected?.enabled) {
      return;
    }
    const fallback = displayScopeOptions.find((opt) => opt.enabled);
    if (fallback) {
      setPresetScope(fallback.scope);
    }
  }, [displayScopeOptions, editingId, presetScope]);

  const presetRows = useMemo<PresetListRow[]>(() => {
    return listBeaconPresetStorageEntries(settings.imagePresetStorage).map(({ row, scope }) => ({
      id: row.id,
      name: row.name,
      displayName: formatBeaconPresetDisplayName(row, scope),
      scope,
      width: row.width,
      height: row.height,
      exportFormat: row.exportFormat,
      maxFileSizeBytes: row.maxFileSizeBytes,
    }));
  }, [settings.imagePresetStorage]);

  const onConfirmDeletePendingPreset = useCallback(() => {
    if (presetPendingDelete) {
      void onDeletePreset(presetPendingDelete.id);
    }
    setPresetPendingDelete(null);
    if (isEditing) {
      backToList();
    }
  }, [presetPendingDelete, onDeletePreset, isEditing, backToList]);

  const footer = useMemo<ReactNode | null>(
    () =>
      buildPresetConfigurationFooter({
        view,
        isEditing,
        formSubStep,
        savePending,
        onDone,
        onFormBack,
        onSave,
      }),
    [formSubStep, isEditing, onDone, onFormBack, onSave, savePending, view]
  );

  useEffect(() => {
    onFooterChange?.(footer);
    return () => {
      onFooterChange?.(null);
    };
  }, [footer, onFooterChange]);

  const subheader = useMemo<ReactNode | null>(
    () =>
      view === "form" && !isEditing ? (
        <StepNav
          aria-label="Configure preset steps"
          current={String(formSubStep)}
          onStepSelect={onPresetFormStepSelect}
          steps={PRESET_FORM_STEP_NAV.map((step) => ({ id: step.id, label: step.label }))}
        />
      ) : null,
    [formSubStep, isEditing, onPresetFormStepSelect, view]
  );

  useEffect(() => {
    onSubheaderChange?.(subheader);
    return () => {
      onSubheaderChange?.(null);
    };
  }, [onSubheaderChange, subheader]);

  const scrollResetKey = useMemo(() => {
    if (view === "list") {
      return "list";
    }
    if (isEditing) {
      return "form:edit";
    }
    return `form:${formSubStep}`;
  }, [formSubStep, isEditing, view]);

  useEffect(() => {
    onScrollResetKeyChange?.(scrollResetKey);
    return () => {
      onScrollResetKeyChange?.(null);
    };
  }, [onScrollResetKeyChange, scrollResetKey]);

  return (
    <div className={cn("flex min-w-0 flex-col gap-4", className)}>
      {view === "list" ? (
        <ImageEditorConfigurationPresetsListView
          isGuest={isGuest}
          onOpenAdd={openAdd}
          onRequestDelete={setPresetPendingDelete}
          openEdit={openEdit}
          presetRows={presetRows}
        />
      ) : (
        <ImageEditorConfigurationPresetsFormView
          baseId={baseId}
          editingId={editingId}
          formDiscoverySettled={formDiscoverySettled}
          formError={formError}
          formPageScanned={formPageScanned}
          formRescan={formRescan}
          formScanError={formScanError}
          formScanPending={formScanPending}
          formSubStep={formSubStep}
          formTarget={formTarget}
          formTargetSelect={(t) => {
            void applyFormTarget(t);
          }}
          formTargets={formTargets}
          hStr={hStr}
          formatEnabled={formatEnabled}
          setFormatEnabled={setFormatEnabled}
          formatDraft={formatDraft}
          setFormatDraft={setFormatDraft}
          maxSizeStr={maxSizeStr}
          setMaxSizeStr={setMaxSizeStr}
          maxSizeUnit={maxSizeUnit}
          setMaxSizeUnit={setMaxSizeUnit}
          nameDraft={nameDraft}
          onAddPresetScope={onAddPresetScope}
          onEditPreset={onEditPresetFromMatch}
          addableScopes={addablePresetScopesForDisplay}
          existingPresets={existingPresetsForDisplaySurface}
          presetFormSurfaceTarget={presetFormSurfaceTarget}
          presetScope={presetScope}
          surfaceTarget={displaySurfaceTarget}
          onRequestDelete={
            editingId != null
              ? () => {
                  const row = presetRows.find((p) => p.id === editingId);
                  if (row) {
                    setPresetPendingDelete(row);
                  }
                }
              : undefined
          }
          savePending={savePending}
          setHStr={setHStr}
          setNameDraft={setNameDraft}
          setWStr={setWStr}
          wStr={wStr}
        />
      )}
      <AlertDialog
        open={presetPendingDelete != null}
        onOpenChange={(open) => {
          if (!open) {
            setPresetPendingDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this preset?</AlertDialogTitle>
            <AlertDialogDescription>
              {presetPendingDelete ? (
                <>
                  <span className="font-medium text-foreground">“{presetPendingDelete.displayName}”</span> will be
                  removed from your workspace export presets. This cannot be undone.
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
    </div>
  );
}
