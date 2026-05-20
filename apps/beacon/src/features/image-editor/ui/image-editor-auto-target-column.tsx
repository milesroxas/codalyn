import { Loader2, RefreshCw } from "lucide-react";
import type { ImagePageTarget, SelectedImageTargetHint } from "@/features/image-editor/lib/scan-image-targets-on-page";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import { Separator } from "@/shared/ui/separator";

type ImageEditorAutoTargetColumnProps = {
  /** Canvas selection probe is done. */
  discoverySettled: boolean;
  targets: ImagePageTarget[];
  scanPending: boolean;
  scanError: string | null;
  pageScanned: boolean;
  onRescan: () => void;
  selectionHint: SelectedImageTargetHint;
  /** User-chosen target to continue (from list or “use selection”). */
  selectedTarget: ImagePageTarget | null;
  onSelectTarget: (t: ImagePageTarget) => void;
  onUseCanvasSelection: () => void;
  onChooseAnotherOnPage: () => void;
  showSelectionChoice: boolean;
  /** “Image targets on this page” (hidden while the selection prompt is enough). */
  showPageTargetList: boolean;
};

type ImageTargetRowsScrollProps = {
  selectedTarget: ImagePageTarget | null;
  onSelectTarget: (t: ImagePageTarget) => void;
  targets: ImagePageTarget[];
};

function ImageTargetRowsList(props: ImageTargetRowsScrollProps) {
  const { selectedTarget, onSelectTarget, targets } = props;

  return (
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
        const sub = t.kind === "component" && t.imagePropLabel != null ? `${t.label} — ${t.imagePropLabel}` : t.label;
        return (
          <div key={t.id} className="min-w-0">
            {i > 0 ? <Separator className="my-0" /> : null}
            <label
              htmlFor={`auto-tgt-${t.id}`}
              className={cn(
                "flex min-w-0 cursor-pointer items-center gap-3 py-2.5 pr-1",
                selectedTarget?.id === t.id && "bg-accent/40"
              )}
            >
              <RadioGroupItem id={`auto-tgt-${t.id}`} value={t.id} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug">{sub}</p>
                <p className="text-muted-foreground text-[10px]">
                  {t.kind === "image" ? "Image element" : "Component field"}
                </p>
              </div>
            </label>
          </div>
        );
      })}
    </RadioGroup>
  );
}

type PageTargetsOnPageSectionProps = {
  onRescan: () => void;
  onSelectTarget: (t: ImagePageTarget) => void;
  pageScanned: boolean;
  scanError: string | null;
  scanPending: boolean;
  selectedTarget: ImagePageTarget | null;
  targets: ImagePageTarget[];
};

function PageTargetsOnPageSection(props: PageTargetsOnPageSectionProps) {
  const { onRescan, onSelectTarget, pageScanned, scanError, scanPending, selectedTarget, targets } = props;
  const hasListRows = targets.length > 0;

  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      <div className="flex min-w-0 shrink-0 items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">Image surfaces on this page</p>
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
        <ImageTargetRowsList onSelectTarget={onSelectTarget} selectedTarget={selectedTarget} targets={targets} />
      ) : null}
    </div>
  );
}

type AutoTargetColumnMainProps = {
  discoverySettled: boolean;
  onChooseAnotherOnPage: () => void;
  onRescan: () => void;
  onSelectTarget: (t: ImagePageTarget) => void;
  onUseCanvasSelection: () => void;
  pageScanned: boolean;
  scanError: string | null;
  scanPending: boolean;
  selectedTarget: ImagePageTarget | null;
  selectionHint: SelectedImageTargetHint;
  showPageTargetList: boolean;
  showSelectionChoice: boolean;
  targets: ImagePageTarget[];
};

function AutoTargetColumnMain(props: AutoTargetColumnMainProps) {
  const {
    discoverySettled,
    onChooseAnotherOnPage,
    onRescan,
    onSelectTarget,
    onUseCanvasSelection,
    pageScanned,
    scanError,
    scanPending,
    selectedTarget,
    selectionHint,
    showPageTargetList,
    showSelectionChoice,
    targets,
  } = props;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {!discoverySettled ? (
        <p className="text-muted-foreground flex shrink-0 items-center gap-2 text-xs">
          <Loader2 className="size-3.5 shrink-0 animate-spin" />
          Checking the canvas…
        </p>
      ) : null}

      {showSelectionChoice && selectionHint.kind !== "none" ? (
        <div className="min-w-0 shrink-0 space-y-3">
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Use your current selection?</p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              {selectionHint.kind === "image"
                ? "The selected element is an Image surface. Place the file here, or pick another Image on the page."
                : "The selected component has an image field. Use it, or pick another Image surface on the page."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={onUseCanvasSelection}>
              Use selected
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onChooseAnotherOnPage}>
              Choose on page
            </Button>
          </div>
        </div>
      ) : null}

      {showPageTargetList ? (
        <PageTargetsOnPageSection
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

export function ImageEditorAutoTargetColumn(props: ImageEditorAutoTargetColumnProps) {
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

  return (
    <AutoTargetColumnMain
      discoverySettled={discoverySettled}
      onChooseAnotherOnPage={onChooseAnotherOnPage}
      onRescan={onRescan}
      onSelectTarget={onSelectTarget}
      onUseCanvasSelection={onUseCanvasSelection}
      pageScanned={pageScanned}
      scanError={scanError}
      scanPending={scanPending}
      selectedTarget={selectedTarget}
      selectionHint={selectionHint}
      showPageTargetList={showPageTargetList}
      showSelectionChoice={showSelectionChoice}
      targets={targets}
    />
  );
}
