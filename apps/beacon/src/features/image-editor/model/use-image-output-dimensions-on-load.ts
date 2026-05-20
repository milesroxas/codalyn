import type { Dispatch, SetStateAction } from "react";
import { useEffect } from "react";
import type { Area } from "react-easy-crop";

import { MAX_EDGE } from "@/features/image-editor/lib/apply-cropped-export";
import { loadImage } from "@/features/image-editor/lib/load-image";

type UseImageOutputDimensionsOnLoadOptions = {
  /**
   * When false, output width/height are not replaced from the image’s natural
   * size (e.g. Auto path already set export size from the canvas target).
   */
  applyNaturalImageDimensions?: boolean;
};

export function useImageOutputDimensionsOnLoad(
  imageSrc: string | null,
  setOutputWidth: Dispatch<SetStateAction<number>>,
  setOutputHeight: Dispatch<SetStateAction<number>>,
  setWidthStr: Dispatch<SetStateAction<string>>,
  setHeightStr: Dispatch<SetStateAction<string>>,
  setCrop: Dispatch<SetStateAction<{ x: number; y: number }>>,
  setZoom: Dispatch<SetStateAction<number>>,
  setCompletedCrop: Dispatch<SetStateAction<Area | null>>,
  setImageSrc: Dispatch<SetStateAction<string | null>>,
  options?: UseImageOutputDimensionsOnLoadOptions
) {
  const applyNatural = options?.applyNaturalImageDimensions !== false;
  useEffect(() => {
    if (!imageSrc) {
      return;
    }
    // Reset crop before async load so export preview/encode never use the previous image's crop.
    setCompletedCrop(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    void loadImage(imageSrc)
      .then((img) => {
        if (applyNatural) {
          const w = Math.min(MAX_EDGE, img.naturalWidth);
          const h = Math.min(MAX_EDGE, img.naturalHeight);
          setOutputWidth(w);
          setOutputHeight(h);
          setWidthStr(String(w));
          setHeightStr(String(h));
        }
      })
      .catch(() => {
        if (imageSrc.startsWith("blob:")) {
          setImageSrc(null);
        }
      });
  }, [
    applyNatural,
    imageSrc,
    setOutputWidth,
    setOutputHeight,
    setWidthStr,
    setHeightStr,
    setCrop,
    setZoom,
    setCompletedCrop,
    setImageSrc,
  ]);
}
