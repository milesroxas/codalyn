import { useEffect, useState } from "react";

import { readCurrentPageIdOrNull } from "@/shared/lib/webflow-page-canvas-context";

export type DesignerCurrentPageIdState = {
  pageId: string | null;
  /** True after the first current-page read has settled. */
  ready: boolean;
};

/**
 * Tracks the active Designer **page** id (null on component-definition canvases).
 * Single subscription point for `currentpage` + {@link readCurrentPageIdOrNull}.
 */
export function useDesignerCurrentPageId(): DesignerCurrentPageIdState {
  const [state, setState] = useState<DesignerCurrentPageIdState>({ pageId: null, ready: false });

  useEffect(() => {
    let cancelled = false;

    const applyPageId = (pageId: string | null) => {
      if (!cancelled) {
        setState({ pageId, ready: true });
      }
    };

    void readCurrentPageIdOrNull().then(applyPageId);

    if (typeof webflow.subscribe !== "function") {
      return () => {
        cancelled = true;
      };
    }

    const unsub = webflow.subscribe("currentpage", () => {
      void readCurrentPageIdOrNull().then(applyPageId);
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  return state;
}
