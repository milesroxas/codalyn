import { BEACON_IMAGE_ERROR_CODES, type BeaconImageErrorCode } from "@codalyn/webflow-kit";
import type { Dispatch, SetStateAction, TransitionEvent } from "react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { assetBaseNameFromFileName } from "@/features/image-editor/lib/sanitize-asset-base-name";
import { createSourceImageFileValidator } from "@/features/image-editor/lib/validate-source-image-file";

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
  const sourceImageFileValidatorRef = useRef(createSourceImageFileValidator());

  const sourceImageErrorMessage = useCallback((errorCode: BeaconImageErrorCode): string => {
    switch (errorCode) {
      case BEACON_IMAGE_ERROR_CODES.SOURCE_IMAGE_SVG_BLOCKED:
        return "SVG uploads are not supported. Use JPEG, PNG, WebP, GIF, or AVIF.";
      case BEACON_IMAGE_ERROR_CODES.SOURCE_IMAGE_TOO_LARGE:
        return "Source image is too large. Maximum source size is 20 MiB.";
      case BEACON_IMAGE_ERROR_CODES.SOURCE_IMAGE_TOO_MANY_PIXELS:
        return "Source image has too many pixels. Maximum decoded area is 40 megapixels.";
      case BEACON_IMAGE_ERROR_CODES.SOURCE_IMAGE_DECODE_FAILED:
        return "Could not decode this image. Choose a different file.";
      default:
        return "File type is not allowed. Use JPEG, PNG, WebP, GIF, or AVIF.";
    }
  }, []);

  const notifySourceImageValidationFailure = useCallback(
    async (errorCode: BeaconImageErrorCode) => {
      await webflow.notify({ type: "Error", message: sourceImageErrorMessage(errorCode) });
    },
    [sourceImageErrorMessage]
  );

  const queueFile = useCallback(
    (file: File | undefined) => {
      if (!file) {
        return;
      }
      if (dissolveRef.current.phase === "dissolving") {
        return;
      }

      void (async () => {
        const result = await sourceImageFileValidatorRef.current.validate({ file });
        if (!result.ok) {
          await notifySourceImageValidationFailure(result.errorCode);
          return;
        }

        const incomingUrl = URL.createObjectURL(file);
        setDissolve({ phase: "dissolving", incomingUrl, incomingFile: file });
        dissolveSettledRef.current = false;
      })();
    },
    [notifySourceImageValidationFailure]
  );

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
