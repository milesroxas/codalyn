import { useLayoutEffect, useRef, useState } from "react";

import { prefersReducedMotion } from "@/features/image-editor/lib/prefers-reduced-motion";

/** Stagger enter so the browser paints the initial (hidden) frame before animating in. */
export function useImageEditorStepEnter(stepKey: string) {
  const [entered, setEntered] = useState(prefersReducedMotion());
  const prevStepKeyRef = useRef<string | undefined>(undefined);

  useLayoutEffect(() => {
    const stepChanged = prevStepKeyRef.current !== stepKey;
    prevStepKeyRef.current = stepKey;

    if (prefersReducedMotion()) {
      setEntered(true);
      return;
    }
    if (!stepChanged) {
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
      prevStepKeyRef.current = undefined;
    };
  }, [stepKey]);

  return entered;
}
