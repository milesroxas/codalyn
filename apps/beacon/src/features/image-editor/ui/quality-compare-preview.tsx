import { useDeferredLoadingIndicator } from "@codalyn/webflow-kit/react";
import { ExternalLink, Loader2 } from "lucide-react";
import { type KeyboardEvent, type PointerEvent, useCallback, useRef, useState } from "react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";

type QualityComparePreviewProps = {
  originalSrc: string | null;
  compressedSrc: string | null;
  pending: boolean;
  exportWidth: number;
  exportHeight: number;
  onOpenQualityPopout: () => void;
};

export function QualityComparePreview(p: QualityComparePreviewProps) {
  const { originalSrc, compressedSrc, pending, exportWidth, exportHeight, onOpenQualityPopout } = p;
  const previewRef = useRef<HTMLDivElement>(null);
  const [scrubPct, setScrubPct] = useState(50);
  const showPending = useDeferredLoadingIndicator(pending);

  const ready = originalSrc !== null && compressedSrc !== null && !pending;
  const aspectRatio = exportWidth > 0 && exportHeight > 0 ? exportWidth / exportHeight : 1;

  const onPopOut = useCallback(() => {
    if (!originalSrc || !compressedSrc) {
      return;
    }
    onOpenQualityPopout();
  }, [originalSrc, compressedSrc, onOpenQualityPopout]);

  const setScrubFromClientX = useCallback((clientX: number) => {
    const el = previewRef.current;
    if (!el) {
      return;
    }
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) {
      return;
    }
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setScrubPct(Math.min(100, Math.max(0, Math.round(pct))));
  }, []);

  const onScrubPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      setScrubFromClientX(e.clientX);
    },
    [setScrubFromClientX]
  );

  const onScrubPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) {
        return;
      }
      setScrubFromClientX(e.clientX);
    },
    [setScrubFromClientX]
  );

  const onScrubPointerUp = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

  const onScrubKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      setScrubPct((p) => Math.max(0, p - 1));
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      setScrubPct((p) => Math.min(100, p + 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setScrubPct(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setScrubPct(100);
    }
  }, []);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <p className="text-foreground text-xs font-medium leading-none">Compression preview</p>
          <p className="text-muted-foreground text-[10px] leading-snug">
            Drag the handle on the preview to compare lossless crop vs. export.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground -mr-1 h-8 shrink-0 gap-1 px-2 text-[10px] font-medium"
          disabled={!ready}
          onClick={onPopOut}
          title="Open a larger compare view"
          aria-label="Open larger compression compare in a new window"
        >
          <ExternalLink aria-hidden className="size-3" />
          Pop out
        </Button>
      </div>

      <div
        ref={previewRef}
        className={cn(
          "relative max-h-52 w-full overflow-hidden rounded-sm border border-border/50 bg-muted/25 shadow-inner",
          showPending && "min-h-[128px]"
        )}
        style={{ aspectRatio }}
      >
        {showPending && !compressedSrc ? (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/40">
            <Loader2 aria-hidden className="text-muted-foreground size-6 animate-spin" />
          </div>
        ) : null}
        {compressedSrc ? (
          <img
            src={compressedSrc}
            alt="Compressed preview"
            className="absolute inset-0 m-auto max-h-full max-w-full object-contain"
            draggable={false}
          />
        ) : null}
        {originalSrc ? (
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ clipPath: `inset(0 ${100 - scrubPct}% 0 0)` }}
            aria-hidden
          >
            <img
              src={originalSrc}
              alt=""
              className="absolute inset-0 m-auto max-h-full max-w-full object-contain"
              draggable={false}
            />
          </div>
        ) : null}
        {ready ? (
          <>
            <div
              className="pointer-events-none absolute top-0 bottom-0 z-1 w-px bg-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.25)]"
              style={{ left: `${scrubPct}%`, transform: "translateX(-50%)" }}
              aria-hidden
            />
            <div
              className="compare-wipe-handle pointer-events-none absolute top-1/2 z-2"
              style={{ left: `${scrubPct}%`, transform: "translate(-50%, -50%)" }}
              aria-hidden
            />
            <div
              className="absolute inset-0 z-3 touch-none cursor-grab outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              onPointerDown={onScrubPointerDown}
              onPointerMove={onScrubPointerMove}
              onPointerUp={onScrubPointerUp}
              onPointerCancel={onScrubPointerUp}
              onKeyDown={onScrubKeyDown}
              role="slider"
              tabIndex={0}
              aria-valuenow={scrubPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Compare crop and export"
              aria-valuetext={`${scrubPct}% original visible on the left`}
            />
            <div className="text-muted-foreground pointer-events-none absolute inset-x-2 bottom-2 z-4 flex justify-between text-[10px] font-medium tabular-nums">
              <span>Crop</span>
              <span>Export</span>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
