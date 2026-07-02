import {
  BEACON_PRESET_DEFAULT_MAX_FILE_BYTES,
  type BeaconPresetStorageEntry,
  formatBeaconPresetDisplayName,
  formatBeaconPresetInstanceLocationLabel,
  type ImageExportFormat,
  listBeaconPresetStorageEntries,
  type MaxSizeUnit,
  maxBytesToDraft,
  type PresetCrudScope,
  removeBeaconPresetRowById,
} from "@codalyn/webflow-kit";
import { type ReactNode, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  resolveDisplayedSurfaceTarget,
  targetFromSelectionHint,
} from "@/features/image-editor/lib/image-editor-display-surface-target";
import { cleanupDesignerTagsForPresetEntry } from "@/features/image-editor/lib/image-editor-preset-delete-cleanup";
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
import {
  checkComponentPresetPlacementNeeded,
  findImagePageTargetForPresetOnCurrentPage,
  getPresetLocateAction,
  type LocatePresetTargetResult,
  locatePresetTarget,
} from "@/features/image-editor/lib/locate-preset-target";
import { removeTemporaryPageComponentInstance } from "@/features/image-editor/lib/page-component-instance-for-preset-work";
import type { ImagePageTarget } from "@/features/image-editor/lib/scan-image-targets-on-page";
import { usePresetFormTargets } from "@/features/image-editor/model/use-image-editor-auto-targets";
import { useResolvedImagePageTarget } from "@/features/image-editor/model/use-resolved-image-page-target";
import {
  type ComponentPlacementConsentRequest,
  type ComponentPlacementSearchState,
  ImageEditorComponentPlacementConsentDialog,
} from "@/features/image-editor/ui/image-editor-component-placement-consent-dialog";
import { ImageEditorConfigurationPresetsFormView } from "@/features/image-editor/ui/image-editor-preset-form-view";
import {
  buildPresetConfigurationFooter,
  ImageEditorConfigurationPresetsListView,
  type PresetListRow,
} from "@/features/image-editor/ui/image-editor-preset-list-view";
import { useBeaconAppSettings } from "@/features/settings/model/beacon-app-settings-provider";
import { IMAGE_UPLOAD_PRESET_LOCATE_SELECTED_TARGET_MESSAGE } from "@/shared/lib/beacon-feature-route-copy";
import { runExclusiveDesignerOp } from "@/shared/lib/exclusive-designer-op";
import { useDesignerCurrentPageId } from "@/shared/lib/use-designer-current-page-id";
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

type View = "list" | "form";

type PlacementConsentState = ComponentPlacementConsentRequest & {
  targetKey: BeaconPresetStorageEntry["row"]["targetKey"];
  notifyOnSuccess: boolean;
  /** Preset row to open in the form once its component is resolved (list-open flow); null = in-form locate. */
  advanceRow: PresetListRow | null;
};

type ImageEditorConfigurationPresetsStepProps = {
  isGuest: boolean;
  /** Return to the designer start screen (from the preset list). */
  onDone: () => void;
  onFooterChange?: (footer: ReactNode | null) => void;
  onScrollResetKeyChange?: (key: string | null) => void;
  className?: string;
};

