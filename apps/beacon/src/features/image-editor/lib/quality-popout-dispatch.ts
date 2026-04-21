import type { MutableRefObject } from "react";

import { isQualityPopoutMessage } from "@/features/image-editor/lib/quality-popout-protocol";

const PREVIEW_DEBOUNCE_MS = 400;

function clampExportQuality(q: number): number {
  return Math.min(1, Math.max(0.05, q));
}

function scheduleDebouncedPreview(
  debounceTimerRef: MutableRefObject<number | null>,
  requestCompressedPreview: (quality: number) => void,
  quality: number
): void {
  if (debounceTimerRef.current) {
    globalThis.clearTimeout(debounceTimerRef.current);
  }
  debounceTimerRef.current = globalThis.setTimeout(() => {
    debounceTimerRef.current = null;
    void requestCompressedPreview(quality);
  }, PREVIEW_DEBOUNCE_MS) as unknown as number;
}

function clearDebounceTimer(debounceTimerRef: MutableRefObject<number | null>): void {
  if (debounceTimerRef.current) {
    globalThis.clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = null;
  }
}

export function dispatchQualityPopoutMessage(
  event: MessageEvent,
  targetOrigin: string,
  popoutWindowRef: MutableRefObject<Window | null>,
  debounceTimerRef: MutableRefObject<number | null>,
  requestCompressedPreview: (quality: number) => void,
  setQuality: (q: number) => void,
  onQualityCommit: () => void
): void {
  if (event.origin !== targetOrigin || event.source !== popoutWindowRef.current) {
    return;
  }
  if (!isQualityPopoutMessage(event.data)) {
    return;
  }
  const d = event.data;
  if (d.type === "preview-quality-changed") {
    scheduleDebouncedPreview(debounceTimerRef, requestCompressedPreview, clampExportQuality(d.quality));
    return;
  }
  if (d.type === "save-and-close") {
    clearDebounceTimer(debounceTimerRef);
    setQuality(clampExportQuality(d.quality));
    onQualityCommit();
    popoutWindowRef.current?.close();
    popoutWindowRef.current = null;
  }
}
