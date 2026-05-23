import { useCallback, useEffect, useRef, useState } from "react";
import {
  getSelectedImageTargetHint,
  type ImagePageTarget,
  type SelectedImageTargetHint,
  scanImageTargetsOnPage,
} from "@/features/image-editor/lib/scan-image-targets-on-page";

function useImagePageTargetDiscovery(active: boolean) {
  const [targets, setTargets] = useState<ImagePageTarget[]>([]);
  const [scanPending, setScanPending] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [pageScanned, setPageScanned] = useState(false);
  const [selectionHint, setSelectionHint] = useState<SelectedImageTargetHint>({ kind: "none" });
  /** After the canvas selection probe finishes. */
  const [discoverySettled, setDiscoverySettled] = useState(false);
  const targetsRef = useRef(targets);
  targetsRef.current = targets;
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

  useEffect(() => {
    if (!active) {
      invalidateInFlight();
      resetDiscoveryState();
      return;
    }
    void runDiscovery();
    const unsub = webflow.subscribe("selectedelement", () => {
      void refreshSelectionHint();
    });
    return () => {
      invalidateInFlight();
      unsub();
    };
  }, [active, invalidateInFlight, refreshSelectionHint, resetDiscoveryState, runDiscovery]);

  const rescan = useCallback(async () => {
    const generation = ++requestGenerationRef.current;
    setScanPending(true);
    setScanError(null);
    try {
      const nextTargets = await scanImageTargetsOnPage();
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
      }
    }
  }, []);

  return {
    targets,
    scanPending,
    scanError,
    pageScanned,
    rescan,
    selectionHint,
    discoverySettled,
  };
}

export { useImagePageTargetDiscovery };
