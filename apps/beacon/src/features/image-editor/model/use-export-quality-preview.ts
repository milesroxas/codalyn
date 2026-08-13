import type { ImageExportFormat } from "@codalyn/webflow-kit";
import { type MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Area } from "react-easy-crop";

import { clampEdge } from "@/features/image-editor/lib/apply-cropped-export";
import { getExportGeometryKey } from "@/features/image-editor/lib/export-geometry-key";
import { encodeExportPreviewPair } from "@/features/image-editor/lib/export-preview-encode";
import { getTowerUsageLimitFromError, type TowerUsageLimitDetails } from "@/shared/lib/tower-usage-limit-error";

const PREVIEW_DEBOUNCE_MS = 400;

async function runDebouncedPreviewJob(
  gen: number,
  previewGenRef: MutableRefObject<number>,
  previewBlobsRef: MutableRefObject<{ png: Blob | null; compressed: Blob | null }>,
  assignUrls: (original: string | null, compressed: string | null) => void,
  setPreviewPending: (pending: boolean) => void,
  encodeArgs: {
    imageSrc: string;
    completedCrop: Area;
    w: number;
    h: number;
    quality: number;
    exportFormat: ImageExportFormat;
    avifTowerConsentGranted?: boolean;
  },
  onTowerUsageLimit?: (details: TowerUsageLimitDetails) => void
): Promise<void> {
  try {
    const { originalUrl, compressedUrl, pngBlob, compressedBlob } = await encodeExportPreviewPair(encodeArgs);
    if (previewGenRef.current !== gen) {
      URL.revokeObjectURL(originalUrl);
      URL.revokeObjectURL(compressedUrl);
      return;
    }
    previewBlobsRef.current = { png: pngBlob, compressed: compressedBlob };
    assignUrls(originalUrl, compressedUrl);
  } catch (err) {
    const usageLimit = getTowerUsageLimitFromError(err);
    if (usageLimit != null) {
      onTowerUsageLimit?.(usageLimit);
    }
    if (previewGenRef.current !== gen) {
      return;
    }
    previewBlobsRef.current = { png: null, compressed: null };
    assignUrls(null, null);
  } finally {
    if (previewGenRef.current === gen) {
      setPreviewPending(false);
    }
  }
}

export function useExportQualityPreview(options: {
  imageSrc: string | null;
  completedCrop: Area | null;
  effectiveOutputW: number;
  effectiveOutputH: number;
  quality: number;
  exportFormat: ImageExportFormat;
  avifTowerConsentGranted?: boolean;
  /** When false, skips encode (e.g. export W×H not chosen yet). */
  enabled?: boolean;
  onTowerUsageLimit?: (details: TowerUsageLimitDetails) => void;
}) {
  const {
    imageSrc,
    completedCrop,
    effectiveOutputW,
    effectiveOutputH,
    quality,
    exportFormat,
    avifTowerConsentGranted,
    enabled = true,
    onTowerUsageLimit,
  } = options;

  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [compressedUrl, setCompressedUrl] = useState<string | null>(null);
  const [previewPending, setPreviewPending] = useState(false);

  const previewGenRef = useRef(0);
  const previewBlobsRef = useRef<{ png: Blob | null; compressed: Blob | null }>({
    png: null,
    compressed: null,
  });
  const urlsRef = useRef<{ original: string | null; compressed: string | null }>({
    original: null,
    compressed: null,
  });

  const assignUrls = useCallback((original: string | null, compressed: string | null) => {
    const prev = urlsRef.current;
    if (prev.original && prev.original !== original) {
      URL.revokeObjectURL(prev.original);
    }
    if (prev.compressed && prev.compressed !== compressed) {
      URL.revokeObjectURL(prev.compressed);
    }
    urlsRef.current = { original, compressed };
    setOriginalUrl(original);
    setCompressedUrl(compressed);
  }, []);

  const geometryKey = useMemo(
    () => getExportGeometryKey(imageSrc, completedCrop, effectiveOutputW, effectiveOutputH),
    [imageSrc, completedCrop, effectiveOutputW, effectiveOutputH]
  );

  const getPopoutPreviewBlobs = useCallback((): { png: Blob; compressed: Blob } | null => {
    const { png, compressed } = previewBlobsRef.current;
    if (!png || !compressed) {
      return null;
    }
    return { png, compressed };
  }, []);

  useEffect(() => {
    return () => {
      const { original, compressed } = urlsRef.current;
      if (original) {
        URL.revokeObjectURL(original);
      }
      if (compressed) {
        URL.revokeObjectURL(compressed);
      }
      urlsRef.current = { original: null, compressed: null };
      previewBlobsRef.current = { png: null, compressed: null };
    };
  }, []);

  useEffect(() => {
    void geometryKey;
    previewGenRef.current += 1;
    const prev = urlsRef.current;
    if (prev.original) {
      URL.revokeObjectURL(prev.original);
    }
    if (prev.compressed) {
      URL.revokeObjectURL(prev.compressed);
    }
    urlsRef.current = { original: null, compressed: null };
    previewBlobsRef.current = { png: null, compressed: null };
    setOriginalUrl(null);
    setCompressedUrl(null);
    setPreviewPending(false);
  }, [geometryKey]);

  useEffect(() => {
    if (!enabled || !imageSrc || !completedCrop) {
      previewGenRef.current += 1;
      const prev = urlsRef.current;
      if (prev.original) {
        URL.revokeObjectURL(prev.original);
      }
      if (prev.compressed) {
        URL.revokeObjectURL(prev.compressed);
      }
      urlsRef.current = { original: null, compressed: null };
      previewBlobsRef.current = { png: null, compressed: null };
      assignUrls(null, null);
      setPreviewPending(false);
      return;
    }
    const jobGen = ++previewGenRef.current;
    setPreviewPending(true);
    const w = clampEdge(effectiveOutputW);
    const h = clampEdge(effectiveOutputH);
    const t = window.setTimeout(() => {
      void runDebouncedPreviewJob(
        jobGen,
        previewGenRef,
        previewBlobsRef,
        assignUrls,
        setPreviewPending,
        {
          imageSrc,
          completedCrop,
          w,
          h,
          quality,
          exportFormat,
          avifTowerConsentGranted,
        },
        onTowerUsageLimit
      );
    }, PREVIEW_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(t);
    };
  }, [
    enabled,
    imageSrc,
    completedCrop,
    effectiveOutputW,
    effectiveOutputH,
    quality,
    exportFormat,
    avifTowerConsentGranted,
    assignUrls,
    onTowerUsageLimit,
  ]);

  return {
    originalPreviewUrl: originalUrl,
    compressedPreviewUrl: compressedUrl,
    previewPending,
    getPopoutPreviewBlobs,
  };
}
