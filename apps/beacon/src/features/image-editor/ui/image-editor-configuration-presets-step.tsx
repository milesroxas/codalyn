import {
  BEACON_PRESET_DEFAULT_MAX_FILE_BYTES,
  type BeaconAppSettings,
  type BeaconImagePresetRow,
} from "@codalyn/webflow-kit";
import { Loader2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";
import { setBeaconDesignerExportAttrsOnPageTarget } from "@/features/image-editor/lib/apply-beacon-designer-export-attrs-to-target";
import { parseOutputDimension } from "@/features/image-editor/lib/apply-cropped-export";
import { clampExportDimensionsToMaxEdge } from "@/features/image-editor/lib/clamp-export-dimensions";
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
  formTarget: ImagePageTarget | null;
  formTargets: ImagePageTarget[];
  editingId: string | null;
  defaultExportFormat: BeaconAppSettings["defaultExportFormat"];
  updateSettings: (patch: BeaconAppSettingsPatch) => void;
  backToList: () => void;
};

async function commitImagePresetForm(args: CommitImagePresetFormArgs): Promise<void> {
  const {
    setFormError,
    setSavePending,
    nameDraft,
    wStr,
    hStr,
    formTarget,
    formTargets,
    editingId,
    defaultExportFormat,
    updateSettings,
    backToList,
  } = args;
  setFormError(null);
  const name = nameDraft.trim();
  if (!name) {
    setFormError("Enter a name for this preset.");
    return;
  }
  const wRaw = parseOutputDimension(wStr, 1200);
  const hRaw = parseOutputDimension(hStr, 1200);
  const { width, height } = clampExportDimensionsToMaxEdge(wRaw, hRaw);
  const tagTarget = await resolvePresetTagTarget(formTarget, formTargets);
  if (!editingId && !tagTarget) {
    setFormError("Select an Image on the canvas or pick a surface in the list, then save.");
    return;
  }
  setSavePending(true);
  try {
    if (tagTarget) {
      await setBeaconDesignerExportAttrsOnPageTarget(tagTarget, width, height);
    }
    if (editingId) {
      updateSettings((prev) => ({
        imagePresets: prev.imagePresets.map((p) => (p.id === editingId ? { ...p, name, width, height } : p)),
      }));
    } else {
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
    setSavePending(false);
  }
}

function tryAdvanceFromPresetFormStep1(
  isNewPreset: boolean,
  formTarget: ImagePageTarget | null,
  setFormError: (v: string | null) => void,
  goStep2: () => void
): void {
  setFormError(null);
  if (isNewPreset && !formTarget) {
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
  onRescan: () => void;
  selectedTarget: ImagePageTarget | null;
  onSelectTarget: (t: ImagePageTarget) => void;
}) {
  const { targets, scanPending, scanError, onRescan, selectedTarget, onSelectTarget } = props;
  const hasListRows = targets.length > 0;
  return (
    <div className={cn("flex w-full min-w-0 flex-col gap-2", hasListRows && "max-h-48 min-h-0 overflow-hidden")}>
      <div className="flex min-w-0 shrink-0 items-center justify-between gap-2">
        <p className="text-muted-foreground text-[11px]">Images on this page</p>
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
      </div>
      {scanError ? <p className="shrink-0 text-destructive text-xs">{scanError}</p> : null}
      {scanPending && targets.length === 0 ? (
        <p className="text-muted-foreground flex shrink-0 items-center gap-2 text-xs">
          <Loader2 className="size-3.5 shrink-0 animate-spin" />
          Scanning the page…
        </p>
      ) : null}
      {targets.length === 0 && !scanPending ? (
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
                className="flex min-w-0 items-center gap-2 rounded-lg border border-border/80 bg-muted/20 px-3 py-2"
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
                    className="text-muted-foreground flex min-w-0 items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-xs"
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
            <TargetPickSection
              discoverySettled={formDiscoverySettled}
              onChooseAnotherOnPage={onFormChooseAnotherOnPage}
              onRescan={formRescan}
              onSelectTarget={formTargetSelect}
              onUseCanvasSelection={onFormUseCanvasSelection}
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
            <div className="space-y-3 rounded-lg border border-border/80 bg-muted/20 p-3 text-sm">
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
  const { settings, updateSettings } = useBeaconAppSettings();
  const [view, setView] = useState<View>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [wStr, setWStr] = useState("1200");
  const [hStr, setHStr] = useState("1200");
  const [formError, setFormError] = useState<string | null>(null);
  const [savePending, setSavePending] = useState(false);
  const [formTarget, setFormTarget] = useState<ImagePageTarget | null>(null);
  const [formSubStep, setFormSubStep] = useState<FormSubStep>(1);
  const [presetPendingDelete, setPresetPendingDelete] = useState<BeaconImagePresetRow | null>(null);

  const isForm = view === "form";
  const {
    targets: formTargets,
    scanPending: formScanPending,
    scanError: formScanError,
    rescan: formRescan,
    selectionHint: formSelectionHint,
    discoverySettled: formDiscoverySettled,
    dismissedCanvasSelectionPrompt: formDismissedSelection,
    setDismissedCanvasSelectionPrompt: setFormDismissedSelection,
  } = usePresetFormTargets(isForm);

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
    if (!settings.imagePresets.some((p) => p.id === editingId)) {
      setEditingId(null);
      setView("list");
      setFormError(null);
      setFormSubStep(1);
    }
  }, [editingId, settings.imagePresets]);

  useEffect(() => {
    if (presetPendingDelete == null) {
      return;
    }
    if (!settings.imagePresets.some((p) => p.id === presetPendingDelete.id)) {
      setPresetPendingDelete(null);
    }
  }, [presetPendingDelete, settings.imagePresets]);

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
    setFormError(null);
    setFormSubStep(1);
    setView("form");
  };

  const openEdit = (p: BeaconImagePresetRow) => {
    setEditingId(p.id);
    setNameDraft(p.name);
    setWStr(String(p.width));
    setHStr(String(p.height));
    setFormError(null);
    setFormSubStep(1);
    setView("form");
  };

  const onDeletePreset = useCallback(
    (id: string) => {
      updateSettings((prev) => ({ imagePresets: prev.imagePresets.filter((p) => p.id !== id) }));
      void webflow.notify({ type: "Success", message: "Preset removed." });
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
  const canContinueFromStep1 = formDiscoverySettled && (Boolean(editingId) || formTarget !== null);

  const onContinueToDimensions = useCallback(() => {
    tryAdvanceFromPresetFormStep1(isNewPreset, formTarget, setFormError, () => setFormSubStep(2));
  }, [isNewPreset, formTarget]);

  const onContinueToSaveStep = useCallback(() => {
    tryAdvanceFromPresetFormStep2(nameDraft, wStr, hStr, setFormError, () => setFormSubStep(3));
  }, [nameDraft, wStr, hStr]);

  const onFormBack = useCallback(() => {
    tryHandlePresetFormBack(formSubStep, setFormError, backToList, () => setFormSubStep((s) => (s - 1) as FormSubStep));
  }, [formSubStep, backToList]);

  const onSave = useCallback(() => {
    void commitImagePresetForm({
      setFormError,
      setSavePending,
      nameDraft,
      wStr,
      hStr,
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
    formTarget,
    formTargets,
    updateSettings,
    settings.defaultExportFormat,
    backToList,
  ]);

  const workspaceRows = settings.imagePresets;
  const designerRows = settings.designerOnlyImagePresets;

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
          formDiscoverySettled={formDiscoverySettled}
          formError={formError}
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
