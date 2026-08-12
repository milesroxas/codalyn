import { useCallback, useEffect, useRef, useState } from "react";

import {
  BEACON_QUALITY_POPOUT_SOURCE,
  clampExportQuality,
  isQualityParentToPopoutMessage,
  type QualityPopoutToParentMessage,
} from "@/features/image-editor/lib/quality-popout-protocol";

const PREVIEW_DEBOUNCE_MS = 400;

/**
 * Accept messages only from the exact opener window (Marketplace review hardening): a same-origin
 * document other than the opener must not be able to drive this popout.
 */
export function isTrustedQualityParentEvent(event: MessageEvent, opener: Window | null, targetOrigin: string): boolean {
  return event.origin === targetOrigin && opener !== null && event.source === opener;
}

function revokeBlobUrl(url: string | null): void {
  if (!url?.startsWith("blob:")) {
    return;
  }
  try {
    URL.revokeObjectURL(url);
  } catch {
    // Already revoked / detached document — nothing to release.
  }
}

type QualityPopoutImages = {
  originalSrc: string | null;
  compressedSrc: string | null;
  aspectRatio: number;
};

/**
 * Popout side of the compression-compare protocol (quality-compare.html): announces `ready` to the
 * opener, validates and applies `init` / `compressed-updated` / `compressed-error` messages, and
 * reports quality changes back. Owns the object-URL lifecycle for the received Blobs — URLs are
 * minted in this document's URL store and revoked on replacement, unmount, and pagehide.
 */
export function useQualityPopoutBridge(): {
  quality: number;
  originalSrc: string | null;
  compressedSrc: string | null;
  aspectRatio: number;
  encodeError: boolean;
  onQualityInput: (quality: number) => void;
  onQualityCommit: (quality: number) => void;
  onSaveClose: () => void;
} {
  const [images, setImages] = useState<QualityPopoutImages>({
    originalSrc: null,
    compressedSrc: null,
    aspectRatio: 1,
  });
  const [quality, setQuality] = useState(0.8);
  const [encodeError, setEncodeError] = useState(false);

  const initializedRef = useRef(false);
  const qualityRef = useRef(quality);
  const urlsRef = useRef<{ original: string | null; compressed: string | null }>({
    original: null,
    compressed: null,
  });
  const blobsRevokedRef = useRef(false);
  const debounceTimerRef = useRef<number | null>(null);

  const postToOpener = useCallback((message: QualityPopoutToParentMessage) => {
    const opener: Window | null = window.opener;
    opener?.postMessage(message, window.location.origin);
  }, []);

  const applyQuality = useCallback((raw: number) => {
    const q = clampExportQuality(raw);
    qualityRef.current = q;
    setQuality(q);
    setEncodeError(false);
    return q;
  }, []);

  const onQualityInput = useCallback(
    (raw: number) => {
      const q = applyQuality(raw);
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = window.setTimeout(() => {
        debounceTimerRef.current = null;
        postToOpener({ source: BEACON_QUALITY_POPOUT_SOURCE, type: "preview-quality-changed", quality: q });
      }, PREVIEW_DEBOUNCE_MS);
    },
    [applyQuality, postToOpener]
  );

  const onQualityCommit = useCallback(
    (raw: number) => {
      const q = applyQuality(raw);
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      postToOpener({ source: BEACON_QUALITY_POPOUT_SOURCE, type: "preview-quality-changed", quality: q });
    },
    [applyQuality, postToOpener]
  );

  const onSaveClose = useCallback(() => {
    postToOpener({ source: BEACON_QUALITY_POPOUT_SOURCE, type: "save-and-close", quality: qualityRef.current });
  }, [postToOpener]);

  useEffect(() => {
    const targetOrigin = window.location.origin;

    const revokeAllBlobs = () => {
      if (blobsRevokedRef.current) {
        return;
      }
      blobsRevokedRef.current = true;
      revokeBlobUrl(urlsRef.current.compressed);
      if (urlsRef.current.original !== urlsRef.current.compressed) {
        revokeBlobUrl(urlsRef.current.original);
      }
    };

    const applyInit = (d: {
      originalBlob: Blob;
      compressedBlob: Blob;
      aspectRatio: number;
      initialQuality: number;
    }) => {
      if (initializedRef.current) {
        return;
      }
      initializedRef.current = true;
      urlsRef.current.original = URL.createObjectURL(d.originalBlob);
      urlsRef.current.compressed = URL.createObjectURL(d.compressedBlob);
      setImages({
        originalSrc: urlsRef.current.original,
        compressedSrc: urlsRef.current.compressed,
        aspectRatio: Number.isFinite(d.aspectRatio) && d.aspectRatio > 0 ? d.aspectRatio : 1,
      });
      qualityRef.current = clampExportQuality(d.initialQuality);
      setQuality(qualityRef.current);
    };

    const applyCompressedUpdate = (compressedBlob: Blob) => {
      const next = URL.createObjectURL(compressedBlob);
      const prev = urlsRef.current.compressed;
      urlsRef.current.compressed = next;
      if (prev !== next) {
        revokeBlobUrl(prev);
      }
      setImages((s) => ({ ...s, compressedSrc: next }));
      setEncodeError(false);
    };

    const onMessage = (event: MessageEvent) => {
      if (!isTrustedQualityParentEvent(event, window.opener, targetOrigin)) {
        return;
      }
      if (!isQualityParentToPopoutMessage(event.data)) {
        return;
      }
      const d = event.data;
      if (d.type === "init") {
        applyInit(d);
      } else if (d.type === "compressed-updated") {
        applyCompressedUpdate(d.compressedBlob);
      } else {
        setEncodeError(true);
      }
    };

    window.addEventListener("message", onMessage);
    window.addEventListener("pagehide", revokeAllBlobs);
    window.addEventListener("beforeunload", revokeAllBlobs);
    postToOpener({ source: BEACON_QUALITY_POPOUT_SOURCE, type: "ready" });

    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("pagehide", revokeAllBlobs);
      window.removeEventListener("beforeunload", revokeAllBlobs);
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      revokeAllBlobs();
    };
  }, [postToOpener]);

  return {
    quality,
    originalSrc: images.originalSrc,
    compressedSrc: images.compressedSrc,
    aspectRatio: images.aspectRatio,
    encodeError,
    onQualityInput,
    onQualityCommit,
    onSaveClose,
  };
}
