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
  /**
   * When the user has image-capable canvas selection, full-page scan is skipped
   * until this is true (“Choose on page”).
   */
  dismissedCanvasSelectionPrompt: boolean;
};

export function useImageEditorAutoTargets(options: UseImageEditorAutoTargetsOptions) {
  const { flowStep, pathMode, dismissedCanvasSelectionPrompt } = options;

  const [targets, setTargets] = useState<ImagePageTarget[]>([]);
  const [scanPending, setScanPending] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [selectionHint, setSelectionHint] = useState<SelectedImageTargetHint>({ kind: "none" });
  /** After selection probe (and any required full page scan) finishes. */
  const [discoverySettled, setDiscoverySettled] = useState(false);

  const runAutoElementDiscovery = useCallback(async () => {
    setScanError(null);
    setDiscoverySettled(false);
    setTargets([]);

    const hint = await getSelectedImageTargetHint([]);
    setSelectionHint(hint);

    const selectionAcceptsImage = hint.kind === "image" || hint.kind === "component";
    const needFullPageScan = dismissedCanvasSelectionPrompt || !selectionAcceptsImage;

    if (needFullPageScan) {
      setScanPending(true);
      try {
        const t = await scanImageTargetsOnPage();
        setTargets(t);
        setSelectionHint(await getSelectedImageTargetHint(t));
      } catch (e) {
        setScanError(e instanceof Error ? e.message : "Could not scan the page");
        setTargets([]);
      } finally {
        setScanPending(false);
      }
    }
    setDiscoverySettled(true);
  }, [dismissedCanvasSelectionPrompt]);

  useEffect(() => {
    const isTargetStep = pathMode === "auto" && flowStep === "autoElement";
    if (!isTargetStep) {
      setDiscoverySettled(false);
      setTargets([]);
      setSelectionHint({ kind: "none" });
      setScanError(null);
      setScanPending(false);
      return;
    }
    void runAutoElementDiscovery();
  }, [pathMode, flowStep, runAutoElementDiscovery]);

  /** User explicitly requested a full page rescan (refresh), or after changing canvas. */
  const rescan = useCallback(async () => {
    setScanPending(true);
    setScanError(null);
    try {
      const t = await scanImageTargetsOnPage();
      setTargets(t);
      setSelectionHint(await getSelectedImageTargetHint(t));
    } catch (e) {
      setScanError(e instanceof Error ? e.message : "Could not scan the page");
      setTargets([]);
    } finally {
      setScanPending(false);
    }
  }, []);

  return {
    targets,
    scanPending,
    scanError,
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
  const [selectionHint, setSelectionHint] = useState<SelectedImageTargetHint>({ kind: "none" });
  const [discoverySettled, setDiscoverySettled] = useState(false);

  const run = useCallback(async () => {
    setScanError(null);
    setDiscoverySettled(false);
    setTargets([]);

    const hint = await getSelectedImageTargetHint([]);
    setSelectionHint(hint);

    const selectionAcceptsImage = hint.kind === "image" || hint.kind === "component";
    const needFullPageScan = dismissedCanvasSelectionPrompt || !selectionAcceptsImage;

    if (needFullPageScan) {
      setScanPending(true);
      try {
        const t = await scanImageTargetsOnPage();
        setTargets(t);
        setSelectionHint(await getSelectedImageTargetHint(t));
      } catch (e) {
        setScanError(e instanceof Error ? e.message : "Could not scan the page");
        setTargets([]);
      } finally {
        setScanPending(false);
      }
    }
    setDiscoverySettled(true);
  }, [dismissedCanvasSelectionPrompt]);

  useEffect(() => {
    if (!active) {
      setDismissedCanvasSelectionPrompt(false);
      setDiscoverySettled(false);
      setTargets([]);
      setSelectionHint({ kind: "none" });
      setScanError(null);
      setScanPending(false);
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
    } catch (e) {
      setScanError(e instanceof Error ? e.message : "Could not scan the page");
      setTargets([]);
    } finally {
      setScanPending(false);
    }
  }, []);

  return {
    targets,
    scanPending,
    scanError,
    rescan,
    selectionHint,
    discoverySettled,
    dismissedCanvasSelectionPrompt,
    setDismissedCanvasSelectionPrompt,
  };
}
