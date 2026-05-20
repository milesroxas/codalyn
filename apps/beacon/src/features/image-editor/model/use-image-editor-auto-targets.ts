import { useCallback, useEffect, useState } from "react";
import type { ImageEditorFlowStep } from "@/features/image-editor/lib/image-editor-flow-step";
import {
  getSelectedImageTargetHint,
  type ImagePageTarget,
  type SelectedImageTargetHint,
  scanImageTargetsOnPage,
} from "@/features/image-editor/lib/scan-image-targets-on-page";

type UseImageEditorAutoTargetsOptions = {
  flowStep: ImageEditorFlowStep;
  pathMode: "unset" | "auto" | "configurations";
};

export function useImageEditorAutoTargets(options: UseImageEditorAutoTargetsOptions) {
  const { flowStep, pathMode } = options;

  const [targets, setTargets] = useState<ImagePageTarget[]>([]);
  const [scanPending, setScanPending] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [pageScanned, setPageScanned] = useState(false);
  const [selectionHint, setSelectionHint] = useState<SelectedImageTargetHint>({ kind: "none" });
  /** After the canvas selection probe finishes. */
  const [discoverySettled, setDiscoverySettled] = useState(false);

  const runAutoElementDiscovery = useCallback(async () => {
    setScanError(null);
    setDiscoverySettled(false);
    setTargets([]);
    setPageScanned(false);

    const hint = await getSelectedImageTargetHint([]);
    setSelectionHint(hint);
    setDiscoverySettled(true);
  }, []);

  useEffect(() => {
    const isTargetStep = pathMode === "auto" && flowStep === "autoElement";
    if (!isTargetStep) {
      setDiscoverySettled(false);
      setTargets([]);
      setSelectionHint({ kind: "none" });
      setScanError(null);
      setScanPending(false);
      setPageScanned(false);
      return;
    }
    void runAutoElementDiscovery();
  }, [pathMode, flowStep, runAutoElementDiscovery]);

  /** User-triggered full page scan (initial scan or refresh). */
  const rescan = useCallback(async () => {
    setScanPending(true);
    setScanError(null);
    try {
      const t = await scanImageTargetsOnPage();
      setTargets(t);
      setSelectionHint(await getSelectedImageTargetHint(t));
      setPageScanned(true);
    } catch (e) {
      setScanError(e instanceof Error ? e.message : "Could not scan the page");
      setTargets([]);
      setPageScanned(true);
    } finally {
      setScanPending(false);
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

/**
 * Page scan for the Configuration preset form only (isolated from the main target hook).
 */
export function usePresetFormTargets(active: boolean) {
  const [dismissedCanvasSelectionPrompt, setDismissedCanvasSelectionPrompt] = useState(false);
  const [targets, setTargets] = useState<ImagePageTarget[]>([]);
  const [scanPending, setScanPending] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [pageScanned, setPageScanned] = useState(false);
  const [selectionHint, setSelectionHint] = useState<SelectedImageTargetHint>({ kind: "none" });
  const [discoverySettled, setDiscoverySettled] = useState(false);

  const run = useCallback(async () => {
    setScanError(null);
    setDiscoverySettled(false);
    setTargets([]);
    setPageScanned(false);

    const hint = await getSelectedImageTargetHint([]);
    setSelectionHint(hint);
    setDiscoverySettled(true);
  }, []);

  useEffect(() => {
    if (!active) {
      setDismissedCanvasSelectionPrompt(false);
      setDiscoverySettled(false);
      setTargets([]);
      setSelectionHint({ kind: "none" });
      setScanError(null);
      setScanPending(false);
      setPageScanned(false);
      return;
    }
    void run();
  }, [active, run]);

  const rescan = useCallback(async () => {
    setScanPending(true);
    setScanError(null);
    try {
      const t = await scanImageTargetsOnPage();
      setTargets(t);
      setSelectionHint(await getSelectedImageTargetHint(t));
      setPageScanned(true);
    } catch (e) {
      setScanError(e instanceof Error ? e.message : "Could not scan the page");
      setTargets([]);
      setPageScanned(true);
    } finally {
      setScanPending(false);
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
    dismissedCanvasSelectionPrompt,
    setDismissedCanvasSelectionPrompt,
  };
}
