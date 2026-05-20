import { useLayoutEffect, useState } from "react";

import { prefersReducedMotion } from "@/features/image-editor/lib/prefers-reduced-motion";

/** Stagger enter so the browser paints the initial (hidden) frame before animating in. */
export function useImageEditorStepEnter(stepKey: string) {
  const [entered, setEntered] = useState(prefersReducedMotion());

  useLayoutEffect(() => {
    if (prefersReducedMotion()) {
      setEntered(true);
      return;
    }
    setEntered(false);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setEntered(true);
      });
    });
    return () => {
      cancelAnimationFrame(id);
    };
  }, [stepKey]);

  return entered;
}
