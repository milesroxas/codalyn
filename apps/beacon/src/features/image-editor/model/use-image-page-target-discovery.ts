import { useCallback, useEffect, useRef, useState } from "react";
import { hasImagePageTargetScanCache } from "@/features/image-editor/lib/image-page-target-scan-cache";
import {
  getSelectedImageTargetHint,
  type ImagePageTarget,
  type ImagePageTargetScanProgress,
  type SelectedImageTargetHint,
  scanImageTargetsOnPage,
  tryRestoreCachedImagePageTargets,
} from "@/features/image-editor/lib/scan-image-targets-on-page";
import { useDesignerCurrentPageId } from "@/shared/lib/use-designer-current-page-id";

function useImagePageTargetDiscovery(active: boolean) {
  const { pageId } = useDesignerCurrentPageId();
  const [targets, setTargets] = useState<ImagePageTarget[]>([]);
  const [scanPending, setScanPending] = useState(false);
  const [scanProgress, setScanProgress] = useState<ImagePageTargetScanProgress | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [pageScanned, setPageScanned] = useState(false);
  const [selectionHint, setSelectionHint] = useState<SelectedImageTargetHint>({ kind: "none" });
  /** After the canvas selection probe finishes. */
  const [discoverySettled, setDiscoverySettled] = useState(false);
  const targetsRef = useRef(targets);
  targetsRef.current = targets;
  const pageScannedRef = useRef(pageScanned);
  pageScannedRef.current = pageScanned;
  const requestGenerationRef = useRef(0);

  const invalidateInFlight = useCallback(() => {
    requestGenerationRef.current += 1;
  }, []);

  const resetDiscoveryState = useCallback(() => {
    setDiscoverySettled(false);
    setTargets([]);
    setSelectionHint({ kind: "none" });
    setScanError(null);
    setScanPending(false);
    setScanProgress(null);
    setPageScanned(false);
  }, []);

  const refreshSelectionHint = useCallback(async () => {
    const generation = requestGenerationRef.current;
    const hint = await getSelectedImageTargetHint(targetsRef.current);
    if (generation !== requestGenerationRef.current) {
      return;
    }
    setSelectionHint(hint);
  }, []);

  const runDiscovery = useCallback(async () => {
    const generation = ++requestGenerationRef.current;
    setScanError(null);
    setDiscoverySettled(false);
    setTargets([]);
    setPageScanned(false);

    const hint = await getSelectedImageTargetHint([]);
    if (generation !== requestGenerationRef.current) {
      return;
    }
    setSelectionHint(hint);
    setDiscoverySettled(true);
  }, []);

  const tryRestoreFromCache = useCallback(async (activePageId: string) => {
    if (!hasImagePageTargetScanCache(activePageId)) {
      return;
    }

    const generation = requestGenerationRef.current;
    setScanPending(true);
    setScanProgress({
      phase: "collecting",
      scannedElements: 0,
      totalElements: 0,
      foundTargets: 0,
    });

    try {
      const restored = await tryRestoreCachedImagePageTargets(activePageId, (progress) => {
        if (generation !== requestGenerationRef.current) {
          return;
        }
        setScanProgress(progress);
      });
      if (generation !== requestGenerationRef.current || restored == null) {
        return;
      }

      setTargets(restored);
      setSelectionHint(await getSelectedImageTargetHint(restored));
      setPageScanned(true);
      setDiscoverySettled(true);
    } finally {
      if (generation === requestGenerationRef.current) {
        setScanPending(false);
        setScanProgress(null);
      }
    }
  }, []);

  useEffect(() => {
    if (!active || pageId == null) {
      invalidateInFlight();
      resetDiscoveryState();
      return;
    }

    resetDiscoveryState();
    void runDiscovery();
    void tryRestoreFromCache(pageId);
    const unsub = webflow.subscribe("selectedelement", () => {
      void refreshSelectionHint();
    });
    return () => {
      invalidateInFlight();
      unsub();
    };
  }, [
    active,
    pageId,
    invalidateInFlight,
    refreshSelectionHint,
    resetDiscoveryState,
    runDiscovery,
    tryRestoreFromCache,
  ]);

  const rescan = useCallback(async () => {
    if (pageId == null) {
      return;
    }
    const generation = ++requestGenerationRef.current;
    const forceRefresh = pageScannedRef.current;

    setScanPending(true);
    setScanProgress({
      phase: "collecting",
      scannedElements: 0,
      totalElements: 0,
      foundTargets: 0,
    });
    setScanError(null);
    try {
      const { targets: nextTargets } = await scanImageTargetsOnPage({
        forceRefresh,
        pageId,
        onProgress: (progress) => {
          if (generation !== requestGenerationRef.current) {
            return;
          }
          setScanProgress(progress);
        },
      });
      if (generation !== requestGenerationRef.current) {
        return;
      }
      setTargets(nextTargets);
      setSelectionHint(await getSelectedImageTargetHint(nextTargets));
      setPageScanned(true);
    } catch (error) {
      if (generation !== requestGenerationRef.current) {
        return;
      }
      setScanError(error instanceof Error ? error.message : "Could not scan the page");
      setTargets([]);
      setPageScanned(true);
    } finally {
      if (generation === requestGenerationRef.current) {
        setScanPending(false);
        setScanProgress(null);
      }
    }
  }, [pageId]);

  return {
    targets,
    scanPending,
    scanProgress,
    scanError,
    pageScanned,
    rescan,
    selectionHint,
    discoverySettled,
  };
}

export { useImagePageTargetDiscovery };