export function ImageEditorConfigurationPresetsStep(props: ImageEditorConfigurationPresetsStepProps) {
  const { isGuest, onDone, onFooterChange, onScrollResetKeyChange, className } = props;
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
  const [locatePending, setLocatePending] = useState(false);
  const locateInFlightRef = useRef(false);
  /** Designers/admins with no presets skip the list and land in the add form — once per mount, no back-bounce. */
  const autoOpenedAddRef = useRef(false);
  const temporaryPresetInstanceRef = useRef<ComponentElement | null>(null);
  const editTargetResolveGenRef = useRef(0);
  const [formTarget, setFormTarget] = useState<ImagePageTarget | null>(null);
  const [formSubStep, setFormSubStep] = useState<PresetFormSubStep>(1);
  const [presetPendingDelete, setPresetPendingDelete] = useState<PresetListRow | null>(null);
  const [placementConsent, setPlacementConsent] = useState<PlacementConsentState | null>(null);
  const [presetSearch, setPresetSearch] = useState<ComponentPlacementSearchState | null>(null);
  /** Bumped when the user cancels the preset-open flow — in-flight locate results are then discarded. */
  const presetOpenGenRef = useRef(0);
  const [siteId, setSiteId] = useState<string | null>(null);
  const { pageId } = useDesignerCurrentPageId();

  const isForm = view === "form";
  const isEditing = editingId != null;

  const presetEntriesById = useMemo(() => {
    if (siteId == null) {
      return new Map<string, BeaconPresetStorageEntry>();
    }
    const entries = listBeaconPresetStorageEntries(settings.imagePresetStorage, siteId);
    return new Map(entries.map((entry) => [entry.row.id, entry]));
  }, [settings.imagePresetStorage, siteId]);

  const editingEntry = useMemo(
    () => (editingId != null ? (presetEntriesById.get(editingId) ?? null) : null),
    [editingId, presetEntriesById]
  );

  const {
    targets: formTargets,
    scanPending: formScanPending,
    scanProgress: formScanProgress,
    scanError: formScanError,
    pageScanned: formPageScanned,
    rescan: formRescan,
    selectionHint: formSelectionHint,
    discoverySettled: formDiscoverySettled,
  } = usePresetFormTargets(isForm && !locatePending);

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
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isForm) {
      setFormTarget(null);
    }
  }, [isForm]);

  useEffect(() => {
    if (!isForm || editingEntry == null || formTarget != null || pageId == null || locatePending) {
      return;
    }
    const gen = ++editTargetResolveGenRef.current;
    void findImagePageTargetForPresetOnCurrentPage(editingEntry.row.targetKey).then((target) => {
      if (gen !== editTargetResolveGenRef.current || target == null) {
        return;
      }
      setFormTarget(target);
    });
  }, [editingEntry, formTarget, isForm, locatePending, pageId]);

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

  const onDeletePreset = useCallback(
    async (id: string) => {
      const entry = presetEntriesById.get(id) ?? null;
      const remaining = Array.from(presetEntriesById.values()).filter((e) => e.row.id !== id);
      const result = await updateSettings((prev) => ({
        imagePresetStorage: removeBeaconPresetRowById(prev.imagePresetStorage, id),
      }));
      if (!result.ok) {
        void webflow.notify({ type: "Error", message: result.error });
        return;
      }

      if (entry != null) {
        const cleanup = await cleanupDesignerTagsForPresetEntry({
          entry,
          remaining,
          pageIdHint: pageId,
          componentInstance: temporaryPresetInstanceRef.current,
        });
        temporaryPresetInstanceRef.current = null;
        if (!cleanup.ok) {
          void webflow.notify({
            type: "Warning",
            message: `Preset removed, but Designer tags could not be cleared: ${cleanup.error}`,
          });
          return;
        }
        if (cleanup.cleaned) {
          void webflow.notify({ type: "Success", message: "Preset removed and Designer tags cleared." });
          return;
        }
      }

      void webflow.notify({ type: "Success", message: "Preset removed." });
    },
    [pageId, presetEntriesById, updateSettings]
  );

  const cleanupTemporaryPresetInstance = useCallback(async () => {
    const instance = temporaryPresetInstanceRef.current;
    if (instance == null) {
      return;
    }
    temporaryPresetInstanceRef.current = null;
    await runExclusiveDesignerOp(async () => {
      await removeTemporaryPageComponentInstance(instance);
    });
  }, []);

  const designerPageIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const prev = designerPageIdRef.current;
    designerPageIdRef.current = pageId;
    if (prev === undefined || prev === pageId) {
      return;
    }
    editTargetResolveGenRef.current += 1;
    setFormTarget(null);
    void cleanupTemporaryPresetInstance();
  }, [cleanupTemporaryPresetInstance, pageId]);

  const backToList = useCallback(() => {
    void cleanupTemporaryPresetInstance();
    setView("list");
    setEditingId(null);
    setFormError(null);
    setFormTarget(null);
    setFormSubStep(1);
  }, [cleanupTemporaryPresetInstance]);

  const applyFormTarget = useCallback(async (t: ImagePageTarget) => {
    setFormTarget(t);
    try {
      await webflow.setSelectedElement(t.element);
    } catch {
      /* selection may fail in edge cases */
    }
  }, []);

  const populatePresetForm = useCallback(
    (p: PresetListRow) => {
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
    },
    [settings.defaultExportFormat]
  );

  const enterPresetForm = useCallback(
    (p: PresetListRow, pageTarget: ImagePageTarget | null) => {
      populatePresetForm(p);
      setFormTarget(pageTarget);
      setView("form");
    },
    [populatePresetForm]
  );

  /** Consent gate before locate work may place a temporary instance: proceed=false when the dialog is shown, an error occurred, or the flow was cancelled. */
  const resolvePlacementConsent = useCallback(
    async (input: {
      targetKey: NonNullable<typeof editingEntry>["row"]["targetKey"];
      notifyOnSuccess: boolean;
      fromConsentScan: boolean;
      advanceRow: PresetListRow | null;
      gen: number;
    }): Promise<{ proceed: false } | { proceed: true; knownInstance: ComponentElement | null }> => {
      const check = await checkComponentPresetPlacementNeeded({
        siteId,
        targetKey: input.targetKey,
        pageIdHint: pageId,
      });
      if (input.gen !== presetOpenGenRef.current) {
        return { proceed: false };
      }
      if (!check.ok) {
        setFormError(check.error);
        void webflow.notify({ type: "Error", message: check.error });
        return { proceed: false };
      }
      if (check.needsPlacement) {
        setPlacementConsent({
          targetKey: input.targetKey,
          componentName: check.componentName,
          pageId,
          scanFoundNothing: input.fromConsentScan,
          notifyOnSuccess: input.notifyOnSuccess,
          advanceRow: input.advanceRow,
        });
        return { proceed: false };
      }
      return { proceed: true, knownInstance: check.instance };
    },
    [pageId, siteId]
  );

  /** Applies a located target: opens the form first when the locate came from the preset list. */
  const handleLocatedTarget = useCallback(
    async (input: { target: ImagePageTarget; advanceRow: PresetListRow | null; notifyOnSuccess: boolean }) => {
      editTargetResolveGenRef.current += 1;
      if (input.advanceRow != null) {
        enterPresetForm(input.advanceRow, input.target);
      }
      await applyFormTarget(input.target);
      if (input.notifyOnSuccess) {
        void webflow.notify({
          type: "Success",
          message: IMAGE_UPLOAD_PRESET_LOCATE_SELECTED_TARGET_MESSAGE,
        });
      }
    },
    [applyFormTarget, enterPresetForm]
  );

  /** Processes a locate result unless the user cancelled the open flow while it ran. */
  const handleLocateResult = useCallback(
    async (
      result: LocatePresetTargetResult,
      ctx: { gen: number; advanceRow: PresetListRow | null; notifyOnSuccess: boolean }
    ) => {
      if (ctx.gen !== presetOpenGenRef.current) {
        return;
      }
      if (!result.ok) {
        setFormError(result.error);
        void webflow.notify({ type: "Error", message: result.error });
        return;
      }
      await cleanupTemporaryPresetInstance();
      if (result.temporaryInstance != null) {
        temporaryPresetInstanceRef.current = result.temporaryInstance;
      }
      if (result.target != null) {
        await handleLocatedTarget({
          target: result.target,
          advanceRow: ctx.advanceRow,
          notifyOnSuccess: ctx.notifyOnSuccess,
        });
      }
    },
    [cleanupTemporaryPresetInstance, handleLocatedTarget]
  );

  const runPresetLocate = useCallback(
    async (input: {
      targetKey: NonNullable<typeof editingEntry>["row"]["targetKey"];
      notifyOnSuccess?: boolean;
      /** User already confirmed Beacon may place a temporary instance — skip the consent check. */
      placementApproved?: boolean;
      /** Re-check triggered from the consent dialog's scan action — a miss reports "found nothing". */
      fromConsentScan?: boolean;
      /** Preset row to open in the form once the target is located (list-open flow). */
      advanceRow?: PresetListRow | null;
    }) => {
      if (locateInFlightRef.current) {
        return;
      }
      locateInFlightRef.current = true;
      setLocatePending(true);
      setFormError(null);
      const gen = presetOpenGenRef.current;
      const advanceRow = input.advanceRow ?? null;
      try {
        let knownInstance: ComponentElement | null = null;
        if (input.placementApproved !== true) {
          const consent = await resolvePlacementConsent({
            targetKey: input.targetKey,
            notifyOnSuccess: input.notifyOnSuccess === true,
            fromConsentScan: input.fromConsentScan === true,
            advanceRow,
            gen,
          });
          if (!consent.proceed) {
            return;
          }
          knownInstance = consent.knownInstance;
        }
        setPlacementConsent(null);
        if (advanceRow != null) {
          setPresetSearch({ placing: input.placementApproved === true });
        }
        const result = await locatePresetTarget({
          siteId,
          targetKey: input.targetKey,
          pageIdHint: pageId,
          knownComponentInstance: knownInstance,
        });
        await handleLocateResult(result, { gen, advanceRow, notifyOnSuccess: input.notifyOnSuccess === true });
      } finally {
        locateInFlightRef.current = false;
        setLocatePending(false);
        setPresetSearch(null);
      }
    },
    [handleLocateResult, pageId, resolvePlacementConsent, siteId]
  );

  const onConfirmComponentPlacement = useCallback(() => {
    if (placementConsent == null) {
      return;
    }
    const { targetKey, notifyOnSuccess, advanceRow } = placementConsent;
    setPlacementConsent(null);
    void runPresetLocate({ targetKey, notifyOnSuccess, placementApproved: true, advanceRow });
  }, [placementConsent, runPresetLocate]);

  const onScanPageForComponentPlacement = useCallback(() => {
    if (placementConsent == null) {
      return;
    }
    const { targetKey, notifyOnSuccess, advanceRow } = placementConsent;
    void runPresetLocate({ targetKey, notifyOnSuccess, fromConsentScan: true, advanceRow });
  }, [placementConsent, runPresetLocate]);

  const onCancelComponentPlacement = useCallback(() => {
    presetOpenGenRef.current += 1;
    setPresetSearch(null);
    setPlacementConsent(null);
  }, []);

  const openEdit = useCallback(
    (p: PresetListRow, options?: { pageTarget?: ImagePageTarget | null; skipAutoLocate?: boolean }) => {
      const entry = presetEntriesById.get(p.id) ?? null;
      const willAutoLocate =
        !options?.skipAutoLocate &&
        options?.pageTarget == null &&
        entry != null &&
        getPresetLocateAction(entry.row.targetKey).kind !== "none";
      if (!willAutoLocate || entry == null) {
        enterPresetForm(p, options?.pageTarget ?? null);
        return;
      }
      if (locateInFlightRef.current) {
        return;
      }
      // Resolve the canvas target from the list first — the form opens only once the component is found.
      setPresetSearch({ placing: false });
      void runPresetLocate({ targetKey: entry.row.targetKey, notifyOnSuccess: true, advanceRow: p });
    },
    [enterPresetForm, presetEntriesById, runPresetLocate]
  );

  const onLocatePresetTarget = useCallback(() => {
    if (editingEntry == null) {
      return;
    }
    void runPresetLocate({ targetKey: editingEntry.row.targetKey, notifyOnSuccess: true });
  }, [editingEntry, runPresetLocate]);

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

  const onSave = useCallback(() => {
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
    editingEntry,
    presetScope,
    siteId,
    pageId,
    formTarget,
    formTargets,
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
      openEdit(presetFormExistingMatchToListRow(match), {
        pageTarget: displaySurfaceTarget,
        skipAutoLocate: true,
      });
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
    if (siteId == null) {
      return [];
    }
    return listBeaconPresetStorageEntries(settings.imagePresetStorage, siteId).map(({ row, scope }) => ({
      id: row.id,
      name: row.name,
      displayName: formatBeaconPresetDisplayName(row, scope),
      scope,
      width: row.width,
      height: row.height,
      exportFormat: row.exportFormat,
      maxFileSizeBytes: row.maxFileSizeBytes,
    }));
  }, [settings.imagePresetStorage, siteId]);

  useEffect(() => {
    if (isGuest || siteId == null || autoOpenedAddRef.current) {
      return;
    }
    // Resolve once presets have loaded: a designer/admin with none jumps straight into the add form.
    autoOpenedAddRef.current = true;
    if (presetRows.length === 0) {
      openAdd();
    }
  }, [isGuest, openAdd, presetRows.length, siteId]);

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

  const editingInstanceLocationLabel = useMemo(() => {
    const location = editingEntry?.row.instanceLocation;
    return location != null ? formatBeaconPresetInstanceLocationLabel(location) : null;
  }, [editingEntry?.row.instanceLocation]);

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
          editingTargetKey={editingEntry?.row.targetKey ?? null}
          instanceLocationLabel={editingInstanceLocationLabel}
          locatePending={locatePending}
          onLocatePresetTarget={onLocatePresetTarget}
          formDiscoverySettled={formDiscoverySettled}
          formError={formError}
          formPageScanned={formPageScanned}
          formRescan={formRescan}
          formScanError={formScanError}
          formScanPending={formScanPending}
          formScanProgress={formScanProgress}
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
      <ImageEditorComponentPlacementConsentDialog
        searching={presetSearch}
        request={placementConsent}
        currentPageId={pageId}
        scanPending={locatePending}
        onConfirmPlacement={onConfirmComponentPlacement}
        onScanPage={onScanPageForComponentPlacement}
        onCancel={onCancelComponentPlacement}
      />
    </div>
  );
}
