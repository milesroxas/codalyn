import type { ImageExportFormat } from "@codalyn/webflow-kit";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Area } from "react-easy-crop";

import { estimateEncodedOutputBytes } from "@/features/image-editor/lib/estimate-encoded-size";
import { getExportGeometryKey } from "@/features/image-editor/lib/export-geometry-key";
import { getTowerUsageLimitFromError, type TowerUsageLimitDetails } from "@/shared/lib/tower-usage-limit-error";

/** When Tower is set, both formats call optimize — debounce so sliders do not queue many requests. */
const ESTIMATE_DEBOUNCE_MS = 400;

export function useExportByteEstimate(options: {
  imageSrc: string | null;
  completedCrop: Area | null;
  effectiveOutputW: number;
  effectiveOutputH: number;
  quality: number;
  exportFormat: ImageExportFormat;
  /** When false, skips estimate (e.g. export W×H not chosen yet). */
  enabled?: boolean;
  onTowerUsageLimit?: (details: TowerUsageLimitDetails) => void;
}) {
  const {
    imageSrc,
    completedCrop,
    effectiveOutputW,
    effectiveOutputH,
    quality,
    exportFormat,
    enabled = true,
    onTowerUsageLimit,
  } = options;

  const [estimatedBytes, setEstimatedBytes] = useState<number | null>(null);
  const [estimatePending, setEstimatePending] = useState(false);
  const [estimateNonce, setEstimateNonce] = useState(0);
  const estimateGenRef = useRef(0);

  const geometryKey = useMemo(
    () => getExportGeometryKey(imageSrc, completedCrop, effectiveOutputW, effectiveOutputH),
    [imageSrc, completedCrop, effectiveOutputW, effectiveOutputH]
  );

  useEffect(() => {
    void geometryKey;
    setEstimatedBytes(null);
    setEstimatePending(false);
    estimateGenRef.current += 1;
    setEstimateNonce(enabled && imageSrc && completedCrop ? 1 : 0);
  }, [geometryKey, imageSrc, completedCrop, enabled]);

  useEffect(() => {
    if (!enabled || estimateNonce === 0 || !imageSrc || !completedCrop) {
      return;
    }
    const gen = ++estimateGenRef.current;
    setEstimatePending(true);
    const w = effectiveOutputW;
    const h = effectiveOutputH;
    const t = window.setTimeout(() => {
      void estimateEncodedOutputBytes({
        imageSrc,
        completedCrop,
        outputWidth: w,
        outputHeight: h,
        quality,
        format: exportFormat,
      })
        .then((bytes) => {
          if (estimateGenRef.current !== gen) {
            return;
          }
          setEstimatedBytes(bytes);
          setEstimatePending(false);
        })
        .catch((err) => {
          if (estimateGenRef.current !== gen) {
            return;
          }
          const usageLimit = getTowerUsageLimitFromError(err);
          if (usageLimit != null) {
            onTowerUsageLimit?.(usageLimit);
          }
          setEstimatedBytes(null);
          setEstimatePending(false);
        });
    }, ESTIMATE_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(t);
    };
  }, [
    enabled,
    estimateNonce,
    quality,
    exportFormat,
    imageSrc,
    completedCrop,
    effectiveOutputW,
    effectiveOutputH,
    onTowerUsageLimit,
  ]);

  const onQualityCommit = useCallback(() => {
    setEstimateNonce((n) => n + 1);
  }, []);

  return { estimatedBytes, estimatePending, estimateNonce, onQualityCommit };
}
