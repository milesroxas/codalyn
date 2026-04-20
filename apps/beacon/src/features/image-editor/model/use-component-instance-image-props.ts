import { useCallback, useEffect, useRef, useState } from "react";

import type { ElementCmsBindingResolution } from "@/features/image-editor/lib/cms-primary-upload-context";
import type { ComponentImagePropOption } from "@/features/image-editor/lib/component-image-prop";
import {
  refreshComponentInstanceSelection,
  refreshNonComponentInstanceSelection,
} from "@/features/image-editor/model/refresh-component-instance-image-props";

export function useComponentInstanceImageProps() {
  const [componentImageProps, setComponentImageProps] = useState<ComponentImagePropOption[]>([]);
  const [selectedComponentImagePropId, setSelectedComponentImagePropId] = useState<string | null>(null);
  const [selectedElementType, setSelectedElementType] = useState<string | null>(null);
  const [currentCmsItemId, setCurrentCmsItemId] = useState<string | null>(null);
  const [componentImagePropsResolving, setComponentImagePropsResolving] = useState(false);
  const [elementCmsBinding, setElementCmsBinding] = useState<ElementCmsBindingResolution>("none");
  const [elementCmsBindingLoading, setElementCmsBindingLoading] = useState(false);
  const componentPropsResolveGenRef = useRef(0);

  const refreshComponentImageProps = useCallback(async (el: AnyElement | null) => {
    const gen = ++componentPropsResolveGenRef.current;
    setSelectedElementType(el?.type ?? null);

    if (el?.type !== "ComponentInstance") {
      await refreshNonComponentInstanceSelection(el, gen, componentPropsResolveGenRef, {
        setComponentImagePropsResolving,
        setComponentImageProps,
        setSelectedComponentImagePropId,
        setElementCmsBinding,
        setElementCmsBindingLoading,
      });
      return;
    }

    setElementCmsBinding("none");
    setElementCmsBindingLoading(false);

    await refreshComponentInstanceSelection(el as ComponentElement, gen, componentPropsResolveGenRef, {
      setComponentImagePropsResolving,
      setComponentImageProps,
      setSelectedComponentImagePropId,
    });
  }, []);

  useEffect(() => {
    void webflow.getSelectedElement().then((e) => void refreshComponentImageProps(e));
    const unsub = webflow.subscribe("selectedelement", (e) => {
      void refreshComponentImageProps(e);
    });
    return unsub;
  }, [refreshComponentImageProps]);

  useEffect(() => {
    const unsub = webflow.subscribe("currentcmsitem", (cmsItemId) => {
      setCurrentCmsItemId(cmsItemId ?? null);
    });
    return unsub;
  }, []);

  return {
    componentImageProps,
    selectedComponentImagePropId,
    setSelectedComponentImagePropId,
    selectedElementType,
    currentCmsItemId,
    componentImagePropsResolving,
    elementCmsBinding,
    elementCmsBindingLoading,
  };
}
