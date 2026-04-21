import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import type { Area } from "react-easy-crop";

import { formatFileSize, formatSizeDeltaPercent } from "@/features/image-editor/lib/format-file-size";
import { cn } from "@/shared/lib/utils";

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

type ExportPresetLimitBarProps = {
  estimatedBytes: number;
  maxBytes: number;
  className?: string;
};

/** Thin fill vs. preset max; sits directly under the quality slider. */
export function ExportPresetLimitBar({ estimatedBytes, maxBytes, className }: ExportPresetLimitBarProps) {
  const ratio = maxBytes > 0 ? estimatedBytes / maxBytes : 0;
  const widthPct = Math.min(100, ratio * 100);
  const tone = presetFillTone(ratio);

  return (
    <div
      className={cn("bg-muted/80 h-1 w-full overflow-hidden rounded-full", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={maxBytes}
      aria-valuenow={Math.min(estimatedBytes, maxBytes)}
      aria-label={`Estimated file size is ${formatFileSize(estimatedBytes)} of ${formatFileSize(maxBytes)} preset limit`}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-300 ease-out", PRESET_METER_BAR[tone])}
        style={{ width: `${widthPct}%` }}
      />
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

  return (
    <div aria-busy={estimatePending} aria-live="polite" className="flex flex-col gap-1">
      <div className="text-muted-foreground flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 text-[11px] leading-tight tabular-nums">
        <p className="min-w-0">
          <span className="text-muted-foreground/85">Original </span>
          <span className="text-foreground font-medium">{originalLabel}</span>
        </p>
        <p className="min-w-0 text-right">
          <span className="text-muted-foreground/85">Est. output </span>
          {estDisplay}
        </p>
      </div>
      {showQualityCommitHint && !estimatePending && completedCrop ? (
        <p className="text-muted-foreground text-[10px] leading-snug">Release the slider to refresh the estimate.</p>
      ) : null}
      {delta ? <p className="text-muted-foreground text-[10px] leading-snug">{delta}</p> : null}
      {unknownOriginalNote ? (
        <p className="text-muted-foreground text-[10px] leading-snug">{unknownOriginalNote}</p>
      ) : null}
    </div>
  );
}
