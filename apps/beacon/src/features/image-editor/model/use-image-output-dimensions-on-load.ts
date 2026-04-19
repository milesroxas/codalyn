import type { Dispatch, SetStateAction } from "react";
import { useEffect } from "react";
import type { Area } from "react-easy-crop";

import { MAX_EDGE } from "@/features/image-editor/lib/apply-cropped-export";
import { loadImage } from "@/features/image-editor/lib/load-image";

export function useImageOutputDimensionsOnLoad(
  imageSrc: string | null,
  setOutputWidth: Dispatch<SetStateAction<number>>,
  setOutputHeight: Dispatch<SetStateAction<number>>,
  setWidthStr: Dispatch<SetStateAction<string>>,
  setHeightStr: Dispatch<SetStateAction<string>>,
  setCrop: Dispatch<SetStateAction<{ x: number; y: number }>>,
  setZoom: Dispatch<SetStateAction<number>>,
  setCompletedCrop: Dispatch<SetStateAction<Area | null>>,
  setImageSrc: Dispatch<SetStateAction<string | null>>
) {
  useEffect(() => {
    if (!imageSrc) {
      return;
    }
    void loadImage(imageSrc)
      .then((img) => {
        const w = Math.min(MAX_EDGE, img.naturalWidth);
        const h = Math.min(MAX_EDGE, img.naturalHeight);
        setOutputWidth(w);
        setOutputHeight(h);
        setWidthStr(String(w));
        setHeightStr(String(h));
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCompletedCrop(null);
      })
      .catch(() => {
        if (imageSrc.startsWith("blob:")) {
          setImageSrc(null);
        }
      });
  }, [
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
