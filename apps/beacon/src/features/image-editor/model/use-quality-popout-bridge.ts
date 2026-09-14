import type { ImageExportFormat } from "@codalyn/webflow-kit";
import { type MutableRefObject, useCallback, useEffect, useRef } from "react";
import type { Area } from "react-easy-crop";

import { clampEdge } from "@/features/image-editor/lib/apply-cropped-export";
import { encodeExportCompressedPreviewBlob } from "@/features/image-editor/lib/export-preview-encode";
import { dispatchQualityPopoutMessage } from "@/features/image-editor/lib/quality-popout-dispatch";
import { BEACON_QUALITY_PARENT_SOURCE } from "@/features/image-editor/lib/quality-popout-protocol";
import type { TowerUsageLimitDetails } from "@/shared/lib/tower-usage-limit-error";
import { getTowerUsageLimitFromError } from "@/shared/lib/tower-usage-limit-error";

function clampExportQuality(q: number): number {
  return Math.min(1, Math.max(0.05, q));
}

type QualityParentToPopoutMessage =
  | { source: typeof BEACON_QUALITY_PARENT_SOURCE; type: "compressed-updated"; compressedBlob: Blob }
  | { source: typeof BEACON_QUALITY_PARENT_SOURCE; type: "compressed-error" };

/**
 * The only parent→popout send path. Build-time constant: with the popout flag-gated off there is no
 * popout window to post to, so the `postMessage` call — the only first-party one in bundle.js — is
 * dead-code-eliminated. App Review Preflight flags every `postMessage` whose target origin is not a
 * string literal, and the Designer extension origin can only be known at runtime.
 */
function postToPopout(
  popoutWindowRef: MutableRefObject<Window | null>,
  message: QualityParentToPopoutMessage,
  targetOrigin: string
): void {
  if (!__QUALITY_COMPARE_POPOUT_ENABLED__) {
    return;
  }
  const win = popoutWindowRef.current;
  if (!win || win.closed) {
    return;
  }
  win.postMessage(message, targetOrigin);
}

export function useQualityPopoutBridge(options: {
  imageSrc: string | null;
  completedCrop: Area | null;
  effectiveOutputW: number;
  effectiveOutputH: number;
  exportFormat: ImageExportFormat;
  avifTowerConsentGranted?: boolean;
  setQuality: (q: number) => void;
  onQualityCommit: () => void;
  popoutWindowRef: MutableRefObject<Window | null>;
  onTowerUsageLimit?: (details: TowerUsageLimitDetails) => void;
}) {
  const {
    imageSrc,
    completedCrop,
    effectiveOutputW,
    effectiveOutputH,
    exportFormat,
    avifTowerConsentGranted,
    setQuality,
    onQualityCommit,
    popoutWindowRef,
    onTowerUsageLimit,
  } = options;

  const encodeGenRef = useRef(0);
  const debounceTimerRef = useRef<number | null>(null);

  const requestCompressedPreview = useCallback(
    async (quality: number) => {
      const pop = popoutWindowRef.current;
      if (!imageSrc || !completedCrop || !pop || pop.closed) {
        return;
      }
      const gen = ++encodeGenRef.current;
      const w = clampEdge(effectiveOutputW);
      const h = clampEdge(effectiveOutputH);
      const q = clampExportQuality(quality);
      const targetOrigin = window.location.origin;
      try {
        const compressedBlob = await encodeExportCompressedPreviewBlob({
          imageSrc,
          completedCrop,
          w,
          h,
          quality: q,
          exportFormat,
          avifTowerConsentGranted,
        });
        if (gen !== encodeGenRef.current) {
          return;
        }
        postToPopout(
          popoutWindowRef,
          { source: BEACON_QUALITY_PARENT_SOURCE, type: "compressed-updated", compressedBlob },
          targetOrigin
        );
      } catch (err) {
        const usageLimit = getTowerUsageLimitFromError(err);
        if (usageLimit != null) {
          onTowerUsageLimit?.(usageLimit);
        }
        postToPopout(popoutWindowRef, { source: BEACON_QUALITY_PARENT_SOURCE, type: "compressed-error" }, targetOrigin);
      }
    },
    [
      imageSrc,
      completedCrop,
      effectiveOutputW,
      effectiveOutputH,
      exportFormat,
      avifTowerConsentGranted,
      popoutWindowRef,
      onTowerUsageLimit,
    ]
  );

  useEffect(() => {
    // Build-time constant: with the popout flag-gated off there is no popout window to bridge to,
    // so the message listener is never registered (and the handler wiring is eliminated).
    if (!__QUALITY_COMPARE_POPOUT_ENABLED__) {
      return;
    }
    const targetOrigin = window.location.origin;
    const onMessage = (event: MessageEvent) => {
      dispatchQualityPopoutMessage(
        event,
        targetOrigin,
        popoutWindowRef,
        debounceTimerRef,
        requestCompressedPreview,
        setQuality,
        onQualityCommit
      );
    };
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [requestCompressedPreview, setQuality, onQualityCommit, popoutWindowRef]);
}
