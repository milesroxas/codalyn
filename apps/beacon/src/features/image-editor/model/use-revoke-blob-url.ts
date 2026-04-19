import { useEffect } from "react";

/** Revokes the previous blob URL when `imageSrc` changes or the component unmounts. */
export function useRevokeBlobUrlOnChange(imageSrc: string | null) {
  useEffect(
    () => () => {
      if (imageSrc?.startsWith("blob:")) {
        URL.revokeObjectURL(imageSrc);
      }
    },
    [imageSrc]
  );
}
