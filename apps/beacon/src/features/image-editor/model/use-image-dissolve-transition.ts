import type { Dispatch, SetStateAction, TransitionEvent } from "react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { assetBaseNameFromFileName } from "@/features/image-editor/lib/sanitize-asset-base-name";

export type ImageDissolveState = { phase: "idle" } | { phase: "dissolving"; incomingUrl: string; incomingFile: File };

export function useImageDissolveTransition(options: {
  setImageSrc: Dispatch<SetStateAction<string | null>>;
  setOriginalBytes: Dispatch<SetStateAction<number | null>>;
  setFileBaseName: (name: string) => void;
}) {
  const { setImageSrc, setOriginalBytes, setFileBaseName } = options;

  const [dissolve, setDissolve] = useState<ImageDissolveState>({ phase: "idle" });
  const [beginOutgoingFade, setBeginOutgoingFade] = useState(false);
  const [showIncomingPreview, setShowIncomingPreview] = useState(false);
  const [incomingEnter, setIncomingEnter] = useState(false);
  const dissolveRef = useRef(dissolve);
  dissolveRef.current = dissolve;
  const dissolveSettledRef = useRef(false);

  const queueFile = useCallback((file: File | undefined) => {
    if (!file?.type.startsWith("image/")) {
      return;
    }
    if (dissolveRef.current.phase === "dissolving") {
      return;
    }
    const incomingUrl = URL.createObjectURL(file);
    setDissolve({ phase: "dissolving", incomingUrl, incomingFile: file });
    dissolveSettledRef.current = false;
  }, []);

  const finishDissolve = useCallback(() => {
    const d = dissolveRef.current;
    if (d.phase !== "dissolving") {
      return;
    }
    if (dissolveSettledRef.current) {
      return;
    }
    dissolveSettledRef.current = true;
    const { incomingUrl, incomingFile } = d;
    setOriginalBytes(incomingFile.size);
    setFileBaseName(assetBaseNameFromFileName(incomingFile.name));
    setImageSrc((prev) => {
      if (prev?.startsWith("blob:")) {
        URL.revokeObjectURL(prev);
      }
      return incomingUrl;
    });
    setDissolve({ phase: "idle" });
    setBeginOutgoingFade(false);
    setShowIncomingPreview(false);
    setIncomingEnter(false);
  }, [setImageSrc, setOriginalBytes, setFileBaseName]);

  const handleOutgoingFadeComplete = useCallback(
    (e: TransitionEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget || e.propertyName !== "opacity" || !beginOutgoingFade) {
        return;
      }
      setShowIncomingPreview(true);
    },
    [beginOutgoingFade]
  );

  useLayoutEffect(() => {
    if (dissolve.phase !== "dissolving") {
      return;
    }
    setBeginOutgoingFade(false);
    setShowIncomingPreview(false);
    setIncomingEnter(false);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setBeginOutgoingFade(true);
      });
    });
    return () => {
      cancelAnimationFrame(id);
    };
  }, [dissolve]);

  useEffect(() => {
    return () => {
      const d = dissolveRef.current;
      if (d.phase === "dissolving") {
        URL.revokeObjectURL(d.incomingUrl);
      }
    };
  }, []);

  useLayoutEffect(() => {
    if (!showIncomingPreview) {
      return;
    }
    setIncomingEnter(false);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIncomingEnter(true);
      });
    });
    return () => {
      cancelAnimationFrame(id);
    };
  }, [showIncomingPreview]);

  return {
    dissolve,
    dissolving: dissolve.phase === "dissolving",
    queueFile,
    finishDissolve,
    handleOutgoingFadeComplete,
    beginOutgoingFade,
    showIncomingPreview,
    incomingEnter,
  };
}
