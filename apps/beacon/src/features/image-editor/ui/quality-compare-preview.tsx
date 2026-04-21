import { ExternalLink, Loader2 } from "lucide-react";
import { useCallback, useId, useState } from "react";

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
  const rangeId = useId();
  const [scrubPct, setScrubPct] = useState(50);

  const ready = originalSrc !== null && compressedSrc !== null && !pending;
  const aspectRatio = exportWidth > 0 && exportHeight > 0 ? exportWidth / exportHeight : 1;

  const onPopOut = useCallback(() => {
    if (!originalSrc || !compressedSrc) {
      return;
    }
    onOpenQualityPopout();
  }, [originalSrc, compressedSrc, onOpenQualityPopout]);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <p className="text-foreground text-xs font-medium leading-none">Compression preview</p>
          <p className="text-muted-foreground text-[10px] leading-snug">
            Drag the wedge to compare lossless crop vs. export.
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
        className={cn(
          "relative max-h-52 w-full overflow-hidden rounded-lg border border-border/50 bg-muted/25 shadow-inner",
          pending && "min-h-[128px]"
        )}
        style={{ aspectRatio }}
      >
        {pending && !compressedSrc ? (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/40">
            <Loader2 aria-hidden className="text-muted-foreground size-6 animate-spin" />
          </div>
        ) : null}
        {compressedSrc ? (
          <img
            src={compressedSrc}
            alt=""
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
          <div
            className="pointer-events-none absolute top-0 bottom-0 w-px bg-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.25)]"
            style={{ left: `${scrubPct}%`, transform: "translateX(-50%)" }}
          />
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <input
          id={rangeId}
          type="range"
          min={0}
          max={100}
          step={1}
          value={scrubPct}
          disabled={!ready}
          onChange={(e) => setScrubPct(Number(e.target.value))}
          aria-valuetext={`${scrubPct}% original visible on the left`}
          className={cn(
            "h-1.5 w-full cursor-ew-resize appearance-none rounded-full bg-muted accent-primary disabled:cursor-not-allowed disabled:opacity-45",
            "[&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:cursor-ew-resize [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-border [&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:shadow-sm",
            "[&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:cursor-ew-resize [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-border [&::-moz-range-thumb]:bg-background [&::-moz-range-thumb]:shadow-sm"
          )}
        />
        <div className="text-muted-foreground flex justify-between text-[10px] font-medium tabular-nums">
          <span>{pending ? "Updating…" : ready ? "Crop" : "—"}</span>
          <span>{pending ? "" : ready ? "Export" : ""}</span>
        </div>
      </div>
    </div>
  );
}
