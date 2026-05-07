import { Info, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { useId } from "react";
import type { Area } from "react-easy-crop";

import { formatFileSize, formatSizeDeltaPercent } from "@/features/image-editor/lib/format-file-size";
import { cn } from "@/shared/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

type PresetFillTone = "safe" | "caution" | "warn" | "over";

function presetFillTone(ratio: number): PresetFillTone {
  if (ratio >= 1) {
    return "over";
  }
  if (ratio >= 0.9) {
    return "warn";
  }
  if (ratio >= 0.7) {
    return "caution";
  }
  return "safe";
}

const PRESET_METER_BAR: Record<PresetFillTone, string> = {
  safe: "bg-emerald-600 dark:bg-emerald-500",
  caution: "bg-amber-500",
  warn: "bg-orange-500",
  over: "bg-destructive",
};

const PRESET_LIMIT_SEGMENT_COUNT = 4;
const PRESET_LIMIT_SEGMENT_INDEXES = [0, 1, 2, 3] as const;

function segmentFillPercent(ratio: number, segmentIndex: number): number {
  const start = segmentIndex / PRESET_LIMIT_SEGMENT_COUNT;
  const end = (segmentIndex + 1) / PRESET_LIMIT_SEGMENT_COUNT;
  if (ratio <= start) {
    return 0;
  }
  if (ratio >= end) {
    return 100;
  }
  return ((ratio - start) / (end - start)) * 100;
}

type ExportPresetLimitBarProps = {
  estimatedBytes: number;
  maxBytes: number;
  className?: string;
};

/** Four rounded segments vs. preset max (fills left→right; color follows usage). */
export function ExportPresetLimitBar({ estimatedBytes, maxBytes, className }: ExportPresetLimitBarProps) {
  const ratio = maxBytes > 0 ? estimatedBytes / maxBytes : 0;
  const tone = presetFillTone(ratio);

  return (
    <div
      className={cn("flex min-w-0 w-full gap-1", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={maxBytes}
      aria-valuenow={Math.min(estimatedBytes, maxBytes)}
      aria-label={`Estimated file size is ${formatFileSize(estimatedBytes)} of ${formatFileSize(maxBytes)} preset limit`}
    >
      {PRESET_LIMIT_SEGMENT_INDEXES.map((segmentIndex) => {
        const fillPct = segmentFillPercent(ratio, segmentIndex);
        return (
          <div
            key={`preset-limit-seg-${segmentIndex}`}
            className="bg-muted/80 flex h-2 min-h-2 min-w-0 flex-1 overflow-hidden rounded-sm"
            aria-hidden
          >
            <div
              className={cn("h-full rounded-sm transition-[width] duration-300 ease-out", PRESET_METER_BAR[tone])}
              style={{ width: `${fillPct}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}

type ExportEncodeSizeFootnoteProps = {
  originalBytes: number | null;
  estimatedBytes: number | null;
  estimatePending: boolean;
  completedCrop: Area | null;
  showQualityCommitHint?: boolean;
};

/** Original vs. estimated sizes as a single caption row under the quality control. */
export function ExportEncodeSizeFootnote({
  originalBytes,
  estimatedBytes,
  estimatePending,
  completedCrop,
  showQualityCommitHint = false,
}: ExportEncodeSizeFootnoteProps) {
  const detailsId = useId();
  const originalLabel = originalBytes !== null ? formatFileSize(originalBytes) : "Unknown";

  let estDisplay: ReactNode;
  if (!completedCrop) {
    estDisplay = <span className="text-muted-foreground">Crop first</span>;
  } else if (estimatePending) {
    estDisplay = (
      <span className="text-muted-foreground inline-flex items-center gap-1">
        <Loader2 aria-hidden className="size-3 shrink-0 animate-spin" />…
      </span>
    );
  } else if (estimatedBytes !== null) {
    estDisplay = <span className="text-foreground font-medium">{formatFileSize(estimatedBytes)}</span>;
  } else {
    estDisplay = <span className="text-muted-foreground">—</span>;
  }

  const delta =
    originalBytes !== null && estimatedBytes !== null && !estimatePending && completedCrop
      ? formatSizeDeltaPercent(originalBytes, estimatedBytes)
      : null;

  const unknownOriginalNote =
    originalBytes === null && estimatedBytes !== null && !estimatePending && completedCrop
      ? "Original size unavailable."
      : null;

  const tooltipLines: string[] = [];
  if (showQualityCommitHint && !estimatePending && completedCrop) {
    tooltipLines.push("Release the slider to refresh the estimate.");
  }
  if (delta) {
    tooltipLines.push(delta);
  }
  if (unknownOriginalNote) {
    tooltipLines.push(unknownOriginalNote);
  }

  return (
    <div aria-busy={estimatePending} aria-live="polite" className="flex flex-col gap-2">
      <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px] leading-tight tabular-nums">
        <p className="min-w-0">
          <span className="text-muted-foreground/85">Original </span>
          <span className="text-foreground font-medium">{originalLabel}</span>
        </p>
        <div className="flex min-w-0 items-center justify-end gap-1">
          <p className="min-w-0 text-right">
            <span className="text-muted-foreground/85">Est. output </span>
            {estDisplay}
          </p>
          {tooltipLines.length > 0 ? (
            <>
              <span id={detailsId} className="sr-only">
                {tooltipLines.join(" ")}
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground inline-flex size-7 shrink-0 items-center justify-center rounded-sm border border-transparent hover:bg-muted/40"
                    aria-label="Size estimate details"
                    aria-describedby={detailsId}
                  >
                    <Info className="size-3.5 shrink-0" aria-hidden />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-60 whitespace-pre-line text-left">
                  {tooltipLines.join("\n\n")}
                </TooltipContent>
              </Tooltip>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
