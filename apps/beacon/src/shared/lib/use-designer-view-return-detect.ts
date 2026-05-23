import { useEffect, useRef, useState } from "react";

type DesignerViewBaseline = {
  pageId: string;
  appMode: unknown;
};

/**
 * True after the user leaves and returns to the Designer (page or app mode change).
 * Matches the CMS Slots “Refresh CMS in Webflow” dialog return detection.
 */
export function useDesignerViewReturnDetect(enabled: boolean): boolean {
  const [returned, setReturned] = useState(false);
  const baselineRef = useRef<DesignerViewBaseline | null>(null);

  useEffect(() => {
    if (!enabled) {
      baselineRef.current = null;
      setReturned(false);
      return undefined;
    }

    let cancelled = false;

    void (async () => {
      try {
        const page = await webflow.getCurrentPage();
        const appMode = typeof webflow.getCurrentMode === "function" ? await webflow.getCurrentMode() : null;
        if (!cancelled) {
          baselineRef.current = { pageId: String(page.id), appMode };
        }
      } catch {
        if (!cancelled) {
          baselineRef.current = null;
        }
      }
    })();

    if (typeof webflow.subscribe !== "function") {
      return () => {
        cancelled = true;
      };
    }

    const checkReturn = async () => {
      const baseline = baselineRef.current;
      if (baseline == null) {
        return;
      }
      try {
        const page = await webflow.getCurrentPage();
        const appMode = typeof webflow.getCurrentMode === "function" ? await webflow.getCurrentMode() : null;
        if (String(page.id) !== baseline.pageId || appMode !== baseline.appMode) {
          setReturned(true);
        }
      } catch {
        /* ignore */
      }
    };

    const unsubPage = webflow.subscribe("currentpage", () => {
      void checkReturn();
    });
    const unsubMode = webflow.subscribe("currentappmode", () => {
      void checkReturn();
    });

    return () => {
      cancelled = true;
      unsubPage();
      unsubMode();
    };
  }, [enabled]);

  return returned;
}
